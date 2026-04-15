import requireAuthentication from "../middleware/requireAuthentication.js";
import requireDatabaseReady from "../middleware/requireDatabaseReady.js";
import {
  loginController,
  logoutController,
  meController,
  registerController,
  verifyEmailController,
  sendResetPasswordController,
  resetPasswordPasswordController
} from "../controllers/userController.js";
import { healthController } from "../controllers/systemController.js";
import {
  analyzeScamController,
  createScamReportController,
  getProfileActivityController,
  getReportedScamsController,
  voteOnScamController,
} from "../controllers/scamController.js";
import { createThreadController,
  getCreatedThreadsController,
  createThreadCommentController,
  getThreadCommentController,
  threadLikesController,
  threadLikeAndDislikesCountsController,
  getThreadCommentsCountController
 } from "../controllers/threadController.js";
import fastify from "fastify";

const DEFAULT_ALLOWED_ORIGINS = "http://localhost:8080,http://localhost:8081,http://localhost:5173";

function normalizeOrigin(value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue === "*") {
    return trimmedValue;
  }

  try {
    return new URL(trimmedValue).origin;
  } catch {
    return trimmedValue.replace(/\/+$/, "");
  }
}

function getAllowedOrigins() {
  return (process.env.CORS_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function applyCorsHeaders(request, reply) {
  const origin = normalizeOrigin(request.headers.origin);
  const allowedOrigins = getAllowedOrigins();
  const requestedHeaders = request.headers["access-control-request-headers"];

  if (!origin) {
    reply.header("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.includes("*")) {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
  } else if (allowedOrigins.includes(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
  }

  reply.header("Access-Control-Allow-Credentials", "true");
  reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  reply.header(
    "Access-Control-Allow-Headers",
    requestedHeaders || "Content-Type, Authorization"
  );
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
    "/thread",
    "/created-threads",
    "/thread/:threadId/comment",
    "/thread/:threadId/comments",
    "/thread/:threadId/thread-likes",
    "/thread/:threadId/votes/count",
    "/thread/:threadId/comments/count",
    "/send-reset-email",
    "/resetPassword"
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

  fastify.post(
    "/thread",{
      preHandler: [requireDatabaseReady, requireAuthentication]
    },
    createThreadController
  );

  fastify.get(
    "/created-threads",{
      preHandler: [requireDatabaseReady]
    },
    getCreatedThreadsController
  )

  fastify.post(
  "/thread/:threadId/comment",
  {
    preHandler: [requireDatabaseReady, requireAuthentication]
  },
  createThreadCommentController
)
fastify.get(
  "/thread/:threadId/comments",
  {
    preHandler: [requireDatabaseReady]
  },
  getThreadCommentController
)
fastify.post(
  "/thread/:threadId/thread-likes",
  {
    preHandler: [requireAuthentication]
  },
  threadLikesController
)
fastify.get(
  "/thread/:threadId/votes/count",
  {
    preHandler: [requireDatabaseReady]
  },
  threadLikeAndDislikesCountsController
)

fastify.get(
  "/thread/:threadId/comments/count",
  {
    preHandler: [requireDatabaseReady]
  },
  getThreadCommentsCountController
)
fastify.post(
  "/send-reset-email",
  {
    preHandler: [requireDatabaseReady]
  },
  sendResetPasswordController
)
fastify.post(
  "/resetPassword",
  {
    preHandler: [requireDatabaseReady]
  },
  resetPasswordPasswordController
)

};

