# CurriCompass maintenance CI

`.github/workflows/maintenance-ci.yml` runs on pull requests and pushes to
`codex/generic-curriculum-assistant-clean`. It provides two independent checks:

- **App checks:** frozen dependency install, Prisma generation and TypeScript
  checking, the unit/integration test suite, ESLint, and a production build
- **Parser worker checks:** frozen dependency install, tests, TypeScript checking
  (`pnpm run lint`), and a production build

Both jobs use Node 22 (pnpm 11 requires Node 22.13 or newer) and pnpm 11.7.0.
Actions are pinned by commit, repository permissions are read-only, checkout
credentials are not retained, and a newer run cancels the older run for the same
pull request or branch. The workflow does not use repository secrets, provision
a database, run migrations, call paid AI services, or deploy. App tests use
mocked providers and disposable local persistence; the loopback database URL
only supplies Prisma's build-time configuration. Playwright browser E2E is not
part of this workflow. App builds currently need network access to Google Fonts.

## Worker development dependencies

The worker's production `.npmrc` keeps `optional=false`. A standard install
therefore omits native optional packages needed by Vitest/Vite, including the
platform-specific Rolldown binding. CI uses this development-only override:

```sh
cd parser-worker
pnpm install --frozen-lockfile --config.optional=true
pnpm run test
pnpm run lint
pnpm run build
```

This leaves `.npmrc` and the Render install command unchanged. The committed
`.pnpmfile.cjs` removes Kordoc's optional dependencies, and the frozen lockfile
contains that reduced Kordoc dependency graph. Enabling the remaining locked
optional dependencies supplies native development binaries without restoring
Kordoc's OCR/model dependencies. Keep the hook and its lockfile checksum in sync
when intentionally updating dependencies; do not use `--ignore-pnpmfile` or
replace the frozen install with an unlocked CI install.

## Deployment is still separately controlled

Adding this workflow does **not** make passing CI a pre-deployment gate.
The repository currently declares `autoDeploy: true` for Render, and the Vercel
Git integration can deploy independently of these jobs. GitHub required checks,
branch protection, and any Vercel/Render setting that makes a deployment wait for
checks must be reviewed and configured separately with deployment-owner
approval. Neither hosting configuration nor branch protection is changed here.
Do not treat a green run as evidence that production is running the tested
commit or that live parser, database, or AI integration has been exercised.
