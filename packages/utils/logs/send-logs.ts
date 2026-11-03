import { timeStamp } from "console";
import { kafka } from "../kafka";

const producer = kafka.producer();

export async function sendLog({
    type ="info",
    message,
    source = "unknown-service"
} : {
    type? : "info" | "error" | "warning" | "success" | "debug";
    message: string;
    source? : string
})  {
    const logPayload = {
        type,
        message,
        timeStamp: new Date().toISOString(),
        source
    };

    await producer.connect();
    await producer.send({
        topic: "logs",
        messages: [{value: JSON.stringify(logPayload)}]
    })
    await producer.disconnect()
}