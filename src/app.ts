import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes.js";
import userRouter from "./modules/user/user.routes.js";

export const createApp = (rateLimiter: RequestHandler) => {
  const app = express();
  const Logger = pinoHttp({ logger });

  app.use(cookieParser());
  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? "https://yourdomain.com" : true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(Logger);

  app.use(rateLimiter);

  // routes
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/user", userRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  app.use(errorHandler);

  return app;
};
