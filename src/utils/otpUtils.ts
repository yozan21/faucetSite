import crypto from "crypto";
import redis from "../config/redis.js";
import {
  TooManyRequestsError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "./AppError.js";
import prisma from "../config/prisma.js";
import {
  checkAccountBlock,
  checkAccountLockout,
  handleFailedAttempt,
  resetAccountAttempts,
} from "./loginProtection.js";

const OTP_TTL = 60 * 10; // 10 minutes
const ATTEMPTS_TTL = 7 * 24 * 60 * 60; // 7 days
const MAX_ATTEMPTS = 5;

export const generateOtp = (): string => {
  // cryptographically secure 6 digit OTP
  return crypto.randomInt(100000, 999999).toString();
};

export const storeOtp = async (key: string, otp: string): Promise<void> => {
  await redis.setEx(key, OTP_TTL, otp);
};

export const verifyOtp = async (
  key: string,
  attemptsKey: string,
  blockKey: string,
  otp: string,
  userId: string,
  ip: string = "unknown",
): Promise<void> => {
  // check block
  await checkAccountBlock(blockKey);
  // check lockout
  await checkAccountLockout(userId);

  // check attempts
  const attempts = await redis.get(attemptsKey);
  if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
    throw new TooManyRequestsError("Too many attempts. Request a new OTP.");
  }

  const stored = await redis.get(key);

  if (!stored) {
    throw new BadRequestError("OTP expired or not found. Request a new one.");
  }
  if (stored !== otp) {
    // await handleFailedAttempt(userId, isAdmin, ip)
    // increment attempts
    const current = await redis.incr(attemptsKey);

    if (current === 1) await redis.expire(attemptsKey, ATTEMPTS_TTL); // set TTL on first attempt

    // if(current === )
    if (current >= MAX_ATTEMPTS) {
      await redis.set(blockKey, "MAX_OTP_ATTEMPTS_REACHED");
      await prisma.auditLog.create({
        data: {
          userId: BigInt(userId),
          action: "OTP_BLOCK",
          metadata: { reason: "MAX_OTP_ATTEMPTS_REACHED", ip },
        },
      });
      throw new TooManyRequestsError(
        "Too many failed attempts. Your account has been blocked! Contact support for further help",
      );
    }
    const remaining = MAX_ATTEMPTS - current;

    // Specific messaging for 3 and 1 attempts left
    if (remaining === 3) {
      throw new BadRequestError("Invalid OTP. 3 attempts remaining.");
    }

    if (remaining === 1) {
      throw new BadRequestError("Invalid OTP. 1 attempt remaining.");
    }

    // Generic message for all other counts (e.g., 4 or 2 remaining)
    throw new BadRequestError("Invalid OTP.");
  }

  // valid — delete OTP and attempts
  await resetAccountAttempts(userId, ip);
  await redis.del(key);
  await redis.del(attemptsKey);
  await redis.del(blockKey);
};

export const incrementTokenAttempts = async (
  tokenAttemptsKey: string,
  blockKey: string,
  userId: string,
  ip: string = "unknown",
): Promise<void> => {
  const current = await redis.incr(tokenAttemptsKey);

  if (current === 1) await redis.expire(tokenAttemptsKey, 7 * 24 * 60 * 60); // set TTL for 7 days

  if (current >= 5) {
    await redis.set(blockKey, "MAX_TOKEN_ATTEMPTS_REACHED");
    await prisma.auditLog.create({
      data: {
        userId: BigInt(userId),
        action: "ACCOUNT_BLOCK",
        metadata: { reason: "MAX_TOKEN_ATTEMPTS_REACHED", ip },
      },
    });
    throw new TooManyRequestsError(
      "Too many failed attempts. Your account has been blocked! Contact support for further help",
    );
  }
  const remaining = 5 - current;

  // Specific messaging for 3 and 1 attempts left
  if (remaining === 3) {
    throw new BadRequestError("Invalid credentials. 3 attempts remaining.");
  }

  if (remaining === 1) {
    throw new BadRequestError("Invalid credentials. 1 attempt remaining.");
  }
};
