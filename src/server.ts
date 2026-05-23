import { env } from "./config/env.js";
import redis, { connectRedis } from "./config/redis.js";
import logger from "./config/logger.js";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createApp } from "./app.js";

const start = async () => {
  await connectRedis();
  // global rate limiter
  const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    store: new RedisStore({
      sendCommand: (...args: string[]) => (redis as any).sendCommand(args),
    }),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const app = createApp(rateLimiter);

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
};

start();
