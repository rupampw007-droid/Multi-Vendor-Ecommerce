'use server'

import { kafka } from '@repo/utils/kafka'

const producer = kafka.producer();

export async function sendKafkaEvent(eventData : {
    userId? : string;
    productId? : string
    shopId?: string
    action: string
    device?:  string
    country?: string
    city? : string
}) {
    try {
        console.log(!!process.env.KAFKA_API_KEY, !!process.env.KAFKA_API_SECRET)
        await producer.connect();
        await producer.send({
            topic: "user-events",
            messages: [{
                value: JSON.stringify(eventData)
            }]
        })
    } catch (error) {
        console.log(error)
    } finally {
        await producer.disconnect()
    }
}