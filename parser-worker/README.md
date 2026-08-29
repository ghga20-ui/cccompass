# Curriculum Parser Worker

This service keeps document parsing out of the generic app's request handler. It can run as a standalone Node server or as a separate free Vercel project. Point `generic-app` at it with `PARSER_SERVICE_URL`.

## Environment Variables

```env
PARSER_SERVICE_TOKEN="shared-secret"
PARSER_ADAPTER="mock"
PARSER_COMMAND=""
PARSER_COMMAND_TIMEOUT_MS="120000"
MAX_UPLOAD_BYTES="20971520"
KORDOC_FORMULA_OCR="false"
KORDOC_REMOVE_HEADER_FOOTER="true"
```

Use `PARSER_ADAPTER=mock` for smoke tests. Use `PARSER_ADAPTER=kordoc` to run the npm `kordoc` package inside the worker. Use `PARSER_ADAPTER=command` when a server-side parser must be called through a custom command.

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

## Vercel Deployment

Deploy this directory as its own Vercel project:

```bash
vercel link --yes --project generic-curriculum-parser-worker
vercel env add PARSER_SERVICE_TOKEN production --value "shared-secret" --yes
vercel env add PARSER_ADAPTER production --value "mock" --yes
vercel deploy --prod --yes
```

If the mock deployment works, try `PARSER_ADAPTER=kordoc`. This is the experiment that determines whether we can avoid a paid always-on parser server.
