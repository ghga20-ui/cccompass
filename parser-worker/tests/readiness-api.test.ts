import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/ready.js";

function responseRecorder() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(statusCode: number) { this.statusCode = statusCode; return this; },
    json(body: unknown) { this.body = body; },
    setHeader(name: string, value: string) { this.headers[name] = value; },
  };
}

describe("Vercel readiness endpoint", () => {
  beforeEach(() => {
    vi.stubEnv("PARSER_ADAPTER", "mock");
    vi.stubEnv("RENDER_GIT_COMMIT", "");
    vi.stubEnv("GIT_COMMIT_SHA", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the same uncached readiness contract as the standalone server", async () => {
    const response = responseRecorder();
    await handler({ method: "GET" }, response);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, ready: true, adapter: "mock" });
    expect(response.headers["Cache-Control"]).toBe("no-store");
  });

  it("does not report readiness for a POST request", async () => {
    const response = responseRecorder();
    await handler({ method: "POST" }, response);
    expect(response.statusCode).toBe(404);
  });

  it("reports an unavailable adapter as 503", async () => {
    vi.stubEnv("PARSER_ADAPTER", "unknown");
    const response = responseRecorder();
    await handler({ method: "GET" }, response);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ ok: false, ready: false, error: "parser-not-ready" });
  });
});
