import { handleParserRequest } from "../src/handler.js";

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(statusCode: number): VercelResponse;
  json(body: unknown): void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = await handleParserRequest({
    method: request.method ?? "GET",
    path: "/health",
    headers: request.headers,
    bodyText: "",
  });

  response.status(result.status).json(result.body);
}
