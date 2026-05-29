# Curriculum Parser Worker

This service keeps document parsing out of the Vercel app. Deploy it as a separate service and point `generic-app` at it with `PARSER_SERVICE_URL`.

## Environment Variables

```env
PARSER_SERVICE_TOKEN="shared-secret"
PARSER_ADAPTER="mock"
PARSER_COMMAND=""
PARSER_COMMAND_TIMEOUT_MS="120000"
MAX_UPLOAD_BYTES="20971520"
```

Use `PARSER_ADAPTER=mock` for smoke tests. Use `PARSER_ADAPTER=command` when a server-side parser such as Kordoc is installed.

The command adapter runs:

```bash
$PARSER_COMMAND <uploaded-file-path> <metadata-json-path>
```

The command must write JSON to stdout, or write `output.json` in the temporary working directory:

```json
{
  "text": "extracted markdown or text",
  "tables": [["header", "value"]],
  "metadata": { "parser": "kordoc" }
}
```

## Local Run

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:8787/health
```
