import crypto from "crypto";
import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";
import { hashPassword, comparePassword } from "../../utils/hashUtils.js";
import { decrypt } from "../../utils/encryptionUtils.js";
import { sendMail } from "../../utils/mailer.js";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../../utils/AppError.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  passwordResetAlertTemplate,
  welcomeEmailTemplate,
} from "../../utils/mailTemplates.js";

const USERNAME_COOLDOWN_DAYS = 30;

// ─── Get Me ──────────────────────────────────────────────────────────────────
export const getMe = async (userId: bigint) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isVerified: true,
      isActive: true,
      referralCode: true,
      createdAt: true,
      lastUsernameChangeAt: true,
      wallet: {
        select: {
          balance: true,
          pendingWithdrawal: true,
          totalMined: true,
          totalWithdrawn: true,
          totalClaimed: true,
        },
      },
      activeSubscription: {
        where: { active: true },
        select: { subscriptionName: true, expireAt: true },
        take: 1,
      },
    },
  });

  if (!user) throw new NotFoundError("User not found");

  return {
    ...user,
    id: user.id.toString(),
    wallet: user.wallet
      ? {
          balance: user.wallet.balance.toString(),
          pendingWithdrawal: user.wallet.pendingWithdrawal.toString(),
          totalMined: user.wallet.totalMined.toString(),
          totalWithdrawn: user.wallet.totalWithdrawn.toString(),
          totalClaimed: user.wallet.totalClaimed.toString(),
        }
      : null,
    subscription: user.activeSubscription[0] ?? null,
  };
};

// ─── Update Username ──────────────────────────────────────────────────────────
export const updateUsername = async (userId: bigint, username: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, lastUsernameChangeAt: true },
  });

  if (!user) throw new NotFoundError("User not found");

  // cooldown check
  if (user.lastUsernameChangeAt) {
    const daysSinceChange = Math.floor(
      (Date.now() - user.lastUsernameChangeAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceChange < USERNAME_COOLDOWN_DAYS) {
      const daysLeft = USERNAME_COOLDOWN_DAYS - daysSinceChange;
      throw new BadRequestError(
        `You can change your username in ${daysLeft} days`,
      );
    }
  }

  // check availability
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { id: userId },
    },
  });
  if (existing) throw new ConflictError("Username already taken");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      lastUsernameChangeAt: new Date(),
    },
    select: { username: true, lastUsernameChangeAt: true },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "USERNAME_CHANGED",
      metadata: { oldUsername: user.username, newUsername: username },
    },
  });

  return updated;
};

// ─── Update Email ─────────────────────────────────────────────────────────────
export const updateEmail = async (
  userId: bigint,
  newEmail: string,
  recoveryToken: string,
  ip: string,
  country: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      recoveryToken: true,
    },
  });

  if (!user) throw new NotFoundError("User not found");
  if (!user.recoveryToken) throw new BadRequestError("No recovery token found");

  // verify recovery token
  const plainStored = decrypt(user.recoveryToken);
  if (plainStored !== recoveryToken)
    throw new UnauthorizedError("Invalid recovery token");

  // check new email not already taken
  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: newEmail, mode: "insensitive" },
      NOT: { id: userId },
    },
  });
  if (existing) throw new ConflictError("Email already in use");

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: newEmail,
      isVerified: false, // re-verify new email
      verifiedAt: null,
      lastEmailChangeAt: new Date(),
    },
  });

  // invalidate all sessions
  await redis.del(`refresh:${userId}`);

  // send welcome email to new address with their existing token
  await sendMail({
    to: newEmail,
    subject: "Your email has been updated",
    html: welcomeEmailTemplate(user.username, recoveryToken),
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "EMAIL_CHANGED",
      metadata: {
        oldEmail: user.email,
        newEmail,
        ip,
        country,
      },
    },
  });
};

// ─── Update Password ──────────────────────────────────────────────────────────
export const updatePassword = async (
  userId: bigint,
  oldPassword: string,
  newPassword: string,
  ip: string,
  country: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
    },
  });

  if (!user) throw new NotFoundError("User not found");

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) throw new UnauthorizedError("Old password is incorrect");

  // prevent same password
  const isSame = await comparePassword(newPassword, user.password);
  if (isSame)
    throw new BadRequestError(
      "New password cannot be the same as old password",
    );

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      lastPasswordChangeAt: new Date(),
    },
  });

  // invalidate all sessions
  await redis.del(`refresh:${userId}`);

  // send alert email
  if (user.email) {
    await sendMail({
      to: user.email,
      subject: "⚠️ Your password was changed",
      html: passwordResetAlertTemplate(user.username, new Date()),
    });
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "PASSWORD_CHANGED",
      metadata: { ip, country },
    },
  });
};

// ─── Login History ────────────────────────────────────────────────────────────
export const getLoginHistory = async (
  userId: bigint,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        success: true,
        failureReason: true,
        loginIp: true,
        loginCountry: true,
        browser: true,
        loginAt: true,
      },
    }),
    prisma.loginHistory.count({ where: { userId } }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Referrals ────────────────────────────────────────────────────────────────
export const getReferrals = async (
  userId: bigint,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.referralUserData.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        referred: {
          select: {
            username: true,
            createdAt: true,
            isActive: true,
            activeSubscription: {
              where: { active: true },
              select: { subscriptionName: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.referralUserData.count({ where: { referrerId: userId } }),
  ]);

  return {
    data: data.map((r) => ({
      id: r.id.toString(),
      referredAt: r.createdAt,
      username: r.referred.username,
      isActive: r.referred.isActive,
      subscription:
        r.referred.activeSubscription[0]?.subscriptionName ?? "free",
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Transaction History ──────────────────────────────────────────────────────
export const getTransactionHistory = async (
  userId: bigint,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transactionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        sourceType: true,
        note: true,
        createdAt: true,
      },
    }),
    prisma.transactionLog.count({ where: { userId } }),
  ]);

  return {
    data: data.map((t) => ({
      ...t,
      id: t.id.toString(),
      amount: t.amount.toString(),
      balanceBefore: t.balanceBefore.toString(),
      balanceAfter: t.balanceAfter.toString(),
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
