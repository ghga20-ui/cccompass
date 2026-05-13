# Repository Guidelines

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
