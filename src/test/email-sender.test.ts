/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolve4Mock = vi.fn();
const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({
  sendMail: sendMailMock,
}));

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

    process.env.EMAIL_USER = "sender@example.com";
    process.env.EMAIL_PASS = "app-password";
    process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.EMAIL_SMTP_PORT = "465";
    process.env.EMAIL_SMTP_SECURE = "true";
    process.env.EMAIL_SMTP_SERVERNAME = "smtp.gmail.com";
    process.env.EMAIL_PREFER_IPV4 = "true";
  });

  afterEach(() => {
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
});
