# Curriculum Parser Worker

This service keeps document parsing out of the generic app's request handler. It can run as a standalone Node server or as a separate free Vercel project. Point `generic-app` at it with `PARSER_SERVICE_URL`.

## Environment Variables

```env
PARSER_SERVICE_TOKEN="shared-secret"
PARSER_ADAPTER="mock"
PARSER_COMMAND=""
PARSER_COMMAND_TIMEOUT_MS="120000"
MAX_UPLOAD_BYTES="20971520"
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
corepack pnpm install --frozen-lockfile
corepack pnpm run dev
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

## Pinned parser and extraction limits

The worker pins `kordoc@4.18.2` and `pdfjs-dist@4.10.38`. PDFJS must be a direct dependency: Kordoc 4 makes it optional, while this worker deliberately omits optional packages. Node 22.13+ is required by the pinned pnpm 11 toolchain.

The adapter explicitly sets `ocr: false` and `formulaOcr: false`. It does not download or use OCR models, including models already cached on the host. Image-only PDF content still needs visual processing downstream; the generic app forwards the original PDF through its Gemini structurer. The OpenAI structurer does not currently use the original file bytes. No OCR environment-variable toggle is implemented.

`metadata.parserVersion` reports the actual loaded library version. Raw Kordoc warnings and qualitySummary are preserved. `requiresVisualReview` also checks SKIPPED_IMAGE and other incomplete-extraction warnings; `qualitySummary.needsOcr=false` alone is not proof that an image-based curriculum was read. The generic app saves a cautious source-review notice alongside AI warnings.

Nested cell/caption tables are included using Kordoc's recursive table collector. Review changes against the public-file regression corpus before changing the exact versions. Deploy the worker service used by `PARSER_SERVICE_URL`; deploying only generic-app or a similarly named unused worker does not update the production parser.
