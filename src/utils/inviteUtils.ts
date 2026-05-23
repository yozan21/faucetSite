import crypto from "crypto";

export const generateInviteCode = (): string =>
  crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars e.g. A3F9B21C

export const getInviteExpiry = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7 days from now
  return date;
};
