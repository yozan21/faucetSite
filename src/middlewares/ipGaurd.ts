import type { Request, Response, NextFunction } from "express";
import { getIpInfo, isSuspiciousIp } from "../utils/ipUtils.js";
import { ForbiddenError } from "../utils/AppError.js";
import redis from "../config/redis.js";
import logger from "../config/logger.js";

export const ipGuard = (strict = false) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      if (!ip) return next();

      // logger.info(`The ip: ${ip}`);

      if (!strict) {
        const cached = await redis.get(`ipcheck:${ip}`);
        if (cached) {
          req.ipInfo = JSON.parse(cached);
          if (isSuspiciousIp(req.ipInfo!))
            return next(
              new ForbiddenError(
                "VPN, proxy, and Tor connections are not allowed",
              ),
            );
          return next();
        }
      }

      const ipInfo = await getIpInfo(ip);
      req.ipInfo = ipInfo;

      if (!strict) {
        await redis.setEx(`ipcheck:${ip}`, 120, JSON.stringify(ipInfo));
      }

      if (isSuspiciousIp(ipInfo))
        return next(
          new ForbiddenError("VPN, proxy, and Tor connections are not allowed"),
        );
      return next();
    } catch (error) {
      logger.warn(error);
      return next(error);
    }
  };
};
