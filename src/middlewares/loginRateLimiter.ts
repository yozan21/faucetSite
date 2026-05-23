import type { Request, Response, NextFunction } from "express";
import { checkIpLimit } from "../utils/loginProtection.js";

export const loginRateLimiter = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  await checkIpLimit(req.ip ?? "unknown");
  next();
};
