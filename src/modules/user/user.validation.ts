import { z } from "zod";

export const updateUsernameSchema = z.object({
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

export const updateEmailSchema = z.object({
  newEmail: z.email("Valid email required").trim(),
  recoveryToken: z.string().trim().length(64, "Invalid recovery token"),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().trim().min(1, "Old password is required"),
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

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? "1")),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(parseInt(v ?? "20"), 100)),
});
