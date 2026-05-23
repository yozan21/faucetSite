import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/AppError.js";

export const requireVerified = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!res.locals.user?.isVerified) {
    throw new ForbiddenError("Please verify your email before continuing");
  }
  next();
};
