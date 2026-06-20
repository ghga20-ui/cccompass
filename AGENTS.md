# Repository Guidelines

## 세션 핸드오프 (코덱스 ↔ Claude Code)

이 저장소는 코덱스(Codex)와 Claude Code를 번갈아 쓴다. 한쪽 한도가 떨어지면 다른 쪽으로 넘어가므로, 세션이 언제 끊겨도 이어갈 수 있어야 한다.

- **세션 시작 시**: `HANDOFF.md`를 먼저 읽고 현재 상태와 다음 할 일을 파악한다.
- **작업에 변화가 생길 때마다 즉시** `HANDOFF.md`를 갱신한다 (한 일 / 다음 할 일 / 미해결 이슈 / 함정). 세션이 언제 끝날지 모르므로 마지막에 몰아서 쓰지 말고 그때그때 기록한다.
- 역할 분담: `AGENTS.md`(이 파일)는 잘 안 변하는 규칙, `HANDOFF.md`는 매번 바뀌는 진행 상태.

## Project Structure & Module Organization

This repository combines curriculum data, extraction scripts, a Next.js app, and Remotion video assets. The web app lives in `app/`; source code is under `app/src`, components are in `app/src/components`, routes are in `app/src/app`, and copied JSON data sits in `app/src/data/json`. Canonical source data and verification images live in `data/`. Root-level Python scripts generate or transform curriculum datasets. Video compositions live in `remotion-videos/`.

## Build, Test, and Development Commands

Run web commands from `app/`:

- `npm run dev` starts the Next.js development server on `http://localhost:3000`.
- `npm run build` creates a production Next.js build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint for TypeScript, React, and Next.js files.

Run video commands from `remotion-videos/`:

- `npm run studio` opens Remotion Studio.
- `npm run render` renders the `SubjectIntro` composition to `out/subject.mp4`.

Run Python data scripts from the repository root with `py -3 script_name.py` on Windows.
After editing `data/school.json`, run `py -3 sync_school_data.py` to copy it into `app/src/data/json/school.json`. Run `py -3 sync_school_data.py --check` to verify both files match.

## Coding Style & Naming Conventions

Use TypeScript for app code, React function components, and PascalCase filenames such as `SubjectCard.tsx`. Use camelCase for functions, variables, and data helpers. Keep shadcn-style primitives in `app/src/components/ui` lowercase. Follow existing 2-space indentation and Tailwind class composition with `cn()`.

## Testing Guidelines

There is no formal app test suite. Treat `npm run lint` and `npm run build` in `app/` as required checks for app changes. For data edits, run the affected Python script and inspect the JSON or spreadsheet diff. For Remotion changes, use `npm run studio` and `npm run render`.

## Commit & Pull Request Guidelines

Recent history uses short Korean summaries and conventional prefixes such as `fix:` and `chore:`. Keep commits focused and imperative, for example `fix: add missing subjects to subjects.json`. Pull requests should describe the changed workflow or dataset, list commands run, link related issues, and include screenshots or rendered previews for UI and video changes.

After making requested repository changes, run the relevant checks, commit the completed work, and push it to the appropriate remote branch immediately unless the user explicitly asks not to. Keep unrelated local changes out of the commit; stage only the files touched for the task.

## Security & Configuration Tips

Do not commit `.env.local`, API keys, generated caches, or `node_modules`. Treat `data/school.json` as the editable source for school curriculum changes, then sync it into the app. Document source files and scripts used for generated JSON.

## generic-app 배포 구조 (범용 교육과정 도우미)

`generic-app/`은 편제표 업로드 → 파싱 → AI 구조화 → 공유 앱이다. 실제 코드 작업은 git worktree `generic-curriculum-assistant-impl`(브랜치 `codex/generic-curriculum-assistant-clean`)에서 한다.

- 앱: Vercel 프로젝트 `generic-curriculum-assistant` → https://generic-curriculum-assistant.vercel.app
- 파서: `parser-worker/`(kordoc) → Render https://generic-curriculum-assistant.onrender.com (무료 티어, 15분 미사용 시 슬립 → 첫 요청 cold start ~1분)
- DB: Supabase, transaction pooler(6543) + `?pgbouncer=true`
- 업로드 흐름: `/create` → `/api/curricula/upload`(maxDuration 300) → Render 파서 → OpenAI `gpt-5.5` → prisma 저장 → `/review/{draftId}`

**환경변수 설정 규칙**: Vercel 환경변수는 반드시 Bash 도구로 `printf '값' | vercel env add KEY production --force --cwd generic-app` 형태로 넣는다. PowerShell 파이프(`"값" | vercel env add`)는 값에 BOM/CRLF를 끼워넣어 오염시킨다(과거 502/500의 실제 원인). 확인은 `vercel env pull` 후 `cat -A`로 숨은 문자 검사.
