const databaseState = {
  ready: false,
  lastError: null,
  lastCheckedAt: null,
};

function formatErrorMessage(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export function markDatabaseConnected() {
  databaseState.ready = true;
  databaseState.lastError = null;
  databaseState.lastCheckedAt = new Date().toISOString();
}

export function markDatabaseDisconnected(error) {
  databaseState.ready = false;
  databaseState.lastError = formatErrorMessage(error);
  databaseState.lastCheckedAt = new Date().toISOString();
}

export function isDatabaseReady() {
  return databaseState.ready;
}

export function getDatabaseState() {
  return {
    ready: databaseState.ready,
    lastError: databaseState.lastError,
    lastCheckedAt: databaseState.lastCheckedAt,
  };
}
