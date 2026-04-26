import Redis from "ioredis"
console.log(process.env.REDIS_DATABASE_URI, " LLLLL")
const redis = new Redis(process.env.REDIS_DATABASE_URI || "redis://localhost:6379");

export default redis