import type { ParsedDocument, ParserProvider } from "./types";
import { ensureParserReady, getParserServiceConfig, isTimeout, ParserServiceError } from "./service-readiness";

type ParserServiceResponse = {
  text: string;
  tables: string[][];
  metadata?: Record<string, unknown>;
};

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
    const { token, endpoint } = getParserServiceConfig();
    await ensureParserReady(endpoint, token);

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(endpoint, {
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
        // 준비 완료 후 문서 처리에만 적용하는 제한. 자동 재전송하지 않는다.
        signal: AbortSignal.timeout(45000),
      });
    } catch (error) {
      throw new ParserServiceError(isTimeout(error) ? "parser-timeout" : "parser-unavailable", isTimeout(error) ? 504 : 502);
    }
    console.log(`[parser] kordoc responded in ${Date.now() - startedAt}ms status=${response.status}`);

    if (!response.ok) {
      throw new ParserServiceError("parser-unavailable", 502);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new ParserServiceError(isTimeout(error) ? "parser-timeout" : "parser-unavailable", isTimeout(error) ? 504 : 502);
    }

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
