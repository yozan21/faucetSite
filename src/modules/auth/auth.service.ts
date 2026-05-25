import crypto from "crypto";

import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";
import {
  hashPassword,
  comparePassword,
  generateReferralCode,
} from "../../utils/hashUtils.js";
import { generateTokens, verifyRefreshToken } from "../../utils/tokenUtils.js";
import type { RegisterInput, LoginInput } from "./auth.types.js";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  TooManyRequestsError,
} from "../../utils/AppError.js";
import { getIpInfo, isSuspiciousIp } from "../../utils/ipUtils.js";
import logger from "../../config/logger.js";
import { Prisma, type EarlyAccess } from "../../generated/prisma/client.js";
import {
  generateOtp,
  incrementTokenAttempts,
  storeOtp,
  verifyOtp,
} from "../../utils/otpUtils.js";
import { sendMail } from "../../utils/mailer.js";
import {
  forgotPasswordTemplate,
  passwordResetAlertTemplate,
  verificationEmailTemplate,
  welcomeEmailTemplate,
} from "../../utils/mailTemplates.js";
import {
  checkAccountBlock,
  checkAccountLockout,
  checkIpLimit,
  handleFailedAttempt,
  incrementIpAttempts,
  isCaptchaRequired,
  resetAccountAttempts,
  resetIpAttempts,
} from "../../utils/loginProtection.js";
import { verifyCaptcha } from "../../utils/captchaUtils.js";
import {
  decrypt,
  encrypt,
  generateRecoveryToken,
} from "../../utils/encryptionUtils.js";
import type { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";

const ADMIN_ROLES = ["superadmin", "admin", "moderator"];

const VERIFY_OTP_KEY = (userId: string) => `otp:verify:${userId}`;
const VERIFY_OTP_ATTEMPTS_KEY = (userId: string) =>
  `otp:verify:attempts:${userId}`;
const VERIFY_TOKEN_ATTEMPTS_KEY = (userId: string) =>
  `token:verify:attempts:${userId}`;
const RESET_OTP_KEY = (userId: string) => `otp:reset:${userId}`;
const RESET_ATTEMPTS_KEY = (userId: string) => `otp:reset:attempts:${userId}`;
const RESET_TOKEN_KEY = (token: string) => `resetToken:${token}`;
const BLOCK_KEY = (id: string) => `blocked:${id}`;

export const signupUser = async (
  input: RegisterInput,
  ip?: string,
  browser?: string,
  earlyAccess?: EarlyAccess,
) => {
  //IP Quality Check

  if (!ip) throw new ForbiddenError("Network or connection error");

  const ipInfo = await getIpInfo(ip);
  if (isSuspiciousIp(ipInfo)) {
    throw new ForbiddenError("VPN, proxy, and Tor connections are not allowed");
  }

  const { username, email, password, referralCode } = input;

  // check duplicates
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: username, mode: "insensitive" } },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existing) {
    throw new ConflictError(
      existing.username.toLowerCase() === username.toLowerCase()
        ? "Username already taken"
        : "Email already registered",
    );
  }

  // validate referral code if provided
  let referrer = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    // silently ignore invalid referral codes — don't expose existence
  }

  const passwordHash = await hashPassword(password);
  const newReferralCode = generateReferralCode();
  const plainToken = generateRecoveryToken();
  const encryptedToken = encrypt(plainToken);

  // create user, wallet and loginHistory in one transaction
  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email: email ?? null,
          password: passwordHash,
          referralCode: newReferralCode,
          role: "superadmin",
          createdCountry: ipInfo.country,
          createdIp: ip,
          browser: browser ?? null,
          recoveryToken: encryptedToken,
          recoveryTokenVersion: 0,
          recoveryTokenCreatedAt: new Date(),
          ...(earlyAccess ? { isVerified: true, verifiedAt: new Date() } : {}),
        },
      });

      await tx.wallet.create({
        data: { userId: newUser.id },
      });

      if (referrer) {
        await tx.referralUserData.create({
          data: {
            referrerId: referrer.id,
            referredId: newUser.id,
          },
        });
      }

      // mark early access as used
      if (earlyAccess) {
        await tx.earlyAccess.update({
          where: { id: earlyAccess.id },
          data: { status: "used" },
        });
      }

      return newUser;
    },
  );

  // send recovery token via email
  if (email) {
    await sendMail({
      to: email,
      subject: "Welcome to the FaucetSite",
      html: welcomeEmailTemplate(username, plainToken),
    });
  }

  const tokens = generateTokens({
    userId: user.id.toString(),
    username: user.username,
    role: user.role,
  });

  // store refresh token in Redis
  await redis.setEx(
    `refresh:${user.id}`,
    7 * 24 * 60 * 60, // 7 days in seconds
    tokens.refreshToken,
  );

  return {
    user: {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
    },
    tokens,
  };
};

export const loginUser = async (
  input: LoginInput,
  ip?: string,
  browser?: string,
) => {
  //IP Quality Check
  if (!ip) throw new ForbiddenError("Network or connection error");

  const ipInfo = await getIpInfo(ip);

  if (isSuspiciousIp(ipInfo)) {
    throw new ForbiddenError("VPN, proxy, and Tor connections are not allowed");
  }
  const { identifier, password, captchaToken } = input;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      role: true,
      createdCountry: true,
      createdIp: true,
      isActive: true,
      isBanned: true,
      banReason: true,
    },
  });

  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");
  // lockout and Block check
  if (user) {
    await checkAccountBlock(BLOCK_KEY(user.id.toString()));
    await checkAccountLockout(user.id.toString());
  }

  // captcha check
  const captchaNeeded = await isCaptchaRequired(
    user?.id.toString() ?? null,
    ip,
    isAdmin,
  );

  if (captchaNeeded) {
    if (!captchaToken) throw new BadRequestError("Captcha required");
    const valid = await verifyCaptcha(captchaToken, ip);
    if (!valid) throw new BadRequestError("Captcha verification failed");
  }

  // always compare password even if user not found — prevents timing attacks
  const dummyHash =
    "$2a$12$dummyhashfordummycomparison000000000000000000000000000";
  const passwordMatch = await comparePassword(
    password,
    user?.password ?? dummyHash,
  );

  const GENERIC_ERROR = "Invalid credentials";

  if (!user || !passwordMatch) {
    if (user) {
      await handleFailedAttempt(user.id.toString(), isAdmin, ip);
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          identifier,
          success: false,
          failureReason: "INVALID_PASSWORD",
          loginIp: ip,
          loginCountry: ipInfo?.country,
          browser: browser ?? null,
        },
      });
    } else {
      await incrementIpAttempts(ip);
      await prisma.loginHistory.create({
        data: {
          identifier,
          success: false,
          failureReason: "USER_NOT_FOUND",
          loginIp: ip,
          loginCountry: ipInfo?.country,
          browser: browser ?? null,
        },
      });
    }
    const captchaNeeded = await isCaptchaRequired(
      user?.id.toString() ?? null,
      ip,
      isAdmin,
    );
    throw new UnauthorizedError(GENERIC_ERROR, captchaNeeded);
  }

  if (!user.isActive || user.isBanned) {
    await handleFailedAttempt(user.id.toString(), isAdmin, ip);
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        identifier,
        success: false,
        failureReason: user.isBanned ? "BANNED" : "INACTIVE",
        loginIp: ip,
        loginCountry: ipInfo?.country,
        browser: browser ?? null,
      },
    });
    throw new ForbiddenError(
      user.isBanned
        ? `Account banned: ${user.banReason ?? "Contact support"}`
        : "Account is inactive",
    );
  }

  const tokens = generateTokens({
    userId: user.id.toString(),
    username: user.username,
    role: user.role,
  });

  // rotate refresh token
  await redis.setEx(
    `refresh:${user.id}`,
    7 * 24 * 60 * 60,
    tokens.refreshToken,
  );

  //Check country mismatch if the ipCheck is successfull
  if (
    ipInfo.success &&
    user.createdCountry &&
    user.createdCountry !== ipInfo.country
  ) {
    // flag but don't hard block on login — log for admin review
    logger.warn(
      {
        userId: user.id,
        registeredCountry: user.createdCountry,
        loginCountry: ipInfo.country,
        ip,
      },
      "Country mismatch detected on login",
    );

    // write to audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "COUNTRY_MISMATCH",
        metadata: {
          username: user.username,
          registeredCountry: user.createdCountry,
          loginCountry: ipInfo.country,
          ip,
          fraudScore: ipInfo.fraudScore,
        },
      },
    });
  }

  if (user.createdIp !== ip) {
    logger.warn(
      {
        userId: user.id,
        registeredIp: user.createdIp,
        loginIp: ip,
      },
      "Ip mismatch detected on login",
    );

    // write to audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "IP_MISMATCH",
        metadata: {
          username: user.username,
          registeredIp: user.createdIp,
          loginIp: ip,
          fraudScore: ipInfo.fraudScore,
        },
      },
    });
  }

  await resetAccountAttempts(user.id.toString(), ip);

  // log login history
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      loginIp: ip,
      loginCountry: ipInfo.country,
      browser: browser ?? null,
      loginAt: new Date(),
    },
  });

  return {
    user: {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    tokens,
  };
};

export const refreshTokens = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ForbiddenError("Invalid refresh token");
  }

  // check if token matches what's in Redis
  const stored = await redis.get(`refresh:${payload.userId}`);
  if (!stored || stored !== refreshToken) {
    throw new ForbiddenError("Refresh token expired or already used");
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(payload.userId) },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  });

  if (!user || !user.isActive || user.isBanned) {
    throw new ForbiddenError("Account suspended");
  }

  await checkAccountBlock(BLOCK_KEY(payload.userId));

  const tokens = generateTokens({
    userId: user.id.toString(),
    username: user.username,
    role: user.role,
  });

  // rotate — old token is replaced
  await redis.setEx(
    `refresh:${user.id}`,
    7 * 24 * 60 * 60,
    tokens.refreshToken,
  );

  return tokens;
};

export const logoutUser = async (userId: string) => {
  await redis.del(`refresh:${userId}`);
};

/*============ Send Verification OTP ===============*/
export const sendVerificationOtp = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { id: true, username: true, email: true, isVerified: true },
  });

  if (!user) throw new NotFoundError("User not found");
  if (user.isVerified) throw new BadRequestError("Email already verified");
  if (!user.email)
    throw new BadRequestError("No email address on this account");

  const otp = generateOtp();
  await storeOtp(VERIFY_OTP_KEY(userId), otp);

  console.log("OTP", otp);

  await sendMail({
    to: user.email,
    subject: "Verify your email",
    html: verificationEmailTemplate(user.username, otp),
  });
};

/*========== Verify Email By OTP ===========*/
export const verifyEmail = async (userId: string, otp: string, ip?: string) => {
  await verifyOtp(
    VERIFY_OTP_KEY(userId),
    VERIFY_OTP_ATTEMPTS_KEY(userId),
    BLOCK_KEY(userId),
    otp,
    userId,
    ip,
  );

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });
};

/*========== Verify Email By Recovery Token ===========*/
export const verifyEmailWithToken = async (
  userId: string,
  recoveryToken: string,
  ip: string,
) => {
  await checkAccountBlock(BLOCK_KEY(userId));
  await checkAccountLockout(userId);
  const attempts = await redis.get(VERIFY_TOKEN_ATTEMPTS_KEY(userId));
  if (attempts && parseInt(attempts) >= 5) {
    throw new TooManyRequestsError("Too many attempts. Request denied!");
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      username: true,
      isVerified: true,
      recoveryToken: true,
    },
  });

  if (!user) throw new NotFoundError("User not found");
  if (user.isVerified) throw new BadRequestError("Email already verified");
  if (!user.recoveryToken) throw new BadRequestError("No recovery token found");

  const plainStored = decrypt(user.recoveryToken);

  if (plainStored !== recoveryToken) {
    await incrementTokenAttempts(
      VERIFY_TOKEN_ATTEMPTS_KEY(userId),
      BLOCK_KEY(userId),
      userId,
      ip,
    );

    throw new UnauthorizedError("Invalid credentails");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: BigInt(userId) },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        recoveryTokenUsedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: BigInt(userId),
        action: "EMAIL_VERIFIED",
        metadata: {
          username: user.username,
          ip,
          method: "recovery_token",
        },
      },
    });

    await resetAccountAttempts(userId, ip);
    await redis.del(VERIFY_TOKEN_ATTEMPTS_KEY(userId));
    await redis.del(BLOCK_KEY(userId));
  });
};

/*========= Forgot Password =========*/
export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, username: true, email: true },
  });

  // always return success even if user not found — prevents user enumeration
  if (!user || !user.email) return;

  await checkAccountBlock(BLOCK_KEY(user.id.toString()));

  const otp = generateOtp();
  await storeOtp(RESET_OTP_KEY(user.id.toString()), otp);

  await sendMail({
    to: user.email,
    subject: "Password reset code",
    html: forgotPasswordTemplate(user.username, otp),
  });
};

/*========= Verify Reset By OTP =========*/
export const verifyResetOtp = async (
  identifier: string,
  otp: string,
  ip?: string,
) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier } },
      ],
    },
    select: { id: true },
  });

  if (!user) throw new BadRequestError("Invalid request");

  await verifyOtp(
    RESET_OTP_KEY(user.id.toString()),
    RESET_ATTEMPTS_KEY(user.id.toString()),
    BLOCK_KEY(user.id.toString()),
    otp,
    user.id.toString(),
    ip,
  );

  // OTP valid — generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  await redis.setEx(RESET_TOKEN_KEY(resetToken), 60 * 15, user.id.toString()); // 15 min

  return { resetToken };
};

/*========= Verify Reset By Token =========*/
export const verifyResetToken = async (
  identifier: string,
  recoveryToken: string,
  ip: string,
) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier } },
      ],
    },
    select: { id: true, username: true, recoveryToken: true, role: true },
  });

  if (!user || !user.recoveryToken)
    throw new UnauthorizedError("Invalid credentials");

  const plainStored = decrypt(user.recoveryToken);

  if (plainStored !== recoveryToken) {
    await incrementTokenAttempts(
      VERIFY_TOKEN_ATTEMPTS_KEY(user.id.toString()),
      BLOCK_KEY(user.id.toString()),
      user.id.toString(),
      ip,
    );

    throw new UnauthorizedError("Invalid credentials");
  }

  // Token valid — generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  await redis.setEx(RESET_TOKEN_KEY(resetToken), 60 * 15, user.id.toString()); // 15 min

  const data = await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.user.update({
      where: { id: user.id },
      data: { recoveryTokenUsedAt: new Date() },
    });

    if (user.role === "superadmin") {
      const otp = generateOtp();
      await redis.setEx(`otp:reset:${user.id}`, 60 * 10, otp); // 10 mins

      // NO email sent — retrieve from Redis CLI only
      // redis-cli GET otp:reset:{userId}

      logger.warn(
        { userId: user.id },
        "Superadmin reset OTP stored in Redis — retrieve via CLI",
      );

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUPERADMIN_RESET_OTP_GENERATED",
          metadata: { ip, username: user.username, timestamp: new Date() },
        },
      });

      return { requiresOtp: true };
    } else
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "RECOVERY_TOKEN_USED_FOR_RESET",
          metadata: {
            username: user.username,
            ip,
          },
        },
      });
  });

  await resetAccountAttempts(user.id.toString(), ip);
  await redis.del(VERIFY_TOKEN_ATTEMPTS_KEY(user.id.toString()));
  await redis.del(BLOCK_KEY(user.id.toString()));

  if (data) return data;
  else return { resetToken };
};

/*========= Reset Password =========*/
export const resetPassword = async (
  resetToken: string,
  newPassword: string,
  ip?: string,
) => {
  await checkIpLimit(ip ?? "unknown");
  await incrementIpAttempts(ip ?? "unknown");
  const userId = await redis.get(RESET_TOKEN_KEY(resetToken));
  if (!userId) throw new BadRequestError("Reset token expired or invalid");

  const passwordHash = await hashPassword(newPassword);

  const updatedUser = await prisma.$transaction(
    async (tx: TransactionClient) => {
      const updated = await tx.user.update({
        where: { id: BigInt(userId) },
        data: {
          password: passwordHash,
          lastPasswordChangeAt: new Date(),
        },
        select: {
          username: true,
          email: true,
        },
      });
      // audit log
      await tx.auditLog.create({
        data: {
          userId: BigInt(userId),
          action: "PASSWORD_RESET",
          metadata: {
            username: updated.username,
            timestamp: new Date(),
          },
        },
      });

      // invalidate reset token + all refresh tokens
      await redis.del(RESET_TOKEN_KEY(resetToken));
      await redis.del(`refresh:${userId}`);
      await resetIpAttempts(ip ?? "unknown");

      return updated;
    },
  );

  if (updatedUser?.email)
    await sendMail({
      to: updatedUser.email,
      subject: "Your password was reset",
      html: passwordResetAlertTemplate(updatedUser.username, new Date()),
    });
};

/*========= Unblock Account =========*/
export const unblockAccount = async (
  targetUserId: string,
  unlockedById: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(targetUserId) },
    select: { id: true, username: true },
  });
  if (!user) throw new NotFoundError("User not found");

  const isBlocked = await redis.get(BLOCK_KEY(targetUserId));
  if (!isBlocked) throw new BadRequestError("User is not blocked");

  await prisma.auditLog.create({
    data: {
      targetId: targetUserId,
      targetType: "User",
      teamMemberId: BigInt(unlockedById),
      action: "ACCOUNT_UNBLOCK",
      metadata: {
        targetUserId,
        unlockedById,
        timestamp: new Date(),

        username: user.username,
      },
    },
  });
  await redis.del(BLOCK_KEY(targetUserId));
  await redis.del(RESET_ATTEMPTS_KEY(targetUserId));
};

/*========= Request Early Access =========*/
export const requestEarlyAccess = async (email: string) => {
  const existing = await prisma.earlyAccess.findUnique({ where: { email } });

  // always return same message — no enumeration
  if (existing) return;

  await prisma.earlyAccess.create({
    data: { email },
  });
};

/*========= Check Duplicate Username =========*/
export const checkUsername = async (username: string) => {
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  return { available: !existing };
};
