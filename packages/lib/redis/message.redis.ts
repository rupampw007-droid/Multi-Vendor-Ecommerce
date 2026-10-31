import redis from './index'

export const incrementUnseenCount = async (
    recieverType: "user" | "seller",
    conversationId : string
) => {
    const key = `unseen:${recieverType}_${conversationId}`;
    await redis.incr(key);
}

export const getUnseenCount = async (
    recieverType: "user" | "seller",
    conversationId: string
): Promise<number> => {
    const key = `unseen:${recieverType}_${conversationId}`;
    const count = await redis.get(key)
    return parseInt(count || "0")
}

export const clearUnseenCount = async (
    recieverType: "user" | "seller",
    conversationId: string
) => {
    const key = `unseen:${recieverType}_${conversationId}`
    await redis.del(key)
}