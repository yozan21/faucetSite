import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const controlIpWhitelist = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (env.NODE_ENV === "development") return next(); // skip in dev

  const allowedIps = env.CONTROL_WHITELISTED_IPS.split(",").map((ip) =>
    ip.trim(),
  );
  const clientIp = req.ip ?? "";

  if (!allowedIps.includes(clientIp)) {
    throw new ForbiddenError("Access denied");
  }

  next();
};
