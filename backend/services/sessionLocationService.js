const UNKNOWN_LOCATION = "Unknown location";

function firstHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sanitizeHeaderValue(value) {
  if (!value) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function cleanUnknown(value) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  if (["unknown", "xx", "local", "localhost"].includes(lowered)) {
    return null;
  }

  return normalized;
}

function buildLocationLabel(city, region, country) {
  return [city, region, country].filter(Boolean).join(", ");
}

export function extractLocationFromRequest(request) {
  const headers = request.headers ?? {};

  const city = cleanUnknown(
    sanitizeHeaderValue(
      firstHeaderValue(headers["x-vercel-ip-city"]) ??
        firstHeaderValue(headers["x-appengine-city"])
    )
  );

  const region = cleanUnknown(
    sanitizeHeaderValue(
      firstHeaderValue(headers["x-vercel-ip-country-region"]) ??
        firstHeaderValue(headers["x-appengine-region"])
    )
  );

  const country = cleanUnknown(
    sanitizeHeaderValue(
      firstHeaderValue(headers["x-vercel-ip-country"]) ??
        firstHeaderValue(headers["cf-ipcountry"]) ??
        firstHeaderValue(headers["x-appengine-country"])
    )
  );

  const forwardedFor = sanitizeHeaderValue(firstHeaderValue(headers["x-forwarded-for"]));
  const ipAddress = cleanUnknown(forwardedFor?.split(",")[0]?.trim() || request.ip || null);
  const label = buildLocationLabel(city, region, country) || UNKNOWN_LOCATION;

  return {
    city,
    region,
    country,
    ipAddress,
    label,
  };
}

export function ensureSessionLocation(request) {
  if (!request.session) {
    return extractLocationFromRequest(request);
  }

  const existingLocation = request.session.userLocation;
  const extractedLocation = extractLocationFromRequest(request);

  if (
    !existingLocation ||
    existingLocation.label === UNKNOWN_LOCATION ||
    extractedLocation.label !== UNKNOWN_LOCATION
  ) {
    request.session.userLocation = extractedLocation;
  }

  return request.session.userLocation;
}

export function getSessionLocationLabel(request) {
  return request.session?.userLocation?.label ?? extractLocationFromRequest(request).label ?? null;
}
