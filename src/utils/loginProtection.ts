import redis from "../config/redis.js";
import { ForbiddenError, TooManyRequestsError } from "./AppError.js";
import logger from "../config/logger.js";

const USER_POLICY = [
  { attempts: 3, lockoutSecs: 0 },
  { attempts: 5, lockoutSecs: 30 },
  { attempts: 7, lockoutSecs: 300 },
  { attempts: 10, lockoutSecs: 1800 },
  { attempts: Infinity, lockoutSecs: 86400 },
];

const ADMIN_POLICY = [
  { attempts: 2, lockoutSecs: 0 },
  { attempts: 4, lockoutSecs: 300 },
  { attempts: 6, lockoutSecs: 3600 },
  { attempts: Infinity, lockoutSecs: 86400 },
];

const USER_CAPTCHA_THRESHOLD = 3;
const ADMIN_CAPTCHA_THRESHOLD = 2;
const IP_MAX_ATTEMPTS = 20;
const IP_LOCKOUT_SECS = 3600;

const getLockoutDuration = (attempts: number, isAdmin: boolean): number => {
  const policy = isAdmin ? ADMIN_POLICY : USER_POLICY;
  return policy.find((p) => attempts <= p.attempts)?.lockoutSecs ?? 86400;
};

// ─── IP ──────────────────────────────────────────────────────────────────────

export const checkIpLimit = async (ip: string): Promise<void> => {
  const lockout = await redis.get(`login:ip:lockout:${ip}`);
  if (lockout) {
    const ttl = await redis.ttl(`login:ip:lockout:${ip}`);
    throw new TooManyRequestsError(
      `Too many login attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
    );
  }

  const attempts = parseInt(
    (await redis.get(`login:ip:attempts:${ip}`)) ?? "0",
  );
  if (attempts >= IP_MAX_ATTEMPTS) {
    await redis.setEx(`login:ip:lockout:${ip}`, IP_LOCKOUT_SECS, "1");
    logger.warn({ ip }, "IP locked out");
    throw new TooManyRequestsError("Too many login attempts from this IP.");
  }
};

export const incrementIpAttempts = async (ip: string): Promise<void> => {
  const current = await redis.incr(`login:ip:attempts:${ip}`);
  if (current === 1) await redis.expire(`login:ip:attempts:${ip}`, 3600);
};

export const resetIpAttempts = async (ip: string): Promise<void> => {
  await redis.del(`login:ip:attempts:${ip}`);
  await redis.del(`login:ip:lockout:${ip}`);
};

// ─── Account ─────────────────────────────────────────────────────────────────

export const checkAccountBlock = async (blockKey: string): Promise<void> => {
  const blocked = await redis.get(blockKey);
  if (blocked)
    throw new ForbiddenError(
      "Your account has been blocked! Contact support for further assistance.",
    );
};

export const checkAccountLockout = async (
  userId: string,
  //   isAdmin: boolean,
): Promise<void> => {
  const lockout = await redis.get(`login:lockout:${userId}`);
  if (lockout) {
    const ttl = await redis.ttl(`login:lockout:${userId}`);
    const minutes = Math.ceil(ttl / 60);
    throw new ForbiddenError(
      minutes > 60
        ? `Account temporarily locked. Try again in ${Math.ceil(minutes / 60)} hours.`
        : `Account temporarily locked. Try again in ${minutes} minutes.`,
    );
  }
};

export const handleFailedAttempt = async (
  userId: string,
  isAdmin: boolean,
  ip: string,
): Promise<void> => {
  const attempts = await redis.incr(`login:attempts:${userId}`);
  if (attempts === 1) await redis.expire(`login:attempts:${userId}`, 86400);

  const lockoutSecs = getLockoutDuration(attempts, isAdmin);
  if (lockoutSecs > 0) {
    await redis.setEx(`login:lockout:${userId}`, lockoutSecs, "1");
    logger.warn({ userId, attempts, lockoutSecs }, "Account locked out");
  }

  await incrementIpAttempts(ip);
};

export const resetAccountAttempts = async (
  userId: string,
  ip: string,
): Promise<void> => {
  await redis.del(`login:attempts:${userId}`);
  await redis.del(`login:lockout:${userId}`);
  await resetIpAttempts(ip);
};

// ─── Captcha ──────────────────────────────────────────────────────────────────

export const isCaptchaRequired = async (
  userId: string | null,
  ip: string,
  isAdmin: boolean,
): Promise<boolean> => {
  const ipAttempts = parseInt(
    (await redis.get(`login:ip:attempts:${ip}`)) ?? "0",
  );
  if (ipAttempts >= 5) return true;
  if (!userId) return false;

  const attempts = parseInt(
    (await redis.get(`login:attempts:${userId}`)) ?? "0",
  );
  const threshold = isAdmin ? ADMIN_CAPTCHA_THRESHOLD : USER_CAPTCHA_THRESHOLD;
  return attempts >= threshold;
};
