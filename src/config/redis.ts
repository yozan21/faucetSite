import { createClient } from "redis";
import { env } from "./env.js";

const redis = createClient({ url: env.REDIS_URL })
  .on("error", (err) => console.error("❌ Redis error:", err))
  .on("connect", () => console.log("✅ Redis connected"));

export const connectRedis = async () => {
  await redis.connect();
};

export default redis;
