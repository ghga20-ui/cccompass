import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const request = { method: "GET", path: "/ready", headers: {}, bodyText: "" };
const notReady = { status: 503, body: { ok: false, ready: false, error: "parser-not-ready" } };

describe("parser readiness failures", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("PARSER_ADAPTER", "kordoc");
  });

  afterEach(() => {
    vi.doUnmock("kordoc");
    vi.doUnmock("pdfjs-dist/legacy/build/pdf.mjs");
    vi.doUnmock("pdfjs-dist/legacy/build/pdf.worker.mjs");
    vi.doUnmock("../src/adapters/index.js");
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns only a generic failure when the selected adapter cannot import", async () => {
    vi.doMock("kordoc", () => { throw new Error("fake-private-import-detail"); });
    const { handleParserRequest } = await import("../src/handler.js");
    expect(await handleParserRequest(request)).toEqual(notReady);
    expect(await handleParserRequest({ ...request, path: "/health" })).toEqual({
      status: 200, body: { ok: true },
    });
  });

  it.each(["pdfjs-dist/legacy/build/pdf.mjs", "pdfjs-dist/legacy/build/pdf.worker.mjs"])(
    "returns not-ready when the PDF dependency %s cannot import",
    async (dependency) => {
      vi.doMock(dependency, () => { throw new Error("fake-private-dependency-detail"); });
      const { handleParserRequest } = await import("../src/handler.js");
      expect(await handleParserRequest(request)).toEqual(notReady);
    },
  );

  it("rejects a loaded library without a usable VERSION", async () => {
    vi.doMock("kordoc", async (importOriginal) => ({
      ...await importOriginal<typeof import("kordoc")>(), VERSION: undefined,
    }));
    const { handleParserRequest } = await import("../src/handler.js");
    expect(await handleParserRequest(request)).toEqual(notReady);
  });

  it("rejects a PDF engine that imports but lacks its document loader", async () => {
    vi.doMock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ getDocument: undefined }));
    const { handleParserRequest } = await import("../src/handler.js");
    expect(await handleParserRequest(request)).toEqual(notReady);
  });

  it("rejects a PDF worker that imports but lacks its message handler", async () => {
    vi.doMock("pdfjs-dist/legacy/build/pdf.worker.mjs", () => ({ WorkerMessageHandler: undefined }));
    const { handleParserRequest } = await import("../src/handler.js");
    expect(await handleParserRequest(request)).toEqual(notReady);
  });

  it("does not parse a document or start PDF work while checking readiness", async () => {
    vi.doMock("kordoc", async (importOriginal) => ({
      ...await importOriginal<typeof import("kordoc")>(),
      parse: () => { throw new Error("Parsing must not run during readiness."); },
    }));
    vi.doMock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
      getDocument: () => { throw new Error("PDF work must not run during readiness."); },
    }));
    vi.doMock("pdfjs-dist/legacy/build/pdf.worker.mjs", () => ({
      WorkerMessageHandler: { setup: () => { throw new Error("Worker must not start during readiness."); } },
    }));
    const { handleParserRequest } = await import("../src/handler.js");
    expect((await handleParserRequest(request)).status).toBe(200);
  });

  it("bounds a stalled adapter import without blocking liveness", async () => {
    vi.useFakeTimers();
    vi.doMock("../src/adapters/index.js", () => ({
      getParserAdapter: () => new Promise(() => {}),
    }));
    const { handleParserRequest } = await import("../src/handler.js");
    const readiness = handleParserRequest(request);
    expect(await handleParserRequest({ ...request, path: "/health" })).toEqual({
      status: 200, body: { ok: true },
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await readiness).toEqual(notReady);
    expect(vi.getTimerCount()).toBe(0);
  });
});
