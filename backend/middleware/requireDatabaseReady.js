import { getDatabaseState, isDatabaseReady } from "../services/databaseStateService.js";

export default async function requireDatabaseReady(_request, reply) {
  if (isDatabaseReady()) {
    return;
  }

  const databaseState = getDatabaseState();

  return reply.code(503).send({
    message:
      "Database is currently unavailable. Check DATABASE_URL/network access and try again.",
    database: databaseState,
  });
}
