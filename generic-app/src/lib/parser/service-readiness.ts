export const PARSER_READY_TIMEOUT_MS = 75_000;

export class ParserServiceError extends Error {
  constructor(
    public readonly code: "parser-not-ready" | "parser-warming-timeout" | "parser-timeout" | "parser-unavailable",
    public readonly status: 502 | 503 | 504,
  ) {
    super(code);
    this.name = "ParserServiceError";
  }
}

export function isTimeout(error: unknown) {
  return error !== null && typeof error === "object" && "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError");
}

export function getParserServiceConfig() {
  const url = process.env.PARSER_SERVICE_URL;
  if (!url) throw new Error("PARSER_SERVICE_URL is required when CURRICULUM_PARSER_PROVIDER=kordoc.");
  const endpoint = new URL(url);
  if (endpoint.pathname === "/") endpoint.pathname = "/parse";
  return { endpoint, token: process.env.PARSER_SERVICE_TOKEN };
}

export async function ensureParserReady(endpoint: URL, token?: string) {
  const readinessUrl = new URL("./ready", endpoint);
  let response: Response;
  try {
    response = await fetch(readinessUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(PARSER_READY_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ParserServiceError(isTimeout(error) ? "parser-warming-timeout" : "parser-not-ready", isTimeout(error) ? 504 : 503);
  }
  if (!response.ok) throw new ParserServiceError("parser-not-ready", 503);
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ParserServiceError(isTimeout(error) ? "parser-warming-timeout" : "parser-not-ready", isTimeout(error) ? 504 : 503);
  }
  if (!body || typeof body !== "object" || !("ready" in body) || body.ready !== true || !("ok" in body) || body.ok !== true) {
    throw new ParserServiceError("parser-not-ready", 503);
  }
  return { ok: true, ready: true };
}

export async function checkParserReadiness() {
  const provider = process.env.CURRICULUM_PARSER_PROVIDER ?? "mock";
  if (provider === "mock") return { ok: true, ready: true };
  if (provider !== "kordoc") throw new ParserServiceError("parser-not-ready", 503);
  const { endpoint, token } = getParserServiceConfig();
  return ensureParserReady(endpoint, token);
}
