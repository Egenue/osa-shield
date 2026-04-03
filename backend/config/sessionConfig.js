function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

export function resolveTrustProxy(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  return parseBoolean(env.TRUST_PROXY, isProduction);
}

export function resolveSessionCookieConfig(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const crossSiteSession = parseBoolean(env.CROSS_SITE_SESSION, isProduction);
  const secureSetting = env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  const sameSiteSetting = env.SESSION_COOKIE_SAMESITE?.trim().toLowerCase();

  return {
    path: "/",
    httpOnly: true,
    sameSite: sameSiteSetting || (crossSiteSession ? "none" : "lax"),
    secure:
      secureSetting === "true"
        ? true
        : secureSetting === "false"
          ? false
          : secureSetting === "auto"
            ? "auto"
            : isProduction
              ? "auto"
              : false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
