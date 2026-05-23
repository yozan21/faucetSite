import axios from "axios";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

export const verifyCaptcha = async (
  token: string,
  ip?: string,
): Promise<boolean> => {
  try {
    const { data } = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip && { remoteip: ip }), // optional but recommended
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      },
    );

    return data.success === true;
  } catch (err) {
    logger.error({ err }, "Turnstile verification failed");
    return false; // fail closed — if Cloudflare is down, reject
  }
};
