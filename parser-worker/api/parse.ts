import { handleParserRequest } from "../src/handler.js";

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status(statusCode: number): VercelResponse;
  json(body: unknown): void;
};

function getBodyText(body: unknown) {
  if (typeof body === "string") {
    return body;
  }

  if (body === undefined || body === null) {
    return "";
  }

  return JSON.stringify(body);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = await handleParserRequest({
    method: request.method ?? "GET",
    path: "/parse",
    headers: request.headers,
    bodyText: getBodyText(request.body),
  });

  response.status(result.status).json(result.body);
}
