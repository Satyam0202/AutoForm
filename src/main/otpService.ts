import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";

type OtpRecord = {
  code: string;
  expiresAt: number;
};

const otpRecords = new Map<string, OtpRecord>();
const otpLifetimeMs = 5 * 60 * 1000;

function getTransporter() {
  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_APP_PASSWORD;

  if (!email || !password) {
    throw new Error("Email OTP is not configured. Add SMTP_EMAIL and SMTP_APP_PASSWORD to .env.");
  }

  return {
    email,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    }),
  };
}

export async function sendPasswordOtp(email: string) {
  const recipient = email.trim().toLowerCase();

  if (!recipient || !recipient.includes("@")) {
    throw new Error("Enter a valid recovery email address.");
  }

  const code = randomInt(100000, 1000000).toString();
  const { email: sender, transporter } = getTransporter();

  await transporter.sendMail({
    from: `AutoForm AI <${sender}>`,
    to: recipient,
    subject: "AutoForm AI password reset OTP",
    text: `Your AutoForm AI password reset OTP is ${code}. It expires in 5 minutes.`,
  });

  otpRecords.set(recipient, { code, expiresAt: Date.now() + otpLifetimeMs });
}

export function verifyPasswordOtp(email: string, code: string) {
  const recipient = email.trim().toLowerCase();
  const record = otpRecords.get(recipient);

  if (!record || record.expiresAt < Date.now()) {
    otpRecords.delete(recipient);
    throw new Error("OTP has expired. Send a new OTP.");
  }

  if (record.code !== code.trim()) {
    throw new Error("Incorrect OTP.");
  }

  otpRecords.delete(recipient);
}
