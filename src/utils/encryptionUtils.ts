import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-cbc";
const KEY = Buffer.from(env.RECOVERY_TOKEN_SECRET, "hex");
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (text: string): string => {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex ?? "", "hex");
  const encrypted = Buffer.from(encryptedHex ?? "", "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString();
};

export const generateRecoveryToken = (): string =>
  crypto.randomBytes(32).toString("hex"); // 64 char hex
