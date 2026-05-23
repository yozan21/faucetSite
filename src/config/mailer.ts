import nodemailer from "nodemailer";
import { env } from "./env.js";

const isDev = env.MAIL_ENV === "development";

const transporter = nodemailer.createTransport({
  host: isDev ? env.MAILTRAP_HOST : env.BREVO_HOST,
  port: isDev ? Number(env.MAILTRAP_PORT) : Number(env.BREVO_PORT),
  secure: false,
  auth: {
    user: isDev ? env.MAILTRAP_USER : env.BREVO_USER,
    pass: isDev ? env.MAILTRAP_PASS : env.BREVO_PASS,
  },
});

export default transporter;
