import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokenUtils.js";
import prisma from "../config/prisma.js";
import { UnauthorizedError, ForbiddenError } from "../utils/AppError.js";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token =
    req.cookies?.accessToken ?? req.headers.authorization?.split(" ")[1];
  if (!token) throw new UnauthorizedError();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(payload.userId) },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      isBanned: true,
      banReason: true,
    },
  });

  if (!user) throw new UnauthorizedError();
  if (!user.isActive || user.isBanned)
    throw new ForbiddenError(user.banReason ?? "Account suspended");

  req.user = user;
  next();
};
