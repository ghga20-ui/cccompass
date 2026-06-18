# Generic Curriculum Assistant

This app is separate from the Hyoja High School assistant in `app/`. Keep the existing Hyoja app unchanged when developing or deploying this generic assistant.

## Local Development

Run commands from `generic-app/`. This project uses pnpm through Corepack. If a global `pnpm` shim is not installed, prefix commands with `corepack pnpm`, for example `corepack pnpm install` and `corepack pnpm run dev`.

Create the environment file first, because database commands need `DATABASE_URL`.

## Environment Variables

Create a local environment file with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
CURRICULUM_PARSER_PROVIDER="kordoc"
PARSER_SERVICE_URL="https://your-parser-worker.example.com"
PARSER_SERVICE_TOKEN="shared-secret"
CURRICULUM_STRUCTURER_PROVIDER="openai"
OPENAI_STRUCTURER_MODEL="gpt-5.5"
OPENAI_REASONING_EFFORT="low"
OPENAI_API_KEY=""
```

Use `mock` providers only for local smoke tests. Production should call the separate parser worker and then structure the extracted text and tables with OpenAI.

Then install dependencies, generate the Prisma client, sync the database tables, and start the app:

```bash
pnpm install
pnpm run db:generate
pnpm run dev
```

`db:generate` creates the Prisma client. For local throwaway databases, `pnpm run db:push` can still create or update tables from `prisma/schema.prisma`.

For Supabase deployments, apply the SQL migrations in `supabase/migrations` instead of relying on `db:push`.

The development server starts at `http://localhost:3000` unless Next.js selects another port.

## Parser Worker

Document parsing is intentionally kept outside this Vercel app. Deploy `../parser-worker` as its own service, configure it with a Kordoc-compatible adapter, then set `PARSER_SERVICE_URL` and `PARSER_SERVICE_TOKEN` here.

Keep uploaded school curriculum files at or below 5MB. Larger PDFs should use a storage-backed flow instead of direct function-to-function JSON transfer.

The app sends uploaded file bytes to `POST /parse` and expects:

```json
{
  "text": "extracted text or markdown",
  "tables": [["header", "value"]],
  "metadata": { "parser": "kordoc" }
}
```

## Checks

Run these before shipping changes:

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:e2e:hyoja
```

For the Hyoja-parity public surface only:

```bash
pnpm run test:public
```

The public student routes are share-token scoped: `/s/[shareToken]`, `/s/[shareToken]/recommend`, `/s/[shareToken]/roadmap`, `/s/[shareToken]/subjects`, and `/s/[shareToken]/subjects/[id]`. They reuse the Hyoja-style UI while loading the uploaded school's published curriculum at runtime.

Grade 1 remains in the teacher review/edit data, but every public student route filters it out. Public recommendation, roadmap, subjects, and subject-detail views only expose grade 2 and grade 3 availability.

The Hyoja E2E suite runs with real Chrome through Playwright. It uses a deterministic local E2E JSON store by default and keeps `tests/e2e/docker-compose.postgres.yml` for environments that prefer a real PostgreSQL test database. The E2E server defaults to port `3100`; override it with `E2E_PORT` if needed.

## Deployment

Deploy this as its own Vercel project. Set the Vercel project root directory to `generic-app`, configure the required environment variables in that project, and keep the existing Hyoja High School assistant deployment unchanged.

Provision the production Postgres schema before first use by applying the SQL files in `supabase/migrations`. If you use the Supabase CLI, link the project and run the migration SQL against the linked database.
