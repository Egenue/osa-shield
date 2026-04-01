import { getDatabaseState } from "../services/databaseStateService.js";

export async function healthController(_request, reply) {
  const database = getDatabaseState();
  const modelApi = process.env.OSA_MODEL_API?.trim() || null;
  const statusCode = database.ready ? 200 : 503;

  return reply.code(statusCode).send({
    status: database.ready ? "ok" : "degraded",
    service: "osa-shield-backend",
    database,
    modelApiConfigured: Boolean(modelApi),
  });
}
