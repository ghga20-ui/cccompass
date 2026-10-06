import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "kordoc";
import { handleParserRequest } from "../src/handler.js";

const request = { method: "GET", path: "/ready", headers: {}, bodyText: "" };
const notReady = { status: 503, body: { ok: false, ready: false, error: "parser-not-ready" } };

describe("parser readiness", () => {
  beforeEach(() => {
    vi.stubEnv("PARSER_ADAPTER", "mock");
    vi.stubEnv("PARSER_COMMAND_TIMEOUT_MS", undefined);
    vi.stubEnv("RENDER_GIT_COMMIT", "");
    vi.stubEnv("GIT_COMMIT_SHA", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports the loaded mock adapter without claiming a parser version", async () => {
    expect(await handleParserRequest(request)).toEqual({
      status: 200,
      body: { ok: true, ready: true, adapter: "mock" },
    });
  });

  it("loads Kordoc and its PDF engine and reports the actual library version", async () => {
    vi.stubEnv("PARSER_ADAPTER", "kordoc");
    expect(await handleParserRequest(request)).toEqual({
      status: 200,
      body: { ok: true, ready: true, adapter: "kordoc", parserVersion: VERSION },
    });
  });

  it("returns a generic failure for an unsupported adapter while liveness stays healthy", async () => {
    vi.stubEnv("PARSER_ADAPTER", "unsupported-sensitive-value");
    expect(await handleParserRequest(request)).toEqual(notReady);
    expect(await handleParserRequest({ ...request, path: "/health" })).toEqual({
      status: 200, body: { ok: true },
    });
  });

  it.each([undefined, "", "   "])("rejects a command adapter with missing command %j", async (command) => {
    vi.stubEnv("PARSER_ADAPTER", "command");
    vi.stubEnv("PARSER_COMMAND", command);
    expect(await handleParserRequest(request)).toEqual(notReady);
  });

  it("only validates command configuration without executing a command or exposing it", async () => {
    vi.stubEnv("PARSER_ADAPTER", "command");
    vi.stubEnv("PARSER_COMMAND", "must-not-execute-readiness-command");
    expect(await handleParserRequest(request)).toEqual({
      status: 200,
      body: { ok: true, ready: true, adapter: "command" },
    });
  });

  it.each(["NaN", "0", "-1", "Infinity"])("rejects invalid command timeout %s", async (timeout) => {
    vi.stubEnv("PARSER_ADAPTER", "command");
    vi.stubEnv("PARSER_COMMAND", "must-not-execute-readiness-command");
    vi.stubEnv("PARSER_COMMAND_TIMEOUT_MS", timeout);
    expect(await handleParserRequest(request)).toEqual(notReady);
  });

  it("returns only an allowlisted commit identity, preferring Render's commit", async () => {
    const build = "a".repeat(40);
    vi.stubEnv("RENDER_GIT_COMMIT", build);
    vi.stubEnv("GIT_COMMIT_SHA", "b".repeat(40));
    vi.stubEnv("PARSER_SERVICE_TOKEN", "sensitive-token");
    expect(await handleParserRequest(request)).toEqual({
      status: 200,
      body: { ok: true, ready: true, adapter: "mock", build },
    });
  });

  it("omits non-SHA environment values instead of exposing them", async () => {
    vi.stubEnv("RENDER_GIT_COMMIT", "sensitive-non-commit-value");
    vi.stubEnv("GIT_COMMIT_SHA", "another-sensitive-value");
    expect(await handleParserRequest(request)).toEqual({
      status: 200,
      body: { ok: true, ready: true, adapter: "mock" },
    });
  });

  it("falls back to a valid GIT_COMMIT_SHA", async () => {
    const build = "b".repeat(40);
    vi.stubEnv("RENDER_GIT_COMMIT", "invalid");
    vi.stubEnv("GIT_COMMIT_SHA", build);
    expect((await handleParserRequest(request)).body).toEqual({
      ok: true, ready: true, adapter: "mock", build,
    });
  });
});
