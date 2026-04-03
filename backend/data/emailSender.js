import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const connectionTimeoutMs = Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10000);
const greetingTimeoutMs = Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10000);
const socketTimeoutMs = Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000);

function getEmailCredentials() {
  return {
    emailUser: process.env.EMAIL_USER?.trim(),
    emailPass: process.env.EMAIL_PASS?.trim(),
  };
}

function buildTransporter(emailUser, emailPass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: connectionTimeoutMs,
    greetingTimeout: greetingTimeoutMs,
    socketTimeout: socketTimeoutMs,
  });
}

export function isEmailServiceConfigured() {
  const { emailUser, emailPass } = getEmailCredentials();
  return Boolean(emailUser && emailPass);
}

export async function sendConfirmEmail(recipientEmail, confirmLink) {
  const { emailUser, emailPass } = getEmailCredentials();

  if (!emailUser || !emailPass) {
    throw new Error("Email service not configured. Set EMAIL_USER and EMAIL_PASS.");
  }

  const transporter = buildTransporter(emailUser, emailPass);

  const html = `
    <html>
      <body>
        <p>Hi,</p>
        <p>Please confirm your email to complete sign up.</p>
        <p><a href="${confirmLink}">Confirm Email</a></p>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"OSA" <${emailUser}>`,
    to: recipientEmail,
    subject: "Confirm your email",
    text: `Please confirm your email: ${confirmLink}`,
    html,
  });
}
