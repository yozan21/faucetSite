import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5000"),

  DATABASE_URL: z.url(),
  REDIS_URL: z.string(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),

  RECOVERY_TOKEN_SECRET: z
    .string()
    .length(64, "Must be 64 hex chars (32 bytes)"),

  ADMIN_REAUTH_SECRET: z.string().min(32),
  ADMIN_REAUTH_EXPIRES: z.string().default("30m"),

  TURNSTILE_SECRET_KEY: z.string(),
  TURNSTILE_SITE_KEY: z.string(),
  IPQUALITYSCORE_KEY: z.string().optional(),

  MAIL_ENV: z.enum(["development", "production"]),
  MAILTRAP_HOST: z.string(),
  MAILTRAP_PORT: z.string().default("2525"),
  MAILTRAP_USER: z.string(),
  MAILTRAP_PASS: z.string(),

  BREVO_HOST: z.string(),
  BREVO_PORT: z.string().default("2525"),
  BREVO_USER: z.string(),
  BREVO_PASS: z.string(),

  MAIL_FROM_EMAIL: z.email(),
  MAIL_FROM_NAME: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

export const env = parsed.data;
