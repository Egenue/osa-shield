import { resolve4 } from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const connectionTimeoutMs = Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10000);
const greetingTimeoutMs = Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10000);
const socketTimeoutMs = Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 15000);
const emailApiTimeoutMs = Number(process.env.EMAIL_API_TIMEOUT_MS || 10000);
const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
const smtpSecure =
  String(process.env.EMAIL_SMTP_SECURE ?? (smtpPort === 465 ? "true" : "false")).toLowerCase() ===
  "true";
const smtpHostname = process.env.EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
const smtpServername = process.env.EMAIL_SMTP_SERVERNAME?.trim() || smtpHostname;
const smtpPreferIpv4 = String(process.env.EMAIL_PREFER_IPV4 ?? "true").toLowerCase() !== "false";
const resendApiBaseUrl = process.env.RESEND_API_BASE_URL?.trim() || "https://api.resend.com";
const gmailOauthTokenUrl =
  process.env.GMAIL_OAUTH_TOKEN_URL?.trim() || "https://oauth2.googleapis.com/token";
const gmailApiBaseUrl =
  process.env.GMAIL_API_BASE_URL?.trim() || "https://gmail.googleapis.com/gmail/v1";
const emailProvider = (process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "auto");
const emailUserAgent = process.env.EMAIL_USER_AGENT?.trim() || "osa-shield-email/1.0";

function getEmailCredentials() {
  return {
    emailUser: process.env.EMAIL_USER?.trim(),
    emailPass: process.env.EMAIL_PASS?.trim(),
  };
}

function getResendCredentials() {
  return {
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    emailFrom: process.env.EMAIL_FROM?.trim(),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
  };
}

function getGmailApiCredentials() {
  return {
    clientId: process.env.GMAIL_CLIENT_ID?.trim(),
    clientSecret: process.env.GMAIL_CLIENT_SECRET?.trim(),
    refreshToken: process.env.GMAIL_REFRESH_TOKEN?.trim(),
    userId: process.env.GMAIL_USER_ID?.trim() || "me",
    emailFrom: process.env.EMAIL_FROM?.trim() || process.env.EMAIL_USER?.trim() || null,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
  };
}

function getEffectiveProvider() {
  if (emailProvider === "auto") {
    if (getResendCredentials().resendApiKey) {
      return "resend";
    }

    if (getGmailApiCredentials().refreshToken) {
      return "gmail_api";
    }

    return "smtp";
  }

  return emailProvider;
}

function buildConfirmEmailMessage(recipientEmail, confirmLink) {
  const html = `
    <html>
      <body>
        <p>Hi,</p>
        <p>Please confirm your email to complete sign up.</p>
        <p><a href="${confirmLink}">Confirm Email</a></p>
      </body>
    </html>
  `;

  return {
    to: recipientEmail,
    subject: "Confirm your email",
    text: `Please confirm your email: ${confirmLink}`,
    html,
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

async function sendWithSmtp(message) {
  const { emailUser, emailPass } = getEmailCredentials();

  if (!emailUser || !emailPass) {
    throw new Error("SMTP email service not configured. Set EMAIL_USER and EMAIL_PASS.");
  }

  const host = await resolveSmtpHost();
  const transporter = buildTransporter(emailUser, emailPass, host);
  const emailFrom = getResendCredentials().emailFrom || `"OSA" <${emailUser}>`;

  await transporter.sendMail({
    from: emailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function parseErrorBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);

    if (data?.message) {
      return data.message;
    }

    if (data?.error?.message) {
      return data.error.message;
    }

    if (data?.name) {
      return data.name;
    }
  }

  const text = await response.text().catch(() => "");
  return text || `HTTP ${response.status}`;
}

function sanitizeHeaderValue(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMultipartMessage(message, emailFrom, replyTo) {
  const boundary = `osa-shield-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: ${sanitizeHeaderValue(emailFrom)}`,
    `To: ${sanitizeHeaderValue(message.to)}`,
    `Subject: ${sanitizeHeaderValue(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (replyTo) {
    headers.push(`Reply-To: ${sanitizeHeaderValue(replyTo)}`);
  }

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    message.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    message.html,
    `--${boundary}--`,
    "",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

async function sendWithResend(message) {
  const { resendApiKey, emailFrom, replyTo } = getResendCredentials();

  if (!resendApiKey || !emailFrom) {
    throw new Error("Resend email service not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  const response = await fetch(`${resendApiBaseUrl}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": emailUserAgent,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(replyTo ? { replyTo } : {}),
    }),
    signal: AbortSignal.timeout(emailApiTimeoutMs),
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new Error(`Resend API request failed: ${errorBody}`);
  }
}

async function getGmailAccessToken() {
  const { clientId, clientSecret, refreshToken } = getGmailApiCredentials();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN."
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(gmailOauthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": emailUserAgent,
    },
    body,
    signal: AbortSignal.timeout(emailApiTimeoutMs),
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new Error(`Google OAuth token request failed: ${errorBody}`);
  }

  const data = await response.json();

  if (!data?.access_token) {
    throw new Error("Google OAuth token request did not return an access token.");
  }

  return data.access_token;
}

async function sendWithGmailApi(message) {
  const { userId, emailFrom, replyTo } = getGmailApiCredentials();

  if (!emailFrom) {
    throw new Error("Gmail API sender is not configured. Set EMAIL_FROM or EMAIL_USER.");
  }

  const accessToken = await getGmailAccessToken();
  const rawMessage = encodeBase64Url(buildMultipartMessage(message, emailFrom, replyTo));
  const response = await fetch(
    `${gmailApiBaseUrl}/users/${encodeURIComponent(userId)}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": emailUserAgent,
      },
      body: JSON.stringify({
        raw: rawMessage,
      }),
      signal: AbortSignal.timeout(emailApiTimeoutMs),
    }
  );

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new Error(`Gmail API send failed: ${errorBody}`);
  }
}

export function isEmailServiceConfigured() {
  const provider = getEffectiveProvider();

  if (provider === "resend") {
    const { resendApiKey, emailFrom } = getResendCredentials();
    return Boolean(resendApiKey && emailFrom);
  }

  if (provider === "gmail_api") {
    const { clientId, clientSecret, refreshToken, emailFrom } = getGmailApiCredentials();
    return Boolean(clientId && clientSecret && refreshToken && emailFrom);
  }

  if (provider === "smtp") {
    const { emailUser, emailPass } = getEmailCredentials();
    return Boolean(emailUser && emailPass);
  }

  return false;
}

export async function sendConfirmEmail(recipientEmail, confirmLink) {
  const message = buildConfirmEmailMessage(recipientEmail, confirmLink);
  const provider = getEffectiveProvider();

  if (provider === "resend") {
    await sendWithResend(message);
    return;
  }

  if (provider === "gmail_api") {
    await sendWithGmailApi(message);
    return;
  }

  if (provider === "smtp") {
    await sendWithSmtp(message);
    return;
  }

  throw new Error(`Unsupported email provider: ${provider}`);
}
