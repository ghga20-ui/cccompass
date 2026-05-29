import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

let baseUrl = "";
let server: ReturnType<typeof createServer>;

describe("parser worker", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.PARSER_ADAPTER = "mock";
    process.env.PARSER_SERVICE_TOKEN = "test-token";

    server = createServer();

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();

        if (address && typeof address === "object") {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }

        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns health status", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("requires the parser token", async () => {
    const response = await fetch(`${baseUrl}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "curriculum.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("sample").toString("base64"),
      }),
    });

    expect(response.status).toBe(401);
  });

  it("parses a valid upload request", async () => {
    const response = await fetch(`${baseUrl}/parse`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: "curriculum.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("sample").toString("base64"),
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.text).toContain("테스트고등학교");
    expect(body.tables.length).toBeGreaterThan(0);
    expect(body.metadata.parser).toBe("mock-worker");
  });
});
