import http from "node:http";
import { getParserAdapter } from "./adapters/index.js";
import type { ParseRequest } from "./types.js";

const maxBodyBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);

function sendJson(response: http.ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function isAuthorized(request: http.IncomingMessage) {
  const token = process.env.PARSER_SERVICE_TOKEN;

  if (!token) {
    return true;
  }

  return request.headers.authorization === `Bearer ${token}`;
}

function isParseRequest(value: unknown): value is ParseRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ParseRequest>;

  return (
    typeof candidate.fileName === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.contentBase64 === "string"
  );
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maxBodyBytes) {
      throw new Error("Request body too large.");
    }

    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function createServer() {
  return http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method !== "POST" || request.url !== "/parse") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "Unauthorized." });
      return;
    }

    let body: unknown;

    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { error: "Invalid JSON body." });
      return;
    }

    if (!isParseRequest(body)) {
      sendJson(response, 400, { error: "Invalid parse request." });
      return;
    }

    try {
      const parsed = await getParserAdapter().parse({
        fileName: body.fileName,
        mimeType: body.mimeType,
        buffer: Buffer.from(body.contentBase64, "base64"),
      });

      sendJson(response, 200, parsed);
    } catch (error) {
      console.error("Parser worker failed", error);
      sendJson(response, 502, { error: "Parser failed." });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8787);

  createServer().listen(port, () => {
    console.log(`Curriculum parser worker listening on ${port}`);
  });
}
