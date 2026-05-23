import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { ZodError } from "zod";
import logger from "../config/logger.js";
import { env } from "../config/env.js";
import { clearAuthCookies } from "../utils/cookieUtils.js";

const formatDevError = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    stack: err.stack,
    ...(err.errors && { errors: err.errors }),
    ...(err.captchaRequired && { captchaRequired: err.captchaRequired }),
  });
};

const formatProdError = (err: AppError, res: Response) => {
  // only expose operational errors to client in production
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      ...(err.errors && { errors: err.errors }),
      ...(err.captchaRequired && { captchaRequired: err.captchaRequired }),
    });
  } else {
    // programming/unknown error — don't leak details
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      statusCode: 500,
    });
  }
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // handle zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      statusCode: 400,
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // handle prisma errors
  if ((err as any)?.constructor?.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    if (prismaErr.code === "P2002") {
      res.status(409).json({
        success: false,
        message: `${prismaErr.meta?.target} already exists`,
        statusCode: 409,
      });
      return;
    }
    if (prismaErr.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found",
        statusCode: 404,
      });
      return;
    }
  }

  // normalize to AppError
  const appErr: AppError =
    err instanceof AppError
      ? err
      : new AppError(
          err instanceof Error ? err.message : "Internal server error",
          500,
          false,
        );
  if (appErr.statusCode === 403) {
    clearAuthCookies(res);
  }

  logger.error({
    message: appErr.message,
    statusCode: appErr.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (env.NODE_ENV === "development") {
    formatDevError(appErr, res);
  } else {
    formatProdError(appErr, res);
  }
};
