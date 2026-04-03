/* @vitest-environment node */

import { describe, expect, it } from "vitest";
import { resolveSessionCookieConfig, resolveTrustProxy } from "../../backend/config/sessionConfig.js";

describe("session cookie config", () => {
  it("uses cross-site safe cookie defaults in production", () => {
    const config = resolveSessionCookieConfig({
      NODE_ENV: "production",
    });

    expect(config.sameSite).toBe("none");
    expect(config.secure).toBe("auto");
    expect(config.httpOnly).toBe(true);
  });

  it("uses local-friendly cookie defaults in development", () => {
    const config = resolveSessionCookieConfig({
      NODE_ENV: "development",
    });

    expect(config.sameSite).toBe("lax");
    expect(config.secure).toBe(false);
  });

  it("enables trustProxy by default in production", () => {
    expect(resolveTrustProxy({ NODE_ENV: "production" })).toBe(true);
    expect(resolveTrustProxy({ NODE_ENV: "development" })).toBe(false);
  });
});
