import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  earlyAccessSchema,
  checkUsernameSchema,
} from "./auth.validation.js";
import { BadRequestError, UnauthorizedError } from "../../utils/AppError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { clearAuthCookies, setAuthCookies } from "../../utils/cookieUtils.js";
import { parseRequest } from "../../utils/parseRequest.js";

export const signup = async (req: Request, res: Response) => {
  const data = parseRequest(registerSchema, req.body);

  const ip = req.ip;
  const browser = req.headers["user-agent"];

  const { user, tokens } = await authService.signupUser(
    data,
    ip,
    browser,
    req.earlyAccess,
  );

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendSuccess(res, user, "Registered successfully", 201);
};

export const login = async (req: Request, res: Response) => {
  const data = parseRequest(loginSchema, req.body);

  const ip = req.ip;
  const browser = req.headers["user-agent"];

  const { user, tokens } = await authService.loginUser(data, ip, browser);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendSuccess(res, user, "Login successful");
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new UnauthorizedError();

  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, {}, "Tokens refreshed");
};

export const logout = async (req: Request, res: Response) => {
  await authService.logoutUser(req.user!.id.toString());
  clearAuthCookies(res);
  sendSuccess(res, {}, "Logged out successfully");
};

export const sendVerificationOtpController = async (
  req: Request,
  res: Response,
) => {
  console.log("Control was here --> controller");
  await authService.sendVerificationOtp(req.user!.id.toString());
  sendSuccess(res, {}, "Verification OTP sent to your email");
};

export const verifyEmailController = async (req: Request, res: Response) => {
  const data = parseRequest(verifyEmailSchema, req.body);
  await authService.verifyEmailWithToken(
    req.user!.id.toString(),
    data.recoveryToken,
    req.ip ?? "unknown",
  );
  sendSuccess(res, {}, "Email verified successfully");
};
export const forgotPasswordController = async (req: Request, res: Response) => {
  const data = parseRequest(forgotPasswordSchema, req.body);
  await authService.forgotPassword(data.email);
  sendSuccess(res, {}, "OTP has been sent to the email");
};

export const verifyResetTokenController = async (
  req: Request,
  res: Response,
) => {
  const data = parseRequest(verifyResetTokenSchema, req.body);
  const result = await authService.verifyResetToken(
    data.identifier,
    data.recoveryToken,
    req.ip ?? "unknown",
  );
  sendSuccess(res, result, "Token verified");
};

export const resetPasswordController = async (req: Request, res: Response) => {
  const data = parseRequest(resetPasswordSchema, req.body);
  await authService.resetPassword(data.resetToken, data.newPassword);
  clearAuthCookies(res);
  sendSuccess(res, {}, "Password reset successful. Please login again.");
};

export const unblockAccountController = async (req: Request, res: Response) => {
  const value = req.params.userId;

  if (typeof value !== "string") {
    throw new BadRequestError("User id not defined");
  }
  await authService.unblockAccount(value, req.user!.id.toString());
  sendSuccess(res, {}, "Account block remove successful");
};

export const requestEarlyAccessController = async (
  req: Request,
  res: Response,
) => {
  const data = parseRequest(earlyAccessSchema, req.body);
  await authService.requestEarlyAccess(data.email);
  sendSuccess(
    res,
    {},
    "If eligible, you will receive an invite code via email",
  );
};

export const checkUsernameController = async (req: Request, res: Response) => {
  const data = parseRequest(checkUsernameSchema, req.body);
  const result = await authService.checkUsername(data.username);
  sendSuccess(
    res,
    result,
    result.available ? "Username is available" : "Username is taken",
  );
};
