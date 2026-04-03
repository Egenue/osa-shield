/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolve4Mock = vi.fn();
const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({
  sendMail: sendMailMock,
}));
const fetchMock = vi.fn();

vi.mock("node:dns/promises", () => ({
  resolve4: resolve4Mock,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

const originalEnv = {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
  EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT,
  EMAIL_SMTP_SECURE: process.env.EMAIL_SMTP_SECURE,
  EMAIL_SMTP_SERVERNAME: process.env.EMAIL_SMTP_SERVERNAME,
  EMAIL_PREFER_IPV4: process.env.EMAIL_PREFER_IPV4,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_API_BASE_URL: process.env.RESEND_API_BASE_URL,
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
  GMAIL_USER_ID: process.env.GMAIL_USER_ID,
  GMAIL_OAUTH_TOKEN_URL: process.env.GMAIL_OAUTH_TOKEN_URL,
  GMAIL_API_BASE_URL: process.env.GMAIL_API_BASE_URL,
  EMAIL_API_TIMEOUT_MS: process.env.EMAIL_API_TIMEOUT_MS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

describe("sendConfirmEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    resolve4Mock.mockReset();
    sendMailMock.mockReset();
    createTransportMock.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

    process.env.EMAIL_USER = "sender@example.com";
    process.env.EMAIL_PASS = "app-password";
    process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.EMAIL_SMTP_PORT = "465";
    process.env.EMAIL_SMTP_SECURE = "true";
    process.env.EMAIL_SMTP_SERVERNAME = "smtp.gmail.com";
    process.env.EMAIL_PREFER_IPV4 = "true";
    process.env.EMAIL_PROVIDER = "smtp";
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_REPLY_TO;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_BASE_URL;
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    delete process.env.GMAIL_USER_ID;
    delete process.env.GMAIL_OAUTH_TOKEN_URL;
    delete process.env.GMAIL_API_BASE_URL;
    delete process.env.EMAIL_API_TIMEOUT_MS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnv();
  });

  it("prefers an IPv4 SMTP connection host while keeping the TLS servername", async () => {
    resolve4Mock.mockResolvedValue(["74.125.201.108"]);
    sendMailMock.mockResolvedValue({});

    const { sendConfirmEmail } = await import("../../backend/data/emailSender.js");

    await sendConfirmEmail("recipient@example.com", "https://osa-shield.pages.dev/verification?x=1");

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "74.125.201.108",
        port: 465,
        secure: true,
        tls: expect.objectContaining({
          servername: "smtp.gmail.com",
        }),
      })
    );
    expect(sendMailMock).toHaveBeenCalled();
  });

  it("uses Resend automatically when an API key is configured", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "OSA <onboarding@example.com>";
    process.env.EMAIL_REPLY_TO = "support@example.com";
    process.env.RESEND_API_BASE_URL = "https://api.resend.com";
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({
        "content-type": "application/json",
      }),
      json: vi.fn().mockResolvedValue({ id: "email_123" }),
    });

    const { sendConfirmEmail } = await import("../../backend/data/emailSender.js");

    await sendConfirmEmail("recipient@example.com", "https://osa-shield.pages.dev/verification?x=1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_123",
          "Content-Type": "application/json",
        }),
      })
    );
    expect(createTransportMock).not.toHaveBeenCalled();

    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload).toEqual(
      expect.objectContaining({
        from: "OSA <onboarding@example.com>",
        to: ["recipient@example.com"],
        replyTo: "support@example.com",
      })
    );
  });

  it("uses Gmail API automatically when refresh-token credentials are configured", async () => {
    process.env.EMAIL_PROVIDER = "gmail_api";
    process.env.GMAIL_CLIENT_ID = "gmail-client-id";
    process.env.GMAIL_CLIENT_SECRET = "gmail-client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "gmail-refresh-token";
    process.env.GMAIL_USER_ID = "me";
    process.env.GMAIL_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
    process.env.GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1";
    process.env.EMAIL_FROM = "OSA <sender@gmail.com>";
    process.env.EMAIL_REPLY_TO = "sender@gmail.com";

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          "content-type": "application/json",
        }),
        json: vi.fn().mockResolvedValue({
          access_token: "google-access-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          "content-type": "application/json",
        }),
        json: vi.fn().mockResolvedValue({
          id: "gmail-message-id",
        }),
      });

    const { sendConfirmEmail } = await import("../../backend/data/emailSender.js");

    await sendConfirmEmail("recipient@example.com", "https://osa-shield.pages.dev/verification?x=1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer google-access-token",
          "Content-Type": "application/json",
        }),
      })
    );

    const [, tokenOptions] = fetchMock.mock.calls[0];
    expect(String(tokenOptions.body)).toContain("grant_type=refresh_token");

    const [, gmailOptions] = fetchMock.mock.calls[1];
    const payload = JSON.parse(gmailOptions.body);
    expect(payload.raw).toEqual(expect.any(String));
    expect(payload.raw.length).toBeGreaterThan(20);
    expect(createTransportMock).not.toHaveBeenCalled();
  });
});
