import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateReferralCode = (): string => {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
};

export const generateSessionId = (): string => {
  return crypto.randomUUID();
};
