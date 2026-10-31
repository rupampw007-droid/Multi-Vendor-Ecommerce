import { kafka } from "@repo/utils/kafka";
import prisma from "@repo/lib/prisma/prisma";
import { Consumer, EachMessagePayload } from "kafkajs";
import { incrementUnseenCount } from "@repo/lib/redis/message.redis";


interface BufferedMessage {
    conversationId: string,
    senderId: string,
    senderType: string,
    content: string,
    createdAt: string
}

const TOPIC = "chat.new_message"
const GROUP_ID = "chat-message-db-writer"
const BATCH_INTERVAL_MS = 3000

const buffer: BufferedMessage[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// Initialise Kafka consumer 
export async function startConsumer() {
    const consumer: Consumer = kafka.consumer({ groupId: GROUP_ID })
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false })
    console.log(`Kafka consumer connected and subscribed to "${TOPIC}".`)

    // Start consuming 
    await consumer.run({
        eachMessage: async ({ message } : EachMessagePayload) => {
            if(!message.value) return;

            try {
                const parsed: BufferedMessage = JSON.parse(message.value.toString());
                buffer.push(parsed);

                // If this is the first message in an empty array then start the timer
                if(buffer.length === 1 && !flushTimer) {
                    flushTimer = setTimeout(flushBufferToDb, BATCH_INTERVAL_MS)
                }
            } catch (error) {
                console.log("Failed to parse kafka message: ", error)
            }
        }
    })
}

// Flush the buffer to the database and reset the timer
async function flushBufferToDb() {
    const toInsert = buffer.splice(0, buffer.length)
    if(flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null
    }

    if(toInsert.length === 0) return;

    try {
        const prismaPayload = toInsert.map((msg) => ({
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            createdAt: new Date(msg.createdAt)
        }))

        await prisma.message.createMany({
            data: prismaPayload
        })

        // Redis unseen counter (only for B insert successful)
        for(const msg of prismaPayload) {
            const recieveType = msg.senderType === "user" ? "seller" : "user"
            await incrementUnseenCount(recieveType, msg.conversationId)
        }
        console.log(`Flushed ${prismaPayload.length} messages to DB and Redis.`)
    } catch (error) {
        console.log("Error inserting messages to DB: ", error);
        buffer.unshift(...toInsert)
        if(!flushTimer) {
            flushTimer = setTimeout(flushBufferToDb, BATCH_INTERVAL_MS)
        }
    }
}
