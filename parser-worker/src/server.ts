import http from "node:http";
import { handleParserRequest } from "./handler.js";

function sendJson(response: http.ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readBodyText(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function createServer() {
  return http.createServer(async (request, response) => {
    const bodyText = await readBodyText(request);
    const path = request.url?.split("?")[0] ?? "/";
    const result = await handleParserRequest({
      method: request.method ?? "GET",
      path,
      headers: request.headers,
      bodyText,
    });

    sendJson(response, result.status, result.body);
  });
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8787);

  createServer().listen(port, () => {
    console.log(`Curriculum parser worker listening on ${port}`);
  });
}
