import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KordocParserProvider } from "@/lib/parser/kordoc-parser";
import { GET } from "@/app/api/warm/route";

const input = { fileName: "public.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("sample") };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("parser readiness before upload", () => {
  beforeEach(() => {
    vi.stubEnv("CURRICULUM_PARSER_PROVIDER", "kordoc");
    vi.stubEnv("PARSER_SERVICE_URL", "https://parser.example.test/api/parse");
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("warmup does not report a missing readiness endpoint as success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ error: "not found" }, 404));
    vi.stubGlobal("fetch", fetchMock);
    const result = await GET();
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ ok: false, ready: false });
    expect(fetchMock.mock.calls[0][0].pathname).toBe("/api/ready");
  });

  it("does not upload document bytes while the adapter is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: false, ready: false }, 503));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new KordocParserProvider().parse(input)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("rejects a liveness-only response as readiness", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })));
    const result = await GET();
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ ready: false });
  });

  it("reports a readiness timeout without retrying or claiming ready", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("deadline", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await GET();
    expect(result.status).toBe(504);
    expect(await result.json()).toMatchObject({ ok: false, ready: false, code: "parser-warming-timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("classifies a deadline while reading the readiness body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new DOMException("deadline", "TimeoutError"); } }));
    const result = await GET();
    expect(result.status).toBe(504);
    expect(await result.json()).toMatchObject({ code: "parser-warming-timeout" });
  });

  it("classifies a deadline while reading parsed output without repeating POST", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ ok: true, ready: true }))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new DOMException("deadline", "TimeoutError"); } });
    vi.stubGlobal("fetch", fetchMock);
    await expect(new KordocParserProvider().parse(input)).rejects.toMatchObject({ code: "parser-timeout", status: 504 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits for a delayed readiness response before sending a document", async () => {
    let ready!: (value: Response) => void;
    const fetchMock = vi.fn().mockReturnValueOnce(new Promise<Response>((resolve) => { ready = resolve; }))
      .mockResolvedValueOnce(response({ text: "parsed", tables: [["과목", "학점"]] }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = new KordocParserProvider().parse(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    ready(response({ ok: true, ready: true }));
    await expect(pending).resolves.toMatchObject({ text: "parsed" });
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

});
