import { handleParserRequest } from "../src/handler.js";

type VercelRequest = { method?: string };

type VercelResponse = {
  status(statusCode: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");
  const result = await handleParserRequest({
    method: request.method ?? "GET",
    path: "/ready",
    headers: {},
    bodyText: "",
  });

  response.status(result.status).json(result.body);
}
