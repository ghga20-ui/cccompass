# 합의도 뱃지 + 로드맵 커버리지 게이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추천 과목 카드에 "핵심 N개교 · 권장 M개교" 근거 뱃지를 달고, 로드맵 화면에 대학 핵심과목 커버리지 실시간 게이지를 추가한다.

**Architecture:** 순수 계산 로직은 JSON import가 없는 `app/src/lib/consensus.ts`에 두어 node:test로 단위 테스트하고, `university-recommendations.ts`가 이를 감싸 데이터를 주입한다. UI는 SubjectCard에 optional prop 추가 + 로드맵 sticky 바에 게이지 행 추가.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, node:test(.mjs, TS type-stripping import)

**Spec:** `docs/superpowers/specs/2026-07-07-consensus-badge-coverage-design.md`

## Global Constraints

- 뱃지 카운트는 **명시적 과목명 지정만** 집계 (우산 용어 `areas` 확장 제외)
- 커버리지 분모 임계값: 핵심과목 지정 **3개교 이상**
- 미개설 과목은 분모 제외 + 별도 안내 문구
- 게이지 숨김: 관심계열 없음(dept 진입) 또는 분모 0
- 검증 명령: `app/`에서 `npm run lint` + `npm run build` + `node --test tests/`
- 좌측 컬러바(border-l accent) 절대 금지 (사용자 확고한 선호)
- 과목명 비교 시 로마숫자 변형(Ⅱ vs II) 정규화

---

### Task 1: 순수 계산 로직 (`lib/consensus.ts`) + 단위 테스트

**Files:**
- Create: `app/src/lib/consensus.ts`
- Test: `app/tests/consensus.test.mjs`

**Interfaces:**
- Consumes: 없음 (순수 함수, `RecommendationEntry` 구조와 동일한 shape의 객체를 받음)
- Produces:
  - `interface ConsensusBadge { core: number; recommended: number }`
  - `buildBadgeMap(entries: ConsensusEntryLike[]): Map<string, ConsensusBadge>`
  - `interface CoverageResult { percent: number; covered: string[]; missing: { name: string; count: number }[]; notOffered: { name: string; count: number }[]; denominator: number }`
  - `computeCoverage(coreCounts: Map<string, number>, offeredNames: Set<string>, takenNames: Set<string>, threshold?: number): CoverageResult`
  - `normalizeSubjectName(name: string): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`app/tests/consensus.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBadgeMap,
  computeCoverage,
  normalizeSubjectName,
} from "../src/lib/consensus.ts";

const entry = (university, coreSubjects, recSubjects) => ({
  university,
  core: coreSubjects ? { raw: "", subjects: coreSubjects, areas: [], isFlexible: false } : null,
  recommended: recSubjects ? { raw: "", subjects: recSubjects, areas: [], isFlexible: false } : null,
});

test("buildBadgeMap counts distinct universities per subject", () => {
  const badges = buildBadgeMap([
    entry("A대", ["물리학", "수학"], null),
    entry("A대", ["물리학"], null), // 같은 대학 다른 모집단위 — 중복 카운트 금지
    entry("B대", ["물리학"], ["기하"]),
    entry("C대", null, ["기하"]),
  ]);
  assert.equal(badges.get("물리학").core, 2); // A대, B대
  assert.equal(badges.get("물리학").recommended, 0);
  assert.equal(badges.get("기하").core, 0);
  assert.equal(badges.get("기하").recommended, 2); // B대, C대
});

test("buildBadgeMap ignores areas (umbrella terms)", () => {
  const badges = buildBadgeMap([
    {
      university: "A대",
      core: { raw: "", subjects: [], areas: ["수학"], isFlexible: false },
      recommended: null,
    },
  ]);
  assert.equal(badges.size, 0);
});

test("computeCoverage: offered-only denominator, threshold, missing sorted desc", () => {
  const coreCounts = new Map([
    ["미적분Ⅱ", 20],
    ["기하", 10],
    ["물리학", 8],
    ["정보", 2], // threshold 미만 — 분모 제외
  ]);
  const offered = new Set(["미적분Ⅱ", "물리학", "정보"]); // 기하 미개설
  const taken = new Set(["미적분Ⅱ"]);
  const r = computeCoverage(coreCounts, offered, taken, 3);
  assert.equal(r.denominator, 2); // 미적분Ⅱ, 물리학
  assert.equal(r.percent, 50);
  assert.deepEqual(r.covered, ["미적분Ⅱ"]);
  assert.deepEqual(r.missing, [{ name: "물리학", count: 8 }]);
  assert.deepEqual(r.notOffered, [{ name: "기하", count: 10 }]);
});

test("computeCoverage: empty denominator yields percent 0", () => {
  const r = computeCoverage(new Map(), new Set(), new Set(), 3);
  assert.equal(r.denominator, 0);
  assert.equal(r.percent, 0);
});

test("normalizeSubjectName equates roman numeral variants", () => {
  assert.equal(normalizeSubjectName("미적분II"), normalizeSubjectName("미적분Ⅱ"));
  assert.equal(normalizeSubjectName("영어 Ⅰ"), normalizeSubjectName("영어Ⅰ"));
});

test("computeCoverage matches taken names across roman variants", () => {
  const coreCounts = new Map([["미적분Ⅱ", 20]]);
  const offered = new Set(["미적분Ⅱ"]);
  const taken = new Set(["미적분II"]); // ASCII II
  const r = computeCoverage(coreCounts, offered, taken, 3);
  assert.equal(r.percent, 100);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd app && node --test tests/consensus.test.mjs`
Expected: FAIL (`Cannot find module '../src/lib/consensus.ts'`)

- [ ] **Step 3: 구현**

`app/src/lib/consensus.ts`:

```ts
// 대교협 「2028학년도 권역별 대학별 권장과목」 기반 합의도/커버리지 순수 계산.
// JSON import 없이 유지할 것 — node:test(.mjs)가 직접 import한다.

export interface ConsensusBadge {
  core: number;
  recommended: number;
}

interface CellLike {
  subjects: string[];
}

export interface ConsensusEntryLike {
  university: string;
  core: CellLike | null;
  recommended: CellLike | null;
}

export interface CoverageResult {
  percent: number;
  covered: string[];
  missing: { name: string; count: number }[];
  notOffered: { name: string; count: number }[];
  denominator: number;
}

/** 로마숫자 변형(II vs Ⅱ)과 공백 차이를 흡수하는 비교용 정규화 */
export function normalizeSubjectName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .replace(/III/g, "Ⅲ")
    .replace(/II/g, "Ⅱ")
    .replace(/I/g, "Ⅰ");
}

/**
 * 과목명 → 그 과목을 명시적으로 핵심/권장과목으로 지정한 대학 수.
 * 같은 대학이 여러 모집단위에서 지정해도 1로 센다. areas(우산 용어)는 세지 않는다.
 */
export function buildBadgeMap(
  entries: ConsensusEntryLike[]
): Map<string, ConsensusBadge> {
  const coreUnis = new Map<string, Set<string>>();
  const recUnis = new Map<string, Set<string>>();

  const collect = (
    target: Map<string, Set<string>>,
    cell: CellLike | null,
    university: string
  ) => {
    if (!cell) return;
    cell.subjects.forEach((name) => {
      let set = target.get(name);
      if (!set) {
        set = new Set<string>();
        target.set(name, set);
      }
      set.add(university);
    });
  };

  entries.forEach((e) => {
    collect(coreUnis, e.core, e.university);
    collect(recUnis, e.recommended, e.university);
  });

  const badges = new Map<string, ConsensusBadge>();
  coreUnis.forEach((unis, name) => {
    badges.set(name, { core: unis.size, recommended: 0 });
  });
  recUnis.forEach((unis, name) => {
    const existing = badges.get(name);
    if (existing) {
      existing.recommended = unis.size;
    } else {
      badges.set(name, { core: 0, recommended: unis.size });
    }
  });
  return badges;
}

/**
 * 커버리지 계산.
 * 분모: coreCounts 중 count >= threshold이면서 학교 개설(offeredNames)인 과목.
 * 미개설 핵심과목(count >= threshold)은 분모에서 빼고 notOffered로 따로 반환.
 * missing/notOffered는 지정 대학 수 내림차순.
 */
export function computeCoverage(
  coreCounts: Map<string, number>,
  offeredNames: Set<string>,
  takenNames: Set<string>,
  threshold = 3
): CoverageResult {
  const offeredNorm = new Set(
    Array.from(offeredNames, (n) => normalizeSubjectName(n))
  );
  const takenNorm = new Set(
    Array.from(takenNames, (n) => normalizeSubjectName(n))
  );

  const covered: string[] = [];
  const missing: { name: string; count: number }[] = [];
  const notOffered: { name: string; count: number }[] = [];

  coreCounts.forEach((count, name) => {
    if (count < threshold) return;
    const norm = normalizeSubjectName(name);
    if (!offeredNorm.has(norm)) {
      notOffered.push({ name, count });
      return;
    }
    if (takenNorm.has(norm)) {
      covered.push(name);
    } else {
      missing.push({ name, count });
    }
  });

  missing.sort((a, b) => b.count - a.count);
  notOffered.sort((a, b) => b.count - a.count);

  const denominator = covered.length + missing.length;
  const percent =
    denominator === 0 ? 0 : Math.round((covered.length / denominator) * 100);

  return { percent, covered, missing, notOffered, denominator };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd app && node --test tests/consensus.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/src/lib/consensus.ts app/tests/consensus.test.mjs
git commit -m "feat: 합의도/커버리지 순수 계산 로직 + 테스트"
```

---

### Task 2: 데이터 주입 래퍼 (`getConsensusBadges`)

**Files:**
- Modify: `app/src/data/university-recommendations.ts` (파일 끝에 추가)

**Interfaces:**
- Consumes: Task 1의 `buildBadgeMap`, `ConsensusBadge`; 기존 `getEntriesByInterest(interestId)`
- Produces: `getConsensusBadges(interests: string[]): Map<string, ConsensusBadge>` — UI가 쓰는 유일한 진입점. `ConsensusBadge` re-export.

- [ ] **Step 1: 구현** (기존 파일 끝에 추가)

```ts
import {
  buildBadgeMap,
  type ConsensusBadge,
} from "@/lib/consensus";

export type { ConsensusBadge };

/**
 * 관심분야 태그들에 대한 과목별 합의도 뱃지.
 * 명시적 과목명 지정만 집계(우산 용어 제외), 대학 중복 제거.
 */
export function getConsensusBadges(
  interests: string[]
): Map<string, ConsensusBadge> {
  const entries = interests.flatMap((tagId) => getEntriesByInterest(tagId));
  return buildBadgeMap(entries);
}
```

주의: import 문은 파일 상단 기존 import(`./json/university-recommendations.json`) 아래에 둔다.

- [ ] **Step 2: 타입 체크**

Run: `cd app && npx tsc --noEmit 2>&1 | grep -v exhibition-subjects`
Expected: 출력 없음 (exhibition-subjects.test.ts의 implicit-any 1건은 기존 이슈라 제외)

- [ ] **Step 3: 커밋**

```bash
git add app/src/data/university-recommendations.ts
git commit -m "feat: getConsensusBadges 데이터 주입 래퍼"
```

---

### Task 3: 추천 화면 합의도 뱃지

**Files:**
- Modify: `app/src/components/SubjectCard.tsx`
- Modify: `app/src/app/(main)/recommend/page.tsx` (InterestRecommendContent, 395행 부근)

**Interfaces:**
- Consumes: Task 2의 `getConsensusBadges`, `ConsensusBadge`
- Produces: `SubjectCardProps.consensus?: ConsensusBadge` (optional — 넘기지 않으면 기존과 동일 렌더)

- [ ] **Step 1: SubjectCard에 consensus prop 추가**

`SubjectCardProps`에 추가:

```ts
import type { ConsensusBadge } from "@/data/university-recommendations";

interface SubjectCardProps {
  // ...기존 필드 유지...
  consensus?: ConsensusBadge;
}
```

함수 시그니처에 `consensus` 추가하고, 메타 행(`<div className="mt-1 flex items-center gap-1.5 flex-wrap">`) 바로 아래·설명문(`{!compact && (...)}`) 위에 렌더 블록 추가:

```tsx
{consensus && (consensus.core > 0 || consensus.recommended > 0) && (
  <p className="mt-1 text-[11px] font-medium text-[var(--cta)]">
    {consensus.core > 0 && `핵심과목 지정 ${consensus.core}개교`}
    {consensus.core > 0 && consensus.recommended > 0 && " · "}
    {consensus.recommended > 0 && `권장 ${consensus.recommended}개교`}
  </p>
)}
```

- [ ] **Step 2: InterestRecommendContent에서 뱃지 계산·전달**

`recommend/page.tsx` 상단 import에 추가:

```ts
import { getConsensusBadges } from "@/data/university-recommendations";
import { normalizeSubjectName } from "@/lib/consensus";
```

`InterestRecommendContent` 컴포넌트 안, 기존 `useMemo`들 근처에:

```ts
// 과목명 정규화 키 → 뱃지 (학교 과목명의 로마숫자 변형 흡수)
const consensusBadges = useMemo(() => {
  const raw = getConsensusBadges(interests);
  const normalized = new Map<string, ConsensusBadge>();
  raw.forEach((badge, name) => normalized.set(normalizeSubjectName(name), badge));
  return normalized;
}, [interests]);
```

(`ConsensusBadge` 타입도 import에 추가.)

학기별 섹션과 미개설 섹션의 `<SubjectCard ...>` 두 곳(575행·612행 부근)에 prop 추가:

```tsx
consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
```

- [ ] **Step 3: 각주 추가**

Summary 카드(`우리 학교에서 수강 가능한 추천 과목 N개` 블록) 안에 줄 추가:

```tsx
<p className="mt-1 text-[10px] text-muted-foreground">
  개교 수는 대교협 「2028학년도 권역별 대학별 권장과목」 중 선택한 계열 모집단위 기준
</p>
```

- [ ] **Step 4: 검증**

```bash
cd app && npm run lint && npm run build
```

Expected: lint 에러 0, build 성공.
수동 확인: `npm run dev` → `/recommend?interests=cs-ai` → 미적분Ⅱ 카드에 "핵심과목 지정 N개교" 표시, 각주 표시.

- [ ] **Step 5: 커밋**

```bash
git add app/src/components/SubjectCard.tsx "app/src/app/(main)/recommend/page.tsx"
git commit -m "feat: 추천 과목 카드에 대학 합의도 뱃지"
```

---

### Task 4: 로드맵 커버리지 게이지

**Files:**
- Create: `app/src/components/CoverageGauge.tsx`
- Modify: `app/src/app/(main)/roadmap/page.tsx`

**Interfaces:**
- Consumes: Task 1 `computeCoverage`/`CoverageResult`/`normalizeSubjectName`, Task 2 `getConsensusBadges`; 기존 `getDesignatedSubjects`, `getAllAvailableSubjectNames`, `getSelectionGroups`(school.ts), `selections` state, `semesterConfigs`
- Produces: `<CoverageGauge result={CoverageResult} />` 표시 컴포넌트

- [ ] **Step 1: CoverageGauge 컴포넌트**

`app/src/components/CoverageGauge.tsx`:

```tsx
"use client";

import type { CoverageResult } from "@/lib/consensus";

export default function CoverageGauge({ result }: { result: CoverageResult }) {
  if (result.denominator === 0) return null;
  const topMissing = result.missing.slice(0, 3);

  return (
    <div className="mx-auto max-w-lg mt-2 rounded-xl bg-card/80 border border-border/50 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground shrink-0">
          대학 핵심과목
        </span>
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--cta)] transition-all"
            style={{ width: `${result.percent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--cta)] shrink-0">
          {result.percent}%
        </span>
      </div>
      {topMissing.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          빠짐:{" "}
          {topMissing
            .map((m) => `${m.name}(${m.count}개교 핵심)`)
            .join(", ")}
        </p>
      )}
      {result.notOffered.length > 0 && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
          우리 학교 미개설: {result.notOffered
            .slice(0, 3)
            .map((m) => `${m.name}(${m.count}개교 핵심)`)
            .join(", ")} — 공동교육과정 등 확인
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: roadmap/page.tsx에서 계산·표시**

상단 import 추가:

```ts
import CoverageGauge from "@/components/CoverageGauge";
import { computeCoverage } from "@/lib/consensus";
import { getConsensusBadges } from "@/data/university-recommendations";
import { getDesignatedSubjects, getAllAvailableSubjectNames } from "@/data/school";
```

(school.ts에서 이미 import 중인 심볼과 겹치면 기존 import 문에 병합.)

`RoadmapContent` 안, `selections` state 선언 뒤에:

```ts
// 대학 핵심과목 커버리지 (관심계열 진입일 때만)
const coverage = useMemo(() => {
  if (interests.length === 0) return null;

  const coreCounts = new Map<string, number>();
  getConsensusBadges(interests).forEach((badge, name) => {
    if (badge.core > 0) coreCounts.set(name, badge.core);
  });

  const offered = new Set<string>();
  const taken = new Set<string>();
  semesterConfigs.forEach(({ grade, semester }) => {
    getAllAvailableSubjectNames(cohort, grade, semester).forEach((n) =>
      offered.add(n)
    );
    // 학교지정 과목은 자동 이수
    getDesignatedSubjects(cohort, grade, semester).forEach((d) =>
      taken.add(d.subject)
    );
  });
  Object.values(selections).forEach((names) =>
    names.forEach((n) => taken.add(n))
  );

  return computeCoverage(coreCounts, offered, taken, 3);
}, [interests, semesterConfigs, cohort, selections]);
```

주의: `getDesignatedSubjects`의 반환 요소 필드명이 `subject`가 아니면(school.ts의 `DesignatedSubject` 타입 확인) 실제 필드명으로 맞춘다.

Sticky 학점 요약 바(602행 `<div className="sticky top-[49px] ...">`) 내부, 학점 요약 flex div 아래에:

```tsx
{coverage && <CoverageGauge result={coverage} />}
```

- [ ] **Step 3: 검증**

```bash
cd app && npm run lint && npm run build && node --test tests/
```

Expected: 모두 통과.
수동 확인: `/recommend?interests=cs-ai` → "이 추천으로 로드맵 만들기" → 게이지 표시, 과목 체크 시 % 실시간 상승, dept 진입(`/roadmap?dept=...`)에선 게이지 없음.

- [ ] **Step 4: 커밋**

```bash
git add app/src/components/CoverageGauge.tsx "app/src/app/(main)/roadmap/page.tsx"
git commit -m "feat: 로드맵 대학 핵심과목 커버리지 게이지"
```

---

### Task 5: 효자고 배포 + 커리컴퍼스 포팅

**Files:**
- Modify: `HANDOFF.md`
- Modify(worktree `~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl`): `generic-app/src/lib/consensus.ts`(신규), `generic-app/src/data/university-recommendations.ts`, `generic-app/src/components/SubjectCard.tsx`, `generic-app/src/components/CoverageGauge.tsx`(신규), 공유 뷰 recommend/roadmap 페이지

**Interfaces:**
- Consumes: Task 1~4의 모든 산출물
- Produces: 두 서비스 라이브 반영

- [ ] **Step 1: HANDOFF.md 갱신 + 효자고 푸시**

HANDOFF 최상단에 이번 작업 요약 추가 후:

```bash
git add HANDOFF.md && git commit -m "docs: HANDOFF 합의도 뱃지+커버리지 게이지 기록"
git push origin codex/generic-curriculum-assistant
```

- [ ] **Step 2: generic-app 구조 확인**

공유 뷰 페이지 구조가 효자고 버전과 어디가 다른지 먼저 확인:

```bash
WT=~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl
grep -n "SubjectCard\|getRecommendedSubjectsByInterest\|selections" \
  "$WT/generic-app/src/app/s/[shareToken]/recommend/page.tsx" \
  "$WT/generic-app/src/app/s/[shareToken]/roadmap/page.tsx" | head -30
```

학교 데이터가 school.ts 정적이 아니라 shareToken 기반 동적일 수 있음 — offered/designated를 해당 페이지의 기존 데이터 소스에서 얻도록 조정한다(핵심 로직 `computeCoverage`는 데이터 소스 불문 동일).

- [ ] **Step 3: 파일 포팅 + 페이지 수정**

`consensus.ts`, `CoverageGauge.tsx`는 그대로 복사. `university-recommendations.ts` 래퍼 추가, SubjectCard·recommend·roadmap 수정은 Task 3~4와 같은 diff를 generic-app 구조에 맞춰 적용.

- [ ] **Step 4: 빌드·푸시**

```bash
cd "$WT/generic-app" && npx pnpm run build
cd "$WT" && git add -A generic-app/src && git commit -m "feat: 합의도 뱃지 + 커버리지 게이지 (메인 포팅)"
git push origin codex/generic-curriculum-assistant-clean
```

- [ ] **Step 5: 라이브 확인**

배포 후 커리컴퍼스 공유 링크에서 추천 화면 뱃지·로드맵 게이지 확인. 문구 노출 확인:

```bash
sleep 90 && curl -fsSL "https://generic-curriculum-assistant.vercel.app" | grep -o "핵심과목" | head -1
```
