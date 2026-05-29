# Generic Curriculum Assistant

This app is separate from the Hyoja High School assistant in `app/`. Keep the existing Hyoja app unchanged when developing or deploying this generic assistant.

## Local Development

Run commands from `generic-app/`. Create the environment file first, because database commands need `DATABASE_URL`.

## Environment Variables

Create a local environment file with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
CURRICULUM_PARSER_PROVIDER="mock"
CURRICULUM_STRUCTURER_PROVIDER="mock"
OPENAI_API_KEY=""
```

Use the mock parser and structurer providers until real parser and LLM adapters are configured.

Then install dependencies, generate the Prisma client, sync the database tables, and start the app:

```bash
npm install
npm run db:generate
npm run dev
```

`db:generate` creates the Prisma client. For local throwaway databases, `npm run db:push` can still create or update tables from `prisma/schema.prisma`.

For Supabase deployments, apply the SQL migrations in `supabase/migrations` instead of relying on `db:push`.

The development server starts at `http://localhost:3000` unless Next.js selects another port.

## Checks

Run these before shipping changes:

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

For the upload and publish flow only:

```bash
npm run test:e2e -- tests/e2e/upload-publish.spec.ts
```

## Deployment

Deploy this as its own Vercel project. Set the Vercel project root directory to `generic-app`, configure the required environment variables in that project, and keep the existing Hyoja High School assistant deployment unchanged.

Provision the production Postgres schema before first use by applying the SQL files in `supabase/migrations`. If you use the Supabase CLI, link the project and run the migration SQL against the linked database.
