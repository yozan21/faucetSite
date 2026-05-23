import transporter from "../config/mailer.js";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async (options: MailOptions) => {
  try {
    await transporter.sendMail({
      from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_EMAIL}>`,
      ...options,
    });
  } catch (err) {
    // never crash the app on mail failure — log and continue
    logger.error({ err }, "Failed to send email");
  }
};
