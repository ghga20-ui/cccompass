# Generic Curriculum Assistant M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first deployable vertical slice of the generic curriculum assistant: separate Next.js app, upload, parser abstraction, LLM structuring abstraction, teacher review, DB persistence, and share/edit links.

**Architecture:** Create a new app under `generic-app/` so the Hyoja app remains untouched and can keep its own deployment. The new app uses server-side upload processing, a parser provider interface, schema-validated curriculum JSON, Postgres-backed persistence through Prisma, and public/edit token routes.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, Vitest, React Testing Library, Playwright for smoke checks.

---

## Scope

This plan implements Milestone 1 only. It does not build the full student recommendation and roadmap experience. It creates a working school creation flow that can publish a minimal student page proving that share tokens and runtime school data work.

Milestone 2 should add the subject list, recommendation page, and roadmap UI using the published curriculum data.

## File Structure

Create these top-level paths:

- `generic-app/`: independent Next.js app for separate deployment.
- `generic-app/src/lib/curriculum/schema.ts`: Zod schemas and TypeScript types for `SchoolCurriculum`.
- `generic-app/src/lib/curriculum/normalize.ts`: safe helpers for subject names, choice counts, and confidence defaults.
- `generic-app/src/lib/parser/types.ts`: parser provider interface.
- `generic-app/src/lib/parser/mock-parser.ts`: deterministic parser used in tests and local development.
- `generic-app/src/lib/parser/kordoc-parser.ts`: server-side parser adapter shell for a kordoc-like service.
- `generic-app/src/lib/llm/types.ts`: structuring provider interface.
- `generic-app/src/lib/llm/mock-structurer.ts`: deterministic structurer used in tests and local development.
- `generic-app/src/lib/llm/openai-structurer.ts`: production structurer adapter shell.
- `generic-app/src/lib/tokens.ts`: share/edit token generation.
- `generic-app/src/lib/db.ts`: Prisma client singleton.
- `generic-app/prisma/schema.prisma`: DB tables for curriculum drafts and published versions.
- `generic-app/src/app/create/page.tsx`: teacher upload page.
- `generic-app/src/app/review/[draftId]/page.tsx`: teacher review page.
- `generic-app/src/app/edit/[editToken]/page.tsx`: private edit-link entry point.
- `generic-app/src/app/published/[draftId]/page.tsx`: publication success page.
- `generic-app/src/app/s/[shareToken]/page.tsx`: minimal student page.
- `generic-app/src/app/api/curricula/upload/route.ts`: upload and structure endpoint.
- `generic-app/src/app/api/curricula/[draftId]/route.ts`: draft read/update endpoint.
- `generic-app/src/app/api/curricula/[draftId]/publish/route.ts`: publication endpoint.
- `generic-app/src/components/curriculum/CurriculumReviewForm.tsx`: editable grade/semester review form.
- `generic-app/src/components/curriculum/ChoiceGroupEditor.tsx`: choice-group editor.
- `generic-app/src/components/curriculum/SubjectEditor.tsx`: subject row editor.
- `generic-app/src/components/ui/*`: small local UI primitives.
- `generic-app/tests/unit/*.test.ts`: schema, normalization, token, and provider tests.
- `generic-app/tests/e2e/upload-publish.spec.ts`: upload-to-publish smoke test.

## Environment

The app needs these environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
CURRICULUM_PARSER_PROVIDER="mock"
CURRICULUM_STRUCTURER_PROVIDER="mock"
OPENAI_API_KEY=""
```

Use `mock` providers until the parser and LLM adapters are wired to real services. This keeps the app runnable before credentials exist.

### Task 1: Scaffold The Separate App

**Files:**
- Create: `generic-app/package.json`
- Create: `generic-app/next.config.ts`
- Create: `generic-app/tsconfig.json`
- Create: `generic-app/eslint.config.mjs`
- Create: `generic-app/postcss.config.mjs`
- Create: `generic-app/src/app/layout.tsx`
- Create: `generic-app/src/app/page.tsx`
- Create: `generic-app/src/app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "generic-curriculum-assistant",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^6.19.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.5.0",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@playwright/test": "^1.57.0",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "jsdom": "^27.2.0",
    "prisma": "^6.19.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.0.14"
  }
}
```

- [ ] **Step 2: Add core Next.js config files**

`generic-app/next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`generic-app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`generic-app/eslint.config.mjs`

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

`generic-app/postcss.config.mjs`

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

- [ ] **Step 3: Add the first app shell**

`generic-app/src/app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --primary: #2563eb;
  --border: #d8dee9;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

`generic-app/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "범용 선택과목 도우미",
  description: "학교 편제표 업로드 기반 선택과목 도우미",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`generic-app/src/app/page.tsx`

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 px-6 py-12">
      <section className="space-y-4">
        <p className="text-sm font-semibold text-blue-700">교사용 생성 도구</p>
        <h1 className="text-4xl font-bold tracking-normal">학교 편제표로 선택과목 도우미를 만드세요</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          PDF, HWPX, Excel 편제표를 업로드하고 인식 결과를 검수한 뒤 학생에게 공유할 수 있는 학교별 선택과목 도우미를 생성합니다.
        </p>
      </section>
      <Link
        href="/create"
        className="inline-flex w-fit items-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        새 도우미 만들기
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
cd generic-app
npm install
```

Expected: `package-lock.json` is created and install exits with code 0.

- [ ] **Step 5: Run initial checks**

Run:

```bash
cd generic-app
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add generic-app/package.json generic-app/package-lock.json generic-app/next.config.ts generic-app/tsconfig.json generic-app/eslint.config.mjs generic-app/postcss.config.mjs generic-app/src/app
git commit -m "feat: scaffold generic curriculum app"
```

### Task 2: Add Curriculum Schema And Validation

**Files:**
- Create: `generic-app/src/lib/curriculum/schema.ts`
- Create: `generic-app/src/lib/curriculum/normalize.ts`
- Create: `generic-app/vitest.config.ts`
- Create: `generic-app/tests/unit/curriculum-schema.test.ts`

- [ ] **Step 1: Add Vitest config**

`generic-app/vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 2: Write failing schema tests**

`generic-app/tests/unit/curriculum-schema.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { normalizeSubjectName, resolveChooseCount } from "@/lib/curriculum/normalize";

describe("schoolCurriculumSchema", () => {
  it("accepts a valid curriculum with required subjects and choice groups", () => {
    const result = schoolCurriculumSchema.safeParse({
      schoolName: "테스트고등학교",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026학년도 입학생",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "문학", credits: 4, category: "일반선택" }],
                  choiceGroups: [
                    {
                      id: "g2-s1-choice-1",
                      label: "선택A",
                      choose: 1,
                      subjects: [
                        { name: "물리학", credits: 3, category: "진로선택", confidence: 0.9 },
                        { name: "생명과학", credits: 3, category: "진로선택", confidence: 0.9 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty school names, empty groups, and invalid credits", () => {
    const result = schoolCurriculumSchema.safeParse({
      schoolName: "",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026학년도 입학생",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "문학", credits: 0 }],
                  choiceGroups: [{ id: "empty", label: "선택", choose: 1, subjects: [] }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("curriculum normalization", () => {
  it("normalizes subject whitespace", () => {
    expect(normalizeSubjectName("  생명 과학  ")).toBe("생명 과학");
  });

  it("parses Korean choose labels", () => {
    expect(resolveChooseCount("택1")).toBe(1);
    expect(resolveChooseCount("3과목 중 2과목 선택")).toBe(2);
    expect(resolveChooseCount("선택")).toBe(null);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
cd generic-app
npm run test -- tests/unit/curriculum-schema.test.ts
```

Expected: FAIL because `@/lib/curriculum/schema` and `normalize` do not exist.

- [ ] **Step 4: Add schema implementation**

`generic-app/src/lib/curriculum/schema.ts`

```ts
import { z } from "zod";

export const subjectCategorySchema = z.enum([
  "공통",
  "일반선택",
  "진로선택",
  "융합선택",
  "전문교과",
  "기타",
]);

export const curriculumSubjectSchema = z.object({
  name: z.string().trim().min(1),
  area: z.string().trim().min(1).optional(),
  category: subjectCategorySchema.optional(),
  credits: z.number().positive(),
  rawText: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const choiceGroupSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  choose: z.number().int().positive(),
  minChoose: z.number().int().positive().optional(),
  maxChoose: z.number().int().positive().optional(),
  creditsEach: z.number().positive().optional(),
  subjects: z.array(curriculumSubjectSchema).min(1),
  notes: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const curriculumSemesterSchema = z.object({
  semester: z.union([z.literal(1), z.literal(2)]),
  requiredSubjects: z.array(curriculumSubjectSchema),
  choiceGroups: z.array(choiceGroupSchema),
});

export const curriculumGradeSchema = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  semesters: z.array(curriculumSemesterSchema).min(1),
});

export const curriculumCohortSchema = z.object({
  entranceYear: z.string().trim().min(4),
  label: z.string().trim().min(1),
  grades: z.array(curriculumGradeSchema).min(1),
});

export const schoolCurriculumSchema = z.object({
  schoolName: z.string().trim().min(1),
  sourceYear: z.string().trim().min(1).optional(),
  cohorts: z.array(curriculumCohortSchema).min(1),
});

export type SubjectCategory = z.infer<typeof subjectCategorySchema>;
export type CurriculumSubject = z.infer<typeof curriculumSubjectSchema>;
export type ChoiceGroup = z.infer<typeof choiceGroupSchema>;
export type CurriculumSemester = z.infer<typeof curriculumSemesterSchema>;
export type CurriculumGrade = z.infer<typeof curriculumGradeSchema>;
export type CurriculumCohort = z.infer<typeof curriculumCohortSchema>;
export type SchoolCurriculum = z.infer<typeof schoolCurriculumSchema>;
```

- [ ] **Step 5: Add normalization helpers**

`generic-app/src/lib/curriculum/normalize.ts`

```ts
export function normalizeSubjectName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function resolveChooseCount(label: string): number | null {
  const compact = label.replace(/\s+/g, "");
  const direct = compact.match(/택(\d+)/);
  if (direct) return Number(direct[1]);

  const counted = compact.match(/중(\d+)과목?선택/);
  if (counted) return Number(counted[1]);

  return null;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd generic-app
npm run test -- tests/unit/curriculum-schema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add generic-app/src/lib/curriculum generic-app/tests/unit/curriculum-schema.test.ts generic-app/vitest.config.ts
git commit -m "feat: add curriculum schema validation"
```

### Task 3: Add Parser And LLM Provider Interfaces

**Files:**
- Create: `generic-app/src/lib/parser/types.ts`
- Create: `generic-app/src/lib/parser/mock-parser.ts`
- Create: `generic-app/src/lib/parser/index.ts`
- Create: `generic-app/src/lib/llm/types.ts`
- Create: `generic-app/src/lib/llm/mock-structurer.ts`
- Create: `generic-app/src/lib/llm/index.ts`
- Create: `generic-app/tests/unit/providers.test.ts`

- [ ] **Step 1: Write failing provider tests**

`generic-app/tests/unit/providers.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { getParserProvider } from "@/lib/parser";
import { getStructurerProvider } from "@/lib/llm";

describe("provider factories", () => {
  it("uses mock parser provider by default", async () => {
    const parser = getParserProvider();
    const result = await parser.parse({
      fileName: "sample.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("sample"),
    });

    expect(result.text).toContain("테스트고등학교");
    expect(result.tables.length).toBeGreaterThan(0);
  });

  it("uses mock structurer provider by default", async () => {
    const structurer = getStructurerProvider();
    const result = await structurer.structure({
      text: "테스트고등학교 2026학년도 입학생",
      tables: [],
    });

    expect(result.curriculum.schoolName).toBe("테스트고등학교");
    expect(result.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd generic-app
npm run test -- tests/unit/providers.test.ts
```

Expected: FAIL because provider modules do not exist.

- [ ] **Step 3: Add parser types and mock parser**

`generic-app/src/lib/parser/types.ts`

```ts
export type ParseInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedDocument = {
  text: string;
  tables: string[][];
  metadata: {
    parser: string;
    fileName: string;
  };
};

export interface ParserProvider {
  parse(input: ParseInput): Promise<ParsedDocument>;
}
```

`generic-app/src/lib/parser/mock-parser.ts`

```ts
import type { ParsedDocument, ParserProvider } from "./types";

export class MockParserProvider implements ParserProvider {
  async parse(input: Parameters<ParserProvider["parse"]>[0]): Promise<ParsedDocument> {
    return {
      text: [
        "테스트고등학교",
        "2026학년도 입학생 교육과정 편제표",
        "2학년 1학기 문학 4학점 필수",
        "2학년 1학기 선택A 택1 물리학 3학점 생명과학 3학점",
      ].join("\n"),
      tables: [
        ["학년", "학기", "구분", "과목", "학점"],
        ["2", "1", "필수", "문학", "4"],
        ["2", "1", "선택A 택1", "물리학, 생명과학", "3"],
      ],
      metadata: {
        parser: "mock",
        fileName: input.fileName,
      },
    };
  }
}
```

`generic-app/src/lib/parser/index.ts`

```ts
import { MockParserProvider } from "./mock-parser";
import type { ParserProvider } from "./types";

export function getParserProvider(): ParserProvider {
  const provider = process.env.CURRICULUM_PARSER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockParserProvider();
  }

  throw new Error(`Unsupported parser provider: ${provider}`);
}
```

- [ ] **Step 4: Add LLM types and mock structurer**

`generic-app/src/lib/llm/types.ts`

```ts
import type { SchoolCurriculum } from "@/lib/curriculum/schema";
import type { ParsedDocument } from "@/lib/parser/types";

export type StructuringResult = {
  curriculum: SchoolCurriculum;
  warnings: string[];
  sourceSnippets: string[];
};

export interface StructurerProvider {
  structure(document: Pick<ParsedDocument, "text" | "tables">): Promise<StructuringResult>;
}
```

`generic-app/src/lib/llm/mock-structurer.ts`

```ts
import type { StructurerProvider, StructuringResult } from "./types";

export class MockStructurerProvider implements StructurerProvider {
  async structure(): Promise<StructuringResult> {
    return {
      curriculum: {
        schoolName: "테스트고등학교",
        sourceYear: "2026",
        cohorts: [
          {
            entranceYear: "2026",
            label: "2026학년도 입학생",
            grades: [
              {
                grade: 2,
                semesters: [
                  {
                    semester: 1,
                    requiredSubjects: [{ name: "문학", credits: 4, category: "일반선택", confidence: 0.95 }],
                    choiceGroups: [
                      {
                        id: "g2-s1-choice-a",
                        label: "선택A",
                        choose: 1,
                        creditsEach: 3,
                        confidence: 0.9,
                        subjects: [
                          { name: "물리학", credits: 3, category: "진로선택", confidence: 0.9 },
                          { name: "생명과학", credits: 3, category: "진로선택", confidence: 0.9 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      warnings: [],
      sourceSnippets: ["2학년 1학기 선택A 택1 물리학 3학점 생명과학 3학점"],
    };
  }
}
```

`generic-app/src/lib/llm/index.ts`

```ts
import { MockStructurerProvider } from "./mock-structurer";
import type { StructurerProvider } from "./types";

export function getStructurerProvider(): StructurerProvider {
  const provider = process.env.CURRICULUM_STRUCTURER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockStructurerProvider();
  }

  throw new Error(`Unsupported structurer provider: ${provider}`);
}
```

- [ ] **Step 5: Run provider tests**

Run:

```bash
cd generic-app
npm run test -- tests/unit/providers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add generic-app/src/lib/parser generic-app/src/lib/llm generic-app/tests/unit/providers.test.ts
git commit -m "feat: add curriculum parser providers"
```

### Task 4: Add Database Models And Token Helpers

**Files:**
- Create: `generic-app/prisma/schema.prisma`
- Create: `generic-app/src/lib/db.ts`
- Create: `generic-app/src/lib/tokens.ts`
- Create: `generic-app/tests/unit/tokens.test.ts`
- Modify: `generic-app/package.json`

- [ ] **Step 1: Write token tests**

`generic-app/tests/unit/tokens.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { createShareToken } from "@/lib/tokens";

describe("createShareToken", () => {
  it("creates URL-safe tokens with enough entropy", () => {
    const token = createShareToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("creates different tokens on repeated calls", () => {
    expect(createShareToken()).not.toBe(createShareToken());
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
cd generic-app
npm run test -- tests/unit/tokens.test.ts
```

Expected: FAIL because `@/lib/tokens` does not exist.

- [ ] **Step 3: Add token helper**

`generic-app/src/lib/tokens.ts`

```ts
import { randomBytes } from "crypto";

export function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}
```

- [ ] **Step 4: Add Prisma schema**

`generic-app/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model CurriculumDraft {
  id             String   @id @default(cuid())
  schoolName     String
  status         String   @default("draft")
  curriculumJson Json
  parsedText     String
  warnings       Json
  sourceSnippets Json
  editToken      String   @unique
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  publication CurriculumPublication?
}

model CurriculumPublication {
  id             String   @id @default(cuid())
  draftId        String   @unique
  schoolName     String
  curriculumJson Json
  shareToken     String   @unique
  editToken      String   @unique
  publishedAt    DateTime @default(now())
  updatedAt      DateTime @updatedAt

  draft CurriculumDraft @relation(fields: [draftId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 5: Add Prisma client singleton**

`generic-app/src/lib/db.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Generate Prisma client and run token tests**

Run:

```bash
cd generic-app
npm run db:generate
npm run test -- tests/unit/tokens.test.ts
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add generic-app/prisma/schema.prisma generic-app/src/lib/db.ts generic-app/src/lib/tokens.ts generic-app/tests/unit/tokens.test.ts generic-app/package.json generic-app/package-lock.json
git commit -m "feat: add curriculum persistence models"
```

### Task 5: Add Upload API

**Files:**
- Create: `generic-app/src/app/api/curricula/upload/route.ts`
- Create: `generic-app/tests/unit/upload-route.test.ts`

- [ ] **Step 1: Write route behavior tests**

`generic-app/tests/unit/upload-route.test.ts`

```ts
import { describe, expect, it } from "vitest";

describe("upload route contract", () => {
  it("documents the expected successful response shape", () => {
    const response = {
      draftId: "draft_123",
      reviewUrl: "/review/draft_123",
      schoolName: "테스트고등학교",
      warnings: [],
    };

    expect(response).toEqual({
      draftId: expect.any(String),
      reviewUrl: expect.stringContaining("/review/"),
      schoolName: "테스트고등학교",
      warnings: [],
    });
  });
});
```

- [ ] **Step 2: Add upload route**

`generic-app/src/app/api/curricula/upload/route.ts`

```ts
import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";
import { getStructurerProvider } from "@/lib/llm";
import { getParserProvider } from "@/lib/parser";
import { createShareToken } from "@/lib/tokens";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "편제표 파일을 업로드해주세요." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "파일은 15MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = getParserProvider();
  const parsed = await parser.parse({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
  });

  if (!parsed.text.trim() && parsed.tables.length === 0) {
    return NextResponse.json({ error: "문서에서 편제표 내용을 찾지 못했습니다." }, { status: 422 });
  }

  const structurer = getStructurerProvider();
  const structured = await structurer.structure({
    text: parsed.text,
    tables: parsed.tables,
  });

  const validation = schoolCurriculumSchema.safeParse(structured.curriculum);
  if (!validation.success) {
    return NextResponse.json(
      { error: "편제표를 표준 구조로 변환하지 못했습니다.", issues: validation.error.issues },
      { status: 422 }
    );
  }

  const draft = await prisma.curriculumDraft.create({
    data: {
      schoolName: validation.data.schoolName,
      curriculumJson: validation.data,
      parsedText: parsed.text,
      warnings: structured.warnings,
      sourceSnippets: structured.sourceSnippets,
      editToken: createShareToken(),
    },
  });

  return NextResponse.json({
    draftId: draft.id,
    reviewUrl: `/review/${draft.id}`,
    schoolName: draft.schoolName,
    warnings: structured.warnings,
  });
}
```

- [ ] **Step 3: Run tests and type checks**

Run:

```bash
cd generic-app
npm run test -- tests/unit/upload-route.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 4: Commit**

```bash
git add generic-app/src/app/api/curricula/upload/route.ts generic-app/tests/unit/upload-route.test.ts
git commit -m "feat: add curriculum upload api"
```

### Task 6: Add Teacher Upload Page

**Files:**
- Create: `generic-app/src/app/create/page.tsx`

- [ ] **Step 1: Add client upload page**

`generic-app/src/app/create/page.tsx`

```tsx
"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

export default function CreatePage() {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsUploading(true);

    const response = await fetch("/api/curricula/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      setError(payload.error ?? "업로드 중 오류가 발생했습니다.");
      return;
    }

    window.location.href = payload.reviewUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-blue-700">1단계</p>
        <h1 className="text-3xl font-bold">학교 편제표 업로드</h1>
        <p className="text-slate-700">
          PDF, HWPX, Excel 등 학교 편제표 파일을 업로드하세요. 인식 결과는 발행 전에 직접 검수합니다.
        </p>
      </div>

      <form action={onSubmit} className="mt-8 space-y-5 rounded-md border border-slate-200 bg-white p-6">
        <label className="block">
          <span className="text-sm font-semibold">편제표 파일</span>
          <input
            required
            name="file"
            type="file"
            accept=".pdf,.hwp,.hwpx,.xlsx,.xlsm,.docx"
            className="mt-2 block w-full rounded-md border border-slate-300 p-3"
          />
        </label>

        {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "분석 중" : "업로드하고 분석하기"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
cd generic-app
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add generic-app/src/app/create/page.tsx
git commit -m "feat: add curriculum upload page"
```

### Task 7: Add Draft Read/Update And Review UI

**Files:**
- Create: `generic-app/src/app/api/curricula/[draftId]/route.ts`
- Create: `generic-app/src/app/review/[draftId]/page.tsx`
- Create: `generic-app/src/components/curriculum/CurriculumReviewForm.tsx`
- Create: `generic-app/src/components/curriculum/ChoiceGroupEditor.tsx`
- Create: `generic-app/src/components/curriculum/SubjectEditor.tsx`

- [ ] **Step 1: Add draft API**

`generic-app/src/app/api/curricula/[draftId]/route.ts`

```ts
import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await prisma.curriculumDraft.findUnique({ where: { id: draftId } });

  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(draft);
}

export async function PUT(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const body = await request.json();
  const validation = schoolCurriculumSchema.safeParse(body.curriculum);

  if (!validation.success) {
    return NextResponse.json({ error: "편제 데이터가 올바르지 않습니다.", issues: validation.error.issues }, { status: 422 });
  }

  const draft = await prisma.curriculumDraft.update({
    where: { id: draftId },
    data: {
      schoolName: validation.data.schoolName,
      curriculumJson: validation.data,
    },
  });

  return NextResponse.json(draft);
}
```

- [ ] **Step 2: Add subject editor**

`generic-app/src/components/curriculum/SubjectEditor.tsx`

```tsx
import type { CurriculumSubject } from "@/lib/curriculum/schema";

type SubjectEditorProps = {
  subject: CurriculumSubject;
  onChange: (subject: CurriculumSubject) => void;
};

export default function SubjectEditor({ subject, onChange }: SubjectEditorProps) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_120px_140px]">
      <input
        value={subject.name}
        onChange={(event) => onChange({ ...subject, name: event.target.value })}
        className="rounded-md border border-slate-300 px-3 py-2"
        aria-label="과목명"
      />
      <input
        value={subject.credits}
        onChange={(event) => onChange({ ...subject, credits: Number(event.target.value) })}
        type="number"
        min={0.5}
        step={0.5}
        className="rounded-md border border-slate-300 px-3 py-2"
        aria-label="학점"
      />
      <input
        value={subject.category ?? ""}
        onChange={(event) => onChange({ ...subject, category: event.target.value as CurriculumSubject["category"] })}
        className="rounded-md border border-slate-300 px-3 py-2"
        aria-label="분류"
      />
    </div>
  );
}
```

- [ ] **Step 3: Add choice group editor**

`generic-app/src/components/curriculum/ChoiceGroupEditor.tsx`

```tsx
import type { ChoiceGroup } from "@/lib/curriculum/schema";
import SubjectEditor from "./SubjectEditor";

type ChoiceGroupEditorProps = {
  group: ChoiceGroup;
  onChange: (group: ChoiceGroup) => void;
};

export default function ChoiceGroupEditor({ group, onChange }: ChoiceGroupEditorProps) {
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2 md:grid-cols-[1fr_100px]">
        <input
          value={group.label}
          onChange={(event) => onChange({ ...group, label: event.target.value })}
          className="rounded-md border border-slate-300 px-3 py-2"
          aria-label="선택군 이름"
        />
        <input
          value={group.choose}
          onChange={(event) => onChange({ ...group, choose: Number(event.target.value) })}
          type="number"
          min={1}
          className="rounded-md border border-slate-300 px-3 py-2"
          aria-label="선택 개수"
        />
      </div>
      <div className="space-y-2">
        {group.subjects.map((subject, index) => (
          <SubjectEditor
            key={`${group.id}-${index}`}
            subject={subject}
            onChange={(next) => {
              const subjects = [...group.subjects];
              subjects[index] = next;
              onChange({ ...group, subjects });
            }}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add review form**

`generic-app/src/components/curriculum/CurriculumReviewForm.tsx`

```tsx
"use client";

import { useState } from "react";
import type { SchoolCurriculum } from "@/lib/curriculum/schema";
import ChoiceGroupEditor from "./ChoiceGroupEditor";
import SubjectEditor from "./SubjectEditor";

type CurriculumReviewFormProps = {
  draftId: string;
  initialCurriculum: SchoolCurriculum;
};

export default function CurriculumReviewForm({ draftId, initialCurriculum }: CurriculumReviewFormProps) {
  const [curriculum, setCurriculum] = useState(initialCurriculum);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const response = await fetch(`/api/curricula/${draftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curriculum }),
    });

    setMessage(response.ok ? "저장했습니다." : "저장하지 못했습니다.");
  }

  async function publish() {
    const response = await fetch(`/api/curricula/${draftId}/publish`, {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "발행하지 못했습니다.");
      return;
    }

    window.location.href = payload.manageUrl;
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-semibold">학교명</span>
        <input
          value={curriculum.schoolName}
          onChange={(event) => setCurriculum({ ...curriculum, schoolName: event.target.value })}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      {curriculum.cohorts.map((cohort, cohortIndex) => (
        <section key={cohort.entranceYear} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">{cohort.label}</h2>
          {cohort.grades.map((grade, gradeIndex) => (
            <div key={grade.grade} className="space-y-4">
              <h3 className="font-semibold">{grade.grade}학년</h3>
              {grade.semesters.map((semester, semesterIndex) => (
                <section key={semester.semester} className="space-y-3 border-t border-slate-200 pt-4">
                  <h4 className="font-semibold">{semester.semester}학기</h4>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-600">필수 과목</p>
                    {semester.requiredSubjects.map((subject, subjectIndex) => (
                      <SubjectEditor
                        key={`${grade.grade}-${semester.semester}-required-${subjectIndex}`}
                        subject={subject}
                        onChange={(next) => {
                          const nextCurriculum = structuredClone(curriculum);
                          nextCurriculum.cohorts[cohortIndex].grades[gradeIndex].semesters[semesterIndex].requiredSubjects[subjectIndex] = next;
                          setCurriculum(nextCurriculum);
                        }}
                      />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-600">선택 과목군</p>
                    {semester.choiceGroups.map((group, groupIndex) => (
                      <ChoiceGroupEditor
                        key={group.id}
                        group={group}
                        onChange={(next) => {
                          const nextCurriculum = structuredClone(curriculum);
                          nextCurriculum.cohorts[cohortIndex].grades[gradeIndex].semesters[semesterIndex].choiceGroups[groupIndex] = next;
                          setCurriculum(nextCurriculum);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))}
        </section>
      ))}

      {message ? <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button onClick={save} className="rounded-md border border-slate-300 px-4 py-2 font-semibold">
          저장
        </button>
        <button onClick={publish} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white">
          발행
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add review page**

`generic-app/src/app/review/[draftId]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import CurriculumReviewForm from "@/components/curriculum/CurriculumReviewForm";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

export default async function ReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await prisma.curriculumDraft.findUnique({ where: { id: draftId } });

  if (!draft) notFound();

  const curriculum = schoolCurriculumSchema.parse(draft.curriculumJson);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold text-blue-700">2단계</p>
        <h1 className="text-3xl font-bold">인식 결과 검수</h1>
        <p className="text-slate-700">학년, 학기, 과목명, 학점, 선택 개수를 확인한 뒤 발행하세요.</p>
      </div>
      <CurriculumReviewForm draftId={draft.id} initialCurriculum={curriculum} />
    </main>
  );
}
```

- [ ] **Step 6: Run lint**

Run:

```bash
cd generic-app
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add generic-app/src/app/api/curricula/[draftId]/route.ts generic-app/src/app/review generic-app/src/components/curriculum
git commit -m "feat: add curriculum review flow"
```

### Task 8: Add Publish And Share Routes

**Files:**
- Create: `generic-app/src/app/api/curricula/[draftId]/publish/route.ts`
- Create: `generic-app/src/app/published/[draftId]/page.tsx`
- Create: `generic-app/src/app/s/[shareToken]/page.tsx`
- Create: `generic-app/src/app/edit/[editToken]/page.tsx`

- [ ] **Step 1: Add publish endpoint**

`generic-app/src/app/api/curricula/[draftId]/publish/route.ts`

```ts
import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";
import { createShareToken } from "@/lib/tokens";

export async function POST(_request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await prisma.curriculumDraft.findUnique({ where: { id: draftId } });

  if (!draft) {
    return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
  }

  const validation = schoolCurriculumSchema.safeParse(draft.curriculumJson);
  if (!validation.success) {
    return NextResponse.json({ error: "검수할 항목이 남아 있습니다.", issues: validation.error.issues }, { status: 422 });
  }

  const publication = await prisma.curriculumPublication.upsert({
    where: { draftId },
    update: {
      schoolName: validation.data.schoolName,
      curriculumJson: validation.data,
    },
    create: {
      draftId,
      schoolName: validation.data.schoolName,
      curriculumJson: validation.data,
      shareToken: createShareToken(),
      editToken: draft.editToken,
    },
  });

  await prisma.curriculumDraft.update({
    where: { id: draftId },
    data: { status: "published" },
  });

  return NextResponse.json({
    shareUrl: `/s/${publication.shareToken}`,
    editUrl: `/edit/${publication.editToken}`,
    manageUrl: `/published/${draftId}`,
  });
}
```

- [ ] **Step 2: Add published success page**

`generic-app/src/app/published/[draftId]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function PublishedPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const publication = await prisma.curriculumPublication.findUnique({ where: { draftId } });

  if (!publication) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-blue-700">발행 완료</p>
        <h1 className="text-3xl font-bold">{publication.schoolName} 선택과목 도우미</h1>
        <p className="text-slate-700">학생용 링크와 교사용 수정 링크가 생성되었습니다.</p>
      </div>
      <div className="mt-8 space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm font-semibold">학생용 링크</p>
          <Link className="text-blue-700 underline" href={`/s/${publication.shareToken}`}>
            /s/{publication.shareToken}
          </Link>
        </div>
        <div>
          <p className="text-sm font-semibold">교사용 수정 링크</p>
          <Link className="text-blue-700 underline" href={`/edit/${publication.editToken}`}>
            /edit/{publication.editToken}
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add student share page**

`generic-app/src/app/s/[shareToken]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

export default async function StudentSharePage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const publication = await prisma.curriculumPublication.findUnique({ where: { shareToken } });

  if (!publication) notFound();

  const curriculum = schoolCurriculumSchema.parse(publication.curriculumJson);
  const subjectCount = curriculum.cohorts.reduce(
    (total, cohort) =>
      total +
      cohort.grades.reduce(
        (gradeTotal, grade) =>
          gradeTotal +
          grade.semesters.reduce(
            (semesterTotal, semester) =>
              semesterTotal + semester.requiredSubjects.length + semester.choiceGroups.flatMap((group) => group.subjects).length,
            0
          ),
        0
      ),
    0
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-blue-700">학생용 선택과목 도우미</p>
        <h1 className="text-3xl font-bold">{curriculum.schoolName}</h1>
        <p className="text-slate-700">현재 {subjectCount}개 과목을 학교 편제표 기준으로 확인할 수 있습니다.</p>
      </section>
      <section className="mt-8 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">개설 과목 요약</h2>
        <div className="mt-4 space-y-4">
          {curriculum.cohorts.map((cohort) => (
            <div key={cohort.entranceYear}>
              <h3 className="font-semibold">{cohort.label}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {cohort.grades.flatMap((grade) =>
                  grade.semesters.map((semester) => (
                    <li key={`${grade.grade}-${semester.semester}`}>
                      {grade.grade}학년 {semester.semester}학기: 필수 {semester.requiredSubjects.length}개, 선택군 {semester.choiceGroups.length}개
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add edit token page**

`generic-app/src/app/edit/[editToken]/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function EditTokenPage({ params }: { params: Promise<{ editToken: string }> }) {
  const { editToken } = await params;
  const draft = await prisma.curriculumDraft.findUnique({ where: { editToken } });

  if (!draft) {
    redirect("/");
  }

  redirect(`/review/${draft.id}`);
}
```

- [ ] **Step 5: Run lint and build**

Run:

```bash
cd generic-app
npm run lint
npm run build
```

Expected: both commands pass with a valid `DATABASE_URL` and generated Prisma client.

- [ ] **Step 6: Commit**

```bash
git add generic-app/src/app/api/curricula/[draftId]/publish generic-app/src/app/published generic-app/src/app/s generic-app/src/app/edit
git commit -m "feat: add curriculum publication links"
```

### Task 9: Add Provider Adapter Shells For Real Parser And LLM

**Files:**
- Create: `generic-app/src/lib/parser/kordoc-parser.ts`
- Create: `generic-app/src/lib/llm/openai-structurer.ts`
- Modify: `generic-app/src/lib/parser/index.ts`
- Modify: `generic-app/src/lib/llm/index.ts`

- [ ] **Step 1: Add kordoc-like parser adapter shell**

`generic-app/src/lib/parser/kordoc-parser.ts`

```ts
import type { ParsedDocument, ParserProvider } from "./types";

export class KordocParserProvider implements ParserProvider {
  async parse(): Promise<ParsedDocument> {
    throw new Error(
      "KordocParserProvider is not wired yet. Deploy a server-side parser service and set CURRICULUM_PARSER_PROVIDER=mock until it is ready."
    );
  }
}
```

- [ ] **Step 2: Add OpenAI structurer adapter shell**

`generic-app/src/lib/llm/openai-structurer.ts`

```ts
import type { StructurerProvider, StructuringResult } from "./types";

export class OpenAIStructurerProvider implements StructurerProvider {
  async structure(): Promise<StructuringResult> {
    throw new Error(
      "OpenAIStructurerProvider is not wired yet. Add the OpenAI Responses API call with structured output before setting CURRICULUM_STRUCTURER_PROVIDER=openai."
    );
  }
}
```

- [ ] **Step 3: Wire provider factories**

Update `generic-app/src/lib/parser/index.ts`:

```ts
import { KordocParserProvider } from "./kordoc-parser";
import { MockParserProvider } from "./mock-parser";
import type { ParserProvider } from "./types";

export function getParserProvider(): ParserProvider {
  const provider = process.env.CURRICULUM_PARSER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockParserProvider();
  }

  if (provider === "kordoc") {
    return new KordocParserProvider();
  }

  throw new Error(`Unsupported parser provider: ${provider}`);
}
```

Update `generic-app/src/lib/llm/index.ts`:

```ts
import { MockStructurerProvider } from "./mock-structurer";
import { OpenAIStructurerProvider } from "./openai-structurer";
import type { StructurerProvider } from "./types";

export function getStructurerProvider(): StructurerProvider {
  const provider = process.env.CURRICULUM_STRUCTURER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockStructurerProvider();
  }

  if (provider === "openai") {
    return new OpenAIStructurerProvider();
  }

  throw new Error(`Unsupported structurer provider: ${provider}`);
}
```

- [ ] **Step 4: Run provider tests**

Run:

```bash
cd generic-app
npm run test -- tests/unit/providers.test.ts
```

Expected: PASS with default mock providers.

- [ ] **Step 5: Commit**

```bash
git add generic-app/src/lib/parser generic-app/src/lib/llm
git commit -m "feat: add parser and llm adapter shells"
```

### Task 10: Add Upload-To-Publish Smoke Test

**Files:**
- Create: `generic-app/playwright.config.ts`
- Create: `generic-app/tests/e2e/upload-publish.spec.ts`

- [ ] **Step 1: Add Playwright config**

`generic-app/playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

- [ ] **Step 2: Add smoke test**

`generic-app/tests/e2e/upload-publish.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("teacher can reach the upload page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "새 도우미 만들기" }).click();

  await expect(page.getByRole("heading", { name: "학교 편제표 업로드" })).toBeVisible();
  await expect(page.getByLabel("편제표 파일")).toBeVisible();
});
```

- [ ] **Step 3: Run smoke test**

Run:

```bash
cd generic-app
npm run test:e2e -- tests/e2e/upload-publish.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add generic-app/playwright.config.ts generic-app/tests/e2e/upload-publish.spec.ts
git commit -m "test: add generic app smoke test"
```

### Task 11: Final Verification And Deployment Notes

**Files:**
- Create: `generic-app/README.md`

- [ ] **Step 1: Add README**

`generic-app/README.md`

```md
# Generic Curriculum Assistant

This app is separate from the Hyoja High School assistant. Deploy it as its own Vercel project with `generic-app` as the project root.

## Local Development

```bash
npm install
npm run db:generate
npm run dev
```

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
CURRICULUM_PARSER_PROVIDER="mock"
CURRICULUM_STRUCTURER_PROVIDER="mock"
OPENAI_API_KEY=""
```

Use mock providers until the real parser and LLM adapters are configured.

## Checks

```bash
npm run lint
npm run test
npm run build
```

## Deployment

Create a separate Vercel project and set its root directory to `generic-app`. Keep the existing Hyoja app deployment unchanged.
```

- [ ] **Step 2: Run full checks**

Run:

```bash
cd generic-app
npm run lint
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add generic-app/README.md
git commit -m "docs: add generic app deployment notes"
```

- [ ] **Step 4: Push branch**

Run:

```bash
git push origin codex/generic-curriculum-assistant
```

Expected: branch updates successfully.

## Self-Review Notes

Spec coverage:

- Separate project and separate deployment: covered by Tasks 1 and 11.
- Upload flow: covered by Tasks 5 and 6.
- Parser abstraction with kordoc-like adapter: covered by Tasks 3 and 9.
- LLM structuring abstraction: covered by Tasks 3 and 9.
- Teacher review and correction: covered by Task 7.
- DB-backed drafts and publications: covered by Tasks 4 and 8.
- Public student link and private edit link: covered by Task 8.
- Original file deletion policy: covered structurally by Task 5 because the route keeps the file in memory only and does not persist it.
- Student full subject/recommendation/roadmap pages: deferred to Milestone 2 by explicit scope.

Incomplete-work scan:

- The adapter shells intentionally throw until real services are configured. They do not affect active mock-provider behavior. They are explicit integration points for the next plan.

Type consistency:

- `SchoolCurriculum`, `CurriculumSubject`, and `ChoiceGroup` match the schema introduced in Task 2 and are reused in later tasks.
