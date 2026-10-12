import { Kafka } from 'kafkajs'

export const kafka = new Kafka({
  clientId: 'kafka-service',
  brokers: ["pkc-oxqxx9.us-east-1.aws.confluent.cloud:9092"],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY!,
    password: process.env.KAFKA_API_SECRET!
  }
})