import type { ParsedDocument, ParserProvider } from "./types";

type ParserServiceResponse = {
  text: string;
  tables: string[][];
  metadata?: Record<string, unknown>;
};

function getParserServiceConfig() {
  const url = process.env.PARSER_SERVICE_URL;

  if (!url) {
    throw new Error("PARSER_SERVICE_URL is required when CURRICULUM_PARSER_PROVIDER=kordoc.");
  }

  return {
    url,
    token: process.env.PARSER_SERVICE_TOKEN,
  };
}

function getParserEndpoint(url: string) {
  const endpoint = new URL(url);

  if (endpoint.pathname === "/") {
    endpoint.pathname = "/parse";
  }

  return endpoint;
}

function isParserServiceResponse(value: unknown): value is ParserServiceResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ParserServiceResponse>;

  return (
    typeof candidate.text === "string" &&
    Array.isArray(candidate.tables) &&
    candidate.tables.every(
      (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
    )
  );
}

export class KordocParserProvider implements ParserProvider {
  async parse(input: Parameters<ParserProvider["parse"]>[0]): Promise<ParsedDocument> {
    const { token, url } = getParserServiceConfig();
    const endpoint = getParserEndpoint(url);

    const startedAt = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: input.fileName,
        mimeType: input.mimeType,
        contentBase64: input.buffer.toString("base64"),
      }),
      // 콜드 Render에 무한 대기하지 않도록 타임아웃(진단+하드닝).
      signal: AbortSignal.timeout(45000),
    });
    console.log(`[parser] kordoc responded in ${Date.now() - startedAt}ms status=${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Parser service failed with ${response.status}${errorText ? `: ${errorText}` : ""}`,
      );
    }

    const body: unknown = await response.json();

    if (!isParserServiceResponse(body)) {
      throw new Error("Parser service returned an invalid response.");
    }

    return {
      text: body.text,
      tables: body.tables,
      metadata: {
        parser: "kordoc-service",
        fileName: input.fileName,
        ...body.metadata,
      },
    };
  }
}
