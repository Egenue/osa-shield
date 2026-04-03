/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const createUser = vi.fn();
const updateConfirmEmail = vi.fn();
const createConfirmEmail = vi.fn();
const sendConfirmEmail = vi.fn();
const hashPassword = vi.fn();

vi.mock("../../backend/config/db.js", () => ({
  User: {
    findOne,
    create: createUser,
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
    hash: hashPassword,
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

describe("registerController", () => {
  beforeEach(() => {
    vi.resetModules();
    findOne.mockReset();
    createUser.mockReset();
    updateConfirmEmail.mockReset();
    createConfirmEmail.mockReset();
    sendConfirmEmail.mockReset();
    hashPassword.mockReset();
  });

  it("does not wait for confirmation email delivery before replying", async () => {
    findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    createUser.mockResolvedValue({
      user_id: "user-123",
      email: "fresh@example.com",
    });
    updateConfirmEmail.mockResolvedValue([0]);
    createConfirmEmail.mockResolvedValue({});
    sendConfirmEmail.mockImplementation(() => new Promise(() => {}));

    const { registerController } = await import("../../backend/controllers/userController.js");

    const reply = createReply();
    const request = {
      body: {
        name: "Test",
        email: "fresh@example.com",
        password: "secret123",
      },
      log: {
        error: vi.fn(),
      },
    };

    await expect(
      Promise.race([
        registerController(request, reply),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("registerController timed out")), 50);
        }),
      ])
    ).resolves.toBe(reply);

    expect(reply.statusCode).toBe(201);
    expect(reply.payload).toEqual({
      message:
        "Account created successfully. Please confirm your email when the verification message arrives.",
    });
    expect(sendConfirmEmail).toHaveBeenCalledWith(
      "fresh@example.com",
      expect.stringContaining("/verification?token=")
    );
  });
});
