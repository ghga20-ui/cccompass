type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status(statusCode: number): VercelResponse;
  json(body: unknown): void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if ((request.method ?? "GET") !== "GET") {
    response.status(404).json({ error: "Not found." });
    return;
  }

  response.status(200).json({ ok: true });
}
