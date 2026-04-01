import requireAuthentication from "../middleware/requireAuthentication.js";
import requireDatabaseReady from "../middleware/requireDatabaseReady.js";
import {
  loginController,
  logoutController,
  meController,
  registerController,
  verifyEmailController,
} from "../controllers/userController.js";
import { healthController } from "../controllers/systemController.js";
import {
  analyzeScamController,
  createScamReportController,
  getProfileActivityController,
  getReportedScamsController,
  voteOnScamController,
} from "../controllers/scamController.js";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function applyCorsHeaders(request, reply) {
  const origin = request.headers.origin;

  if (!origin) {
    reply.header("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.includes(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
  }

  reply.header("Access-Control-Allow-Credentials", "true");
  reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function routes(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    applyCorsHeaders(request, reply);
  });

  const preflightPaths = [
    "/health",
    "/auth/register",
    "/auth/verify-email",
    "/auth/login",
    "/auth/logout",
    "/auth/me",
    "/scams",
    "/scams/analyze",
    "/scams/report",
    "/scams/:scamId/vote",
    "/profile/activity",
  ];

  for (const path of preflightPaths) {
    fastify.options(path, async (request, reply) => {
      applyCorsHeaders(request, reply);
      return reply.code(204).send();
    });
  }

  fastify.get("/health", healthController);
  fastify.post(
    "/auth/register",
    {
      preHandler: requireDatabaseReady,
    },
    registerController
  );
  fastify.get(
    "/auth/verify-email",
    {
      preHandler: requireDatabaseReady,
    },
    verifyEmailController
  );
  fastify.post(
    "/auth/login",
    {
      preHandler: requireDatabaseReady,
    },
    loginController
  );
  fastify.post("/auth/logout", logoutController);
  fastify.get(
    "/auth/me",
    {
      preHandler: [requireDatabaseReady, requireAuthentication],
    },
    meController
  );

  fastify.get(
    "/scams",
    {
      preHandler: requireDatabaseReady,
    },
    getReportedScamsController
  );
  fastify.post(
    "/scams/analyze",
    {
      preHandler: [requireDatabaseReady, requireAuthentication],
    },
    analyzeScamController
  );
  fastify.post(
    "/scams/report",
    {
      preHandler: [requireDatabaseReady, requireAuthentication],
    },
    createScamReportController
  );
  fastify.post(
    "/scams/:scamId/vote",
    {
      preHandler: [requireDatabaseReady, requireAuthentication],
    },
    voteOnScamController
  );
  fastify.get(
    "/profile/activity",
    {
      preHandler: [requireDatabaseReady, requireAuthentication],
    },
    getProfileActivityController
  );
}
