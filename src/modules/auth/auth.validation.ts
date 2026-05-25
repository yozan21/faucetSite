import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers and underscores",
    ),
  email: z.email().trim().toLowerCase(),
  country: z.string().trim().optional(),
  password: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val.length < 8)
        ctx.addIssue({
          code: "too_small",
          origin: "string",
          minimum: 8,
          type: "string",
          inclusive: true,
          message: "Must be at least 8 characters",
        });
      if (!/[A-Z]/.test(val))
        ctx.addIssue({ code: "custom", message: "Must contain uppercase" });
      if (!/[0-9]/.test(val))
        ctx.addIssue({ code: "custom", message: "Must contain number" });
      if (!/[^a-zA-Z0-9]/.test(val))
        ctx.addIssue({
          code: "custom",
          message: "Must contain special character",
        });
    }),
  referralCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1)
    .refine(
      (val) => {
        // If it looks like an email, skip the username character check (it's already valid text)
        if (val.includes("@")) return true;

        // If it's a username, check it against your regex rules
        return /^[a-zA-Z0-9_]+$/.test(val);
      },
      {
        message: "Username can only contain letters, numbers, and underscores",
      },
    )
    .transform((val) => {
      // Normalise email addresses to lowercase, leave usernames exactly as they are
      return val.includes("@") ? val.toLowerCase() : val;
    }),
  password: z.string().trim().min(1),
  captchaToken: z.string().trim().optional(),
});

export const verifyEmailSchema = z.object({
  recoveryToken: z.string().trim().length(64, "Invalid recovery token"),
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim().min(1, "Email is required").toLowerCase(),
});

export const verifyResetTokenSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .refine(
      (val) => {
        // If it looks like an email, skip the username character check (it's already valid text)
        if (val.includes("@")) return true;

        // If it's a username, check it against regex rules
        return /^[a-zA-Z0-9_]+$/.test(val);
      },
      {
        message: "Username can only contain letters, numbers, and underscores",
      },
    )
    .transform((val) => {
      // Normalise email addresses to lowercase, leave usernames exactly as they are
      return val.includes("@") ? val.toLowerCase() : val;
    }),
  recoveryToken: z.string().trim().length(64, "Invalid recovery token"),
});

export const verifyResetOtpSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .refine(
      (val) => {
        // If it looks like an email, skip the username character check (it's already valid text)
        if (val.includes("@")) return true;

        // If it's a username, check it against regex rules
        return /^[a-zA-Z0-9_]+$/.test(val);
      },
      {
        message: "Username can only contain letters, numbers, and underscores",
      },
    )
    .transform((val) => {
      // Normalise email addresses to lowercase, leave usernames exactly as they are
      return val.includes("@") ? val.toLowerCase() : val;
    }),
  otp: z.string().trim().length(6, "Invalid OTP"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().trim().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val.length < 8)
        ctx.addIssue({
          code: "too_small",
          origin: "string",
          minimum: 8,
          type: "string",
          inclusive: true,
          message: "Must be at least 8 characters",
        });
      if (!/[A-Z]/.test(val))
        ctx.addIssue({ code: "custom", message: "Must contain uppercase" });
      if (!/[0-9]/.test(val))
        ctx.addIssue({ code: "custom", message: "Must contain number" });
      if (!/[^a-zA-Z0-9]/.test(val))
        ctx.addIssue({
          code: "custom",
          message: "Must contain special character",
        });
    }),
});

export const earlyAccessSchema = z.object({
  email: z.email("Valid email required").trim().toLowerCase(),
});

export const checkUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers and underscores",
    ),
});
