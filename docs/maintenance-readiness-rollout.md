# Readiness maintenance: review and rollout

This is a local candidate. It has not been pushed or deployed. The reference production source is `c92e70d06fe5c0a826a4def9a711b3d76a801451`.

## Behavior and bounds

- `/health` remains a cheap liveness response. `/ready` checks the selected adapter; Kordoc readiness loads its actual version and PDFJS engine/worker exports without reading documents, running OCR, or downloading models. The worker check has a five-second budget. It reports only adapter identity, library version and an allowlisted commit SHA.
- The upload page starts a read-only preparation request. Submission waits for a successful readiness response, keeps the selected file on failure, and sends the upload only once. Leaving the page while preparing cancels that wait. Successful submission stays locked until navigation completes.
- `/api/warm` calls `/ready`, rejects HTTP errors and liveness-only replies, never caches results, and returns a clear failure. Its backend request budget is 75 seconds and route budget 90 seconds.
- The server-side parser client also checks readiness, so callers cannot bypass preparation by skipping the page. Only then does it send document bytes; the existing 45-second processing budget starts after readiness. Readiness+processing is bounded at approximately 120 seconds before AI structuring. No automatic document/upload retry is introduced.
- Timeouts/unavailability return specific 503/504/502 responses before structuring or saving. The existing AI retry policy is unchanged; this change does not introduce an overall deadline across every AI attempt.
- Readiness means the configured adapter can load. It does not prove arbitrary documents parse correctly. Command readiness validates configuration only and does not execute commands.

## Required deployment order

Do not push all changes to the auto-deploy branch at once. The new app requires `/ready`; deploying it before the worker would block uploads.

1. Review and approve the production rollout separately. Re-fetch the production branch and preserve any newer changes. Record current Render and Vercel successful deployment IDs for rollback.
2. On the shared production branch, create a **worker-only commit** containing the `parser-worker/` changes. Push that commit only after approval. This can trigger both hosts, but Vercel still builds the unchanged app. Existing app/parse/health behavior stays compatible. Verify live `/health` 200 and `/ready` 200 with adapter `kordoc`, parserVersion `4.18.2`, expected commit identity and no secret fields. Verify a safe fixture only if authorized.
3. After live worker verification, create and push a **second commit** with the app readiness/UI/error changes and CI/documentation. Render may rebuild the identical readiness-capable worker; the new app never precedes its required endpoint. Verify delayed readiness, failure/recovery, repeated submit and successful navigation with test data. Do not publish a test curriculum.
4. Add/run the CI workflow and follow `maintenance-ci.md`. Workflow success is an independent signal: existing hosting auto-deploy settings are not changed by this patch. Required checks/hosting integration must be configured separately before describing CI as a deployment gate.

## Rollback

Roll back the app first if the new workflow misbehaves. The old app remains compatible with the additive worker endpoint. If worker rollback is also needed, confirm the old app is active before removing `/ready`; otherwise the new app correctly refuses to upload to an unready/old worker. Keep existing database/RLS/model/credential settings unchanged.

## Verification limits

Local tests use controlled responses and mock structuring/database calls. They do not prove live hosting readiness, paid model availability, or all real-browser behavior. No production request with user documents, database write, paid AI call, credential read, package-security exception, remote push or hosting configuration change is part of preparation.

The deliverable includes `stage-1-worker.patch` and `stage-2-app-ci.patch` for this sequence, plus a combined patch for review only. Do not push the combined local preparation commit directly to the shared auto-deploy branch. Reapply onto the then-current remote source and repeat the affected checks.
