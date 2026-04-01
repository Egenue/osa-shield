const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_TIMEOUT_MS = Number(process.env.OSA_MODEL_TIMEOUT_MS || 15000);

function buildModelEndpoint() {
  const configuredBase = process.env.OSA_MODEL_API?.trim();

  if (!configuredBase) {
    return null;
  }

  if (configuredBase.endsWith("/predict_email")) {
    return configuredBase;
  }

  return `${configuredBase.replace(/\/+$/, "")}/predict_email`;
}

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeTrigger(trigger) {
  return {
    key: String(trigger?.key ?? ""),
    label: String(trigger?.label ?? "Signal"),
    icon: String(trigger?.icon ?? "⚠️"),
    description: String(trigger?.description ?? ""),
    matches: Array.isArray(trigger?.matches)
      ? trigger.matches
          .map((match) => String(match ?? "").trim())
          .filter(Boolean)
      : [],
  };
}

export async function analyzeMessageWithOsaModel(message) {
  const endpoint = buildModelEndpoint();

  if (!endpoint) {
    throw createServiceError(
      "OSA model API is not configured. Set OSA_MODEL_API in the backend environment.",
      503
    );
  }

  const normalizedMessage = String(message ?? "").trim();
  if (!normalizedMessage) {
    throw createServiceError("A message is required for analysis.", 400);
  }

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: normalizedMessage,
      }),
      signal: abortController.signal,
    });

    const rawBody = await response.text();
    let payload = {};

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      throw createServiceError(
        payload?.message || `Model API request failed with status ${response.status}.`,
        502
      );
    }

    const spamProbability = Number(payload?.spam_probability ?? 0);
    const threshold = Number(payload?.threshold ?? DEFAULT_THRESHOLD);
    const prediction = String(payload?.prediction ?? "ham").toLowerCase();
    const triggers = Array.isArray(payload?.triggers)
      ? payload.triggers.map(normalizeTrigger)
      : [];
    const explanation = String(payload?.explanation ?? "").trim();
    const isScam = prediction === "spam" || spamProbability >= threshold;

    return {
      prediction,
      spamProbability,
      threshold,
      triggers,
      explanation,
      isScam,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw createServiceError("Timed out while waiting for the OSA model API.", 504);
    }

    if (typeof error.statusCode === "number") {
      throw error;
    }

    throw createServiceError(
      "Could not reach the OSA model API. Check OSA_MODEL_API and the FastAPI service.",
      502
    );
  } finally {
    clearTimeout(timeoutHandle);
  }
}
