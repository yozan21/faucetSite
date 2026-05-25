import type { Request, Response } from "express";
import * as userService from "./user.service.js";
import { parseRequest } from "../../utils/parseRequest.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  updateUsernameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  paginationSchema,
} from "./user.validation.js";

export const getMe = async (req: Request, res: Response) => {
  const data = await userService.getMe(req.user!.id);
  sendSuccess(res, data);
};

export const updateUsername = async (req: Request, res: Response) => {
  const data = parseRequest(updateUsernameSchema, req.body);
  const result = await userService.updateUsername(req.user!.id, data.username);
  sendSuccess(res, result, "Username updated successfully");
};

export const updateEmail = async (req: Request, res: Response) => {
  const data = parseRequest(updateEmailSchema, req.body);
  await userService.updateEmail(
    req.user!.id,
    data.newEmail,
    data.recoveryToken,
    req.ip ?? "unknown",
    req.ipInfo?.country ?? "Unknown",
  );
  sendSuccess(res, {}, "Email updated successfully. Please login again.");
};

export const updatePassword = async (req: Request, res: Response) => {
  const data = parseRequest(updatePasswordSchema, req.body);
  await userService.updatePassword(
    req.user!.id,
    data.oldPassword,
    data.newPassword,
    req.ip ?? "unknown",
    req.ipInfo?.country ?? "Unknown",
  );
  sendSuccess(res, {}, "Password updated successfully. Please login again.");
};

export const getLoginHistory = async (req: Request, res: Response) => {
  const { page, limit } = parseRequest(paginationSchema, req.query);
  const data = await userService.getLoginHistory(req.user!.id, page, limit);
  sendSuccess(res, data);
};

export const getReferrals = async (req: Request, res: Response) => {
  const { page, limit } = parseRequest(paginationSchema, req.query);
  const data = await userService.getReferrals(req.user!.id, page, limit);
  sendSuccess(res, data);
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  const { page, limit } = parseRequest(paginationSchema, req.query);
  const data = await userService.getTransactionHistory(
    req.user!.id,
    page,
    limit,
  );
  sendSuccess(res, data);
};
