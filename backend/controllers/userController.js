import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { ConfirmEmail, User } from "../config/db.js";
import { isEmailServiceConfigured, sendConfirmEmail } from "../data/emailSender.js";
import { ensureSessionLocation, getSessionLocationLabel } from "../services/sessionLocationService.js";
import { getUserSummary } from "../services/userMetricsService.js";

const VERIFICATION_TTL_MINUTES = Number(process.env.VERIFICATION_TTL_MINUTES || 45);

async function toPublicUser(user, request) {
  const summary = await getUserSummary(user.user_id);

  return {
    id: user.user_id,
    name: user.name,
    email: user.email,
    role: "user",
    trustScore: summary.trustScore,
    totalScans: summary.totalScans,
    totalReports: summary.totalReports,
    location: getSessionLocationLabel(request),
  };
}

function buildConfirmLink(token) {
  const fallback = "http://localhost:8080/verification";
  const configured = process.env.CONFIRM_LINK?.trim() || fallback;

  let confirmUrl;
  try {
    confirmUrl = new URL(configured);
  } catch {
    confirmUrl = new URL(fallback);
  }

  if (!confirmUrl.pathname || confirmUrl.pathname === "/") {
    confirmUrl.pathname = "/verification";
  }

  confirmUrl.searchParams.set("token", token);
  return confirmUrl.toString();
}

function buildVerificationExpiryDate() {
  return new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);
}

async function createFreshVerificationToken(userId) {
  await ConfirmEmail.update(
    { used: true },
    {
      where: {
        user_id: userId,
        used: false,
      },
    }
  );

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = buildVerificationExpiryDate();

  await ConfirmEmail.create({
    user_id: userId,
    token,
    expires_at: expiresAt,
    used: false,
  });

  return token;
}

function queueConfirmationEmail(request, recipientEmail, confirmLink) {
  void sendConfirmEmail(recipientEmail, confirmLink).catch((error) => {
    if (request?.log?.error) {
      request.log.error(
        { err: error, recipientEmail },
        "Failed to send confirmation email after registration"
      );
      return;
    }

    console.error("Failed to send confirmation email after registration", error);
  });
}

export const registerController = async (request, reply) => {
  try {
    const { name, email, password } = request.body ?? {};

    if (!name || !email || !password) {
      return reply.code(400).send({ message: "All fields are required" });
    }

    if (!isEmailServiceConfigured()) {
      return reply
        .code(500)
        .send({ message: "Email service not configured. Set EMAIL_USER and EMAIL_PASS." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedName = String(name).trim();

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.is_verified) {
        return reply.code(400).send({ message: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await existingUser.update({
        name: normalizedName,
        password: hashedPassword,
      });

      const token = await createFreshVerificationToken(existingUser.user_id);
      const confirmLink = buildConfirmLink(token);
      queueConfirmationEmail(request, existingUser.email, confirmLink);

      return reply.code(200).send({
        message:
          "Account exists but is not verified. A new confirmation email is being sent.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = await createFreshVerificationToken(newUser.user_id);
    const confirmLink = buildConfirmLink(token);
    queueConfirmationEmail(request, newUser.email, confirmLink);

    return reply.code(201).send({
      message:
        "Account created successfully. Please confirm your email when the verification message arrives.",
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("Email service not configured")) {
      return reply.code(500).send({ message: error.message });
    }
    return reply.code(500).send({ message: "Internal server error" });
  }
};

export const verifyEmailController = async (request, reply) => {
  try {
    const { token } = request.query ?? {};

    if (!token) {
      return reply.code(400).send({ message: "Verification token is required" });
    }

    const confirmRecord = await ConfirmEmail.findOne({
      where: {
        token,
        used: false,
      },
    });

    if (!confirmRecord) {
      return reply.code(400).send({
        message: "Invalid or already used token",
      });
    }

    if (new Date(confirmRecord.expires_at) < new Date()) {
      return reply.code(400).send({
        message: "Token has expired. Please register again to receive a new link.",
      });
    }

    const user = await User.findByPk(confirmRecord.user_id);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    await user.update({ is_verified: true });
    await confirmRecord.update({ used: true });

    return reply.code(200).send({ message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  }
};

export const loginController = async (request, reply) => {
  try {
    const { identifier, email, password } = request.body ?? {};
    const loginIdentifier = String(identifier ?? email ?? "").toLowerCase().trim();

    if (!loginIdentifier || !password) {
      return reply.code(400).send({ message: "Email and password are required" });
    }

    const user = await User.findOne({
      where: { email: loginIdentifier },
    });

    if (!user) {
      return reply.code(400).send({ message: "Invalid login credentials" });
    }

    const passwordOK = await bcrypt.compare(password, user.password);
    if (!passwordOK) {
      return reply.code(400).send({ message: "Invalid login credentials" });
    }

    if (!user.is_verified) {
      return reply.code(403).send({
        message: "Email is not verified. Please verify your email first.",
      });
    }

    request.session.userId = user.user_id;
    request.session.userRole = "user";
    ensureSessionLocation(request);

    return reply.code(200).send({
      message: "Login successful",
      user: await toPublicUser(user, request),
    });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  }
};

export const meController = async (request, reply) => {
  try {
    const userId = request.session?.userId;

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    ensureSessionLocation(request);

    return reply.code(200).send({
      user: await toPublicUser(user, request),
    });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  }
};

export const logoutController = async (request, reply) => {
  try {
    if (!request.session) {
      return reply.code(200).send({ message: "Logged out successfully" });
    }

    return await new Promise((resolve) => {
      request.session.destroy((error) => {
        if (error) {
          console.error(error);
          resolve(reply.code(500).send({ message: "Could not log out" }));
          return;
        }

        reply.clearCookie("sessionId", { path: "/" });
        resolve(reply.code(200).send({ message: "Logged out successfully" }));
      });
    });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  }
};
