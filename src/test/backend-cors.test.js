/* @vitest-environment node */

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import routes from "../../backend/routes/routes.js";

const originalCorsOrigins = process.env.CORS_ORIGINS;

afterEach(() => {
  if (originalCorsOrigins === undefined) {
    delete process.env.CORS_ORIGINS;
    return;
  }

  process.env.CORS_ORIGINS = originalCorsOrigins;
});

describe("backend CORS handling", () => {
  it("allows the configured Pages origin on register preflight requests", async () => {
    process.env.CORS_ORIGINS = "https://osa-shield.pages.dev/";

    const app = Fastify();
    await app.register(routes, { prefix: "/" });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/register",
      headers: {
        origin: "https://osa-shield.pages.dev",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://osa-shield.pages.dev");
    expect(response.headers["access-control-allow-headers"]).toBe("content-type");
    expect(response.headers.vary).toBe("Origin");

    await app.close();
  });
});

