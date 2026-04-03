/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const updateConfirmEmail = vi.fn();
const createConfirmEmail = vi.fn();
const sendConfirmEmail = vi.fn();
const comparePassword = vi.fn();

vi.mock("../../backend/config/db.js", () => ({
  User: {
    findOne,
  },
  ConfirmEmail: {
    update: updateConfirmEmail,
    create: createConfirmEmail,
  },
}));

vi.mock("../../backend/data/emailSender.js", () => ({
  isEmailServiceConfigured: () => true,
  sendConfirmEmail,
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: comparePassword,
  },
}));

function createReply() {
  return {
    statusCode: 200,
    payload: null,
    code: vi.fn(function code(statusCode) {
      this.statusCode = statusCode;
      return this;
    }),
    send: vi.fn(function send(payload) {
      this.payload = payload;
      return this;
    }),
  };
}

describe("loginController", () => {
  beforeEach(() => {
    vi.resetModules();
    findOne.mockReset();
    updateConfirmEmail.mockReset();
    createConfirmEmail.mockReset();
    sendConfirmEmail.mockReset();
    comparePassword.mockReset();
  });

  it("reissues confirmation email for valid unverified logins without waiting on SMTP", async () => {
    findOne.mockResolvedValue({
      user_id: "user-123",
      email: "fresh@example.com",
      password: "hashed-password",
      is_verified: false,
    });
    comparePassword.mockResolvedValue(true);
    updateConfirmEmail.mockResolvedValue([0]);
    createConfirmEmail.mockResolvedValue({});
    sendConfirmEmail.mockImplementation(() => new Promise(() => {}));

    const { loginController } = await import("../../backend/controllers/userController.js");

    const reply = createReply();
    const request = {
      body: {
        identifier: "fresh@example.com",
        password: "secret123",
      },
      log: {
        error: vi.fn(),
      },
    };

    await expect(
      Promise.race([
        loginController(request, reply),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("loginController timed out")), 50);
        }),
      ])
    ).resolves.toBe(reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({
      message:
        "Email is not verified. A new confirmation email is being sent. Please verify your email first.",
    });
    expect(sendConfirmEmail).toHaveBeenCalledWith(
      "fresh@example.com",
      expect.stringContaining("/verification?token=")
    );
  });
});
