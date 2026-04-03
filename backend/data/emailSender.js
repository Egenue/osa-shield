import { resolve4 } from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const connectionTimeoutMs = Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10000);
const greetingTimeoutMs = Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10000);
const socketTimeoutMs = Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000);
const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
const smtpSecure =
  String(process.env.EMAIL_SMTP_SECURE ?? (smtpPort === 465 ? "true" : "false")).toLowerCase() ===
  "true";
const smtpHostname = process.env.EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
const smtpServername = process.env.EMAIL_SMTP_SERVERNAME?.trim() || smtpHostname;
const smtpPreferIpv4 = String(process.env.EMAIL_PREFER_IPV4 ?? "true").toLowerCase() !== "false";

function getEmailCredentials() {
  return {
    emailUser: process.env.EMAIL_USER?.trim(),
    emailPass: process.env.EMAIL_PASS?.trim(),
  };
}

async function resolveSmtpHost() {
  if (!smtpPreferIpv4 || net.isIP(smtpHostname)) {
    return smtpHostname;
  }

  try {
    const addresses = await resolve4(smtpHostname);
    return addresses[0] || smtpHostname;
  } catch {
    return smtpHostname;
  }
}

function buildTransporter(emailUser, emailPass, host) {
  return nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: connectionTimeoutMs,
    greetingTimeout: greetingTimeoutMs,
    socketTimeout: socketTimeoutMs,
    tls: {
      servername: smtpServername,
    },
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

  const host = await resolveSmtpHost();
  const transporter = buildTransporter(emailUser, emailPass, host);

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
