import type { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";
import { BadRequestError, ForbiddenError } from "../utils/AppError.js";
import { parseRequest } from "../utils/parseRequest.js";
import z from "zod";

const inviteSchema = z.object({
  inviteCode: z.string().trim().length(8, "Invite code must be 8 characters"),
  email: z.email().trim().toLowerCase(),
});

export const requireInvite = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { inviteCode, email } = parseRequest(inviteSchema, req.body);

  const earlyAccess = await prisma.earlyAccess.findUnique({
    where: { inviteCode },
  });

  if (!earlyAccess)
    throw new BadRequestError("Invalid invite code", {
      inviteCode: "Invalid invite code",
    });
  if (earlyAccess.status === "used")
    throw new ForbiddenError("You are already registered");
  if (earlyAccess.status === "disallowed")
    throw new BadRequestError("Invalid invite code", {
      inviteCode: "Invalid invite code",
    });
  if (earlyAccess.email !== email)
    throw new BadRequestError("Invalid invite code", {
      inviteCode: "Invalid invite code",
    });
  if (
    earlyAccess.inviteCodeExpiresAt &&
    earlyAccess.inviteCodeExpiresAt < new Date()
  ) {
    throw new ForbiddenError(
      "Invite code expired. Please contact support to get a new one.",
    );
  }

  // attach to req for use in register service
  req.earlyAccess = earlyAccess;
  next();
};
