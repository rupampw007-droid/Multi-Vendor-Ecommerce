'use server'

import { kafka } from '@repo/utils/kafka'

const producer = kafka.producer();

export async function sendKafkaEvent(eventData : {
    userId? : string | null;
    productId? : string
    shopId?: string
    action: string
    device?:  string
    country?: string
    city? : string
}): Promise<boolean> {
    try {
        await producer.connect();
        await producer.send({
            topic: "user-events",
            messages: [{
                value: JSON.stringify(eventData)
            }]
        })
        return true
    } catch (error) {
        console.error('Failed to send analytics event to Kafka:', error)
        return false
    } finally {
        try {
            await producer.disconnect()
        } catch (error) {
            console.error('Failed to disconnect the Kafka producer:', error)
        }
    }
}