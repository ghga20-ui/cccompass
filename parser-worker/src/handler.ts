import { getParserAdapter } from "./adapters/index.js";
import type { ParseRequest } from "./types.js";

type HeaderValue = string | string[] | undefined;

export type ParserHttpRequest = {
  method: string;
  path: string;
  headers: Record<string, HeaderValue>;
  bodyText: string;
};

export type ParserHttpResponse = {
  status: number;
  body: unknown;
};

const maxBodyBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);

function getHeader(headers: Record<string, HeaderValue>, name: string) {
  const direct = headers[name];
  const lower = headers[name.toLowerCase()];
  const value = direct ?? lower;

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isAuthorized(headers: Record<string, HeaderValue>) {
  const token = process.env.PARSER_SERVICE_TOKEN;

  if (!token) {
    return true;
  }

  return getHeader(headers, "authorization") === `Bearer ${token}`;
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

export async function handleParserRequest(
  request: ParserHttpRequest,
): Promise<ParserHttpResponse> {
  if (request.method === "GET" && request.path === "/health") {
    return { status: 200, body: { ok: true } };
  }

  if (request.method !== "POST" || request.path !== "/parse") {
    return { status: 404, body: { error: "Not found." } };
  }

  if (!isAuthorized(request.headers)) {
    return { status: 401, body: { error: "Unauthorized." } };
  }

  if (Buffer.byteLength(request.bodyText, "utf8") > maxBodyBytes) {
    return { status: 413, body: { error: "Request body too large." } };
  }

  let body: unknown;

  try {
    body = JSON.parse(request.bodyText);
  } catch {
    return { status: 400, body: { error: "Invalid JSON body." } };
  }

  if (!isParseRequest(body)) {
    return { status: 400, body: { error: "Invalid parse request." } };
  }

  try {
    const adapter = await getParserAdapter();
    const parsed = await adapter.parse({
      fileName: body.fileName,
      mimeType: body.mimeType,
      buffer: Buffer.from(body.contentBase64, "base64"),
    });

    return { status: 200, body: parsed };
  } catch (error) {
    console.error("Parser worker failed", error);
    return { status: 502, body: { error: "Parser failed." } };
  }
}
