# 전문교과 추천 보정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학교가 실제 개설한 전문교과(예: `프로그래밍`)를 학생의 관심계열·학과에 맞춰 추천 목록에 노출한다.

**Architecture:** 모든 전문교과에 이미 부여된 `professionalArea`(22개 계열)를 관심분야 태그로 환산하는 순수 매핑 모듈을 만든다. 순수 로직(`lib/`)과 데이터 결합(`data/`)을 분리해 기존 `consensus` 모듈의 이음새를 따른다. 직전 작업에서 만든 `getInterestTagsByDept`를 재사용해 관심사 플로우와 계열별 플로우 양쪽에 동일 로직을 태운다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, node:test

설계 스펙: `docs/superpowers/specs/2026-07-09-professional-subject-recommendation-design.md`

## Global Constraints

- **좌측 컬러바(side-accent, `border-l` 컬러바) 금지.** 사용자가 매우 싫어함. UI에 절대 쓰지 말 것.
- **테스트 실행은 `node --test tests/*.mjs`.** `node --test tests/`는 Node 24에서 디렉터리 인자를 오해석해 실패한다.
- `lib/professional-subjects.ts`는 **JSON을 import하지 않는다.** `node:test`의 `.mjs`가 직접 import해야 하기 때문. 데이터 결합은 `data/professional-subjects.ts`가 담당한다.
- 전문교과는 **학교가 개설한 것만** 추천 목록에 추가한다. 미개설 전문교과는 "미개설 과목" 아코디언에도 넣지 않는다.
- 오버라이드는 area 기본값을 **대체**한다(병합 아님). `professionalArea`가 `undefined`이면 항상 `[]`.
- 근거 문구는 **사실만 진술**한다. 대입 반영 권위를 주장하지 않는다.
- 배포 경로: 효자고 = `main` 브랜치의 `app/`. 커리컴퍼스 = `codex/generic-curriculum-assistant-clean` 브랜치의 `generic-app/` (워크트리 `~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl`). 개발 브랜치는 `codex/generic-curriculum-assistant`.
- 작업에 변화가 생길 때마다 `HANDOFF.md`를 즉시 갱신한다.

---

### Task 1: 순수 매핑 모듈 (효자고)

전문교과 과목명·계열을 관심분야 태그로 환산하는 순수 함수와 매핑 테이블. JSON import 없음.

**Files:**
- Create: `app/src/lib/professional-subjects.ts`
- Test: `app/tests/professional-subjects.test.mjs`

**Interfaces:**
- Consumes: (없음 — 순수 모듈)
- Produces:
  - `AREA_TO_TAGS: Record<string, string[]>`
  - `SUBJECT_OVERRIDES: Record<string, string[]>`
  - `resolveTagsForProfessional(name: string, professionalArea: string | undefined): string[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`app/tests/professional-subjects.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  AREA_TO_TAGS,
  resolveTagsForProfessional,
} from "../src/lib/professional-subjects.ts";

test("area 기본값으로 태그를 해석한다", () => {
  assert.deepEqual(resolveTagsForProfessional("재료 일반", "기계"), ["mechanical-elec"]);
  assert.deepEqual(resolveTagsForProfessional("공중 보건", "보건·복지"), [
    "nursing-health",
    "psychology-social",
  ]);
});

test("오버라이드가 area 기본값을 대체한다", () => {
  // 정보·통신 area는 cs-ai만 주지만, 프로그래밍은 기계공학 지망생에게도 권장할 만하다
  assert.deepEqual(resolveTagsForProfessional("프로그래밍", "정보·통신"), [
    "cs-ai",
    "mechanical-elec",
  ]);
});

test("professionalArea가 없으면 빈 배열", () => {
  // 커리컴퍼스 업로드 과목이 정적 카탈로그에 미매칭인 경우
  assert.deepEqual(resolveTagsForProfessional("프로그래밍", undefined), []);
});

test("모호한 area는 오버라이드 없이는 빈 배열", () => {
  assert.deepEqual(AREA_TO_TAGS["예술계열"], []);
  assert.deepEqual(resolveTagsForProfessional("무용의 이해", "예술계열"), []);
});

test("예술계열은 오버라이드로 미술/음악이 갈린다", () => {
  assert.deepEqual(resolveTagsForProfessional("드로잉", "예술계열"), ["art-design"]);
  assert.deepEqual(resolveTagsForProfessional("합창·합주", "예술계열"), ["music-perform"]);
});

test("오버라이드는 area와 무관한 태그를 추가할 수 있다", () => {
  assert.ok(resolveTagsForProfessional("고급 생명과학", "과학계열").includes("medical"));
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd app && node --test tests/professional-subjects.test.mjs`
Expected: FAIL — `Cannot find module '../src/lib/professional-subjects.ts'`

- [ ] **Step 3: 모듈 구현**

`app/src/lib/professional-subjects.ts`:

```ts
/**
 * 전문교과 → 관심분야 태그 매핑 (순수 로직).
 *
 * JSON을 import하지 않는다 — tests/*.mjs가 이 파일을 직접 import하기 때문.
 * 데이터 결합은 data/professional-subjects.ts가 담당한다.
 */

/**
 * professionalArea(22종) → 관심분야 태그 기본값.
 *
 * 빈 배열은 "추천하지 않음"을 뜻한다. 한 area에 여러 계열이 섞여 있어
 * 기본값을 주면 오추천이 확정되는 경우(예술계열: 음악·미술·무용·연극·영화·
 * 사진·문예창작 62과목)에는 기본값을 두지 않고 오버라이드로만 채운다.
 * 미분류 과목은 현재 동작(추천 안 됨)과 같으므로 회귀가 아니다.
 */
export const AREA_TO_TAGS: Record<string, string[]> = {
  "정보·통신": ["cs-ai"],
  기계: ["mechanical-elec"],
  "전기·전자": ["mechanical-elec"],
  재료: ["mechanical-elec"],
  건설: ["architecture"],
  화학공업: ["biotech"],
  "환경·안전": ["environment"],
  "경영·금융": ["business"],
  음식조리: ["food-nutrition"],
  식품가공: ["food-nutrition"],
  "농림·수산": ["food-nutrition", "bio-earth"],
  "보건·복지": ["nursing-health", "psychology-social"],
  외국어계열: ["global"],
  국제계열: ["global"],
  체육계열: ["sports"],
  "섬유･의류": ["art-design"],
  "인쇄･출판･공예": ["art-design"],
  "디자인·문화콘텐츠": ["art-design", "media-comm"],
  과학계열: ["natural-science"],
  예술계열: [],
  "미용·관광·레저": [],
  전문공통: [],
};

/** 과목명 단위 오버라이드. area 기본값을 대체한다(병합하지 않는다). */
export const SUBJECT_OVERRIDES: Record<string, string[]> = {
  // area 기본값을 넓히는 사례
  프로그래밍: ["cs-ai", "mechanical-elec"],
  정보과학: ["cs-ai", "natural-science"],
  "이산 수학": ["natural-science", "cs-ai"],
  "고급 물리학": ["natural-science", "mechanical-elec"],
  "물리학 실험": ["natural-science", "mechanical-elec"],
  "고급 화학": ["natural-science", "biotech"],
  "화학 실험": ["natural-science", "biotech"],
  "고급 생명과학": ["bio-earth", "biotech", "medical"],
  "생명과학 실험": ["bio-earth", "biotech", "medical"],
  "고급 지구과학": ["bio-earth"],
  "지구과학 실험": ["bio-earth"],

  // 예술계열 — area 기본값 없음
  드로잉: ["art-design"],
  "미술 이론": ["art-design"],
  미술사: ["art-design"],
  "미술 전공 실기": ["art-design"],
  "조형 탐구": ["art-design"],
  "미술 매체 탐구": ["art-design"],
  "미술과 사회": ["art-design"],
  "평면 조형": ["art-design"],
  "입체 조형": ["art-design"],
  "매체 미술": ["art-design"],
  "합창·합주": ["music-perform"],
  합창: ["music-perform"],
  합주: ["music-perform"],
  "음악 이론": ["music-perform"],
  음악사: ["music-perform"],
  "시창·청음": ["music-perform"],
  "음악 전공 실기": ["music-perform"],
  "음악 공연 실습": ["music-perform"],
  "음악과 문화": ["music-perform"],
  "공연 실습": ["music-perform"],

  // 미용·관광·레저 — area 기본값 없음
  "관광 일반": ["global"],
  "관광 사업": ["global"],
  "관광 서비스": ["global"],
  "관광 영어": ["global"],
  "관광 일본어": ["global"],
  "관광 중국어": ["global"],
  "미용의 기초": ["art-design"],
  "미용 안전·보건": ["art-design"],
};

/**
 * 전문교과 과목이 속하는 관심분야 태그.
 * professionalArea가 없으면(커리컴퍼스 fallback Subject) 항상 [].
 */
export function resolveTagsForProfessional(
  name: string,
  professionalArea: string | undefined
): string[] {
  if (!professionalArea) return [];
  const override = SUBJECT_OVERRIDES[name];
  if (override) return override;
  return AREA_TO_TAGS[professionalArea] ?? [];
}
```

주의: 공백이 있는 객체 키(`"미술 이론"`, `"미술과 사회"` 등)는 반드시 따옴표로 감싼다. 공백 없는 키(`프로그래밍`, `합창`, `미술사`)는 따옴표가 없어도 된다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd app && node --test tests/professional-subjects.test.mjs`
Expected: PASS — 6 tests

- [ ] **Step 5: 기존 테스트 회귀 확인**

Run: `cd app && node --test tests/*.mjs`
Expected: PASS — 기존 consensus 테스트 포함 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add app/src/lib/professional-subjects.ts app/tests/professional-subjects.test.mjs
git commit -m "feat: 전문교과 → 관심분야 태그 순수 매핑 모듈"
```

---

### Task 2: 데이터 결합 모듈 (효자고)

`subjects.json`에서 전문교과를 골라 태그로 필터링한다.

**Files:**
- Create: `app/src/data/professional-subjects.ts`

**Interfaces:**
- Consumes: `resolveTagsForProfessional` (Task 1), `subjects`/`Subject` from `@/data/subjects`
- Produces:
  - `PROFESSIONAL_AREA: "전문교과"`
  - `isProfessionalSubject(subject: Subject): boolean`
  - `getProfessionalSubjectsForTags(tags: string[]): Subject[]`

- [ ] **Step 1: 모듈 구현**

`app/src/data/professional-subjects.ts`:

```ts
import { subjects, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";

export const PROFESSIONAL_AREA = "전문교과";

/** 전문교과이면서 계열 정보(professionalArea)를 가진 과목인지 */
export function isProfessionalSubject(subject: Subject): boolean {
  return subject.area === PROFESSIONAL_AREA && !!subject.professionalArea;
}

/**
 * 관심분야 태그들에 해당하는 전문교과 목록.
 * 개설 여부 필터는 호출자(추천 화면)가 담당한다.
 */
export function getProfessionalSubjectsForTags(tags: string[]): Subject[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  return subjects.filter((subject) => {
    if (!isProfessionalSubject(subject)) return false;
    return resolveTagsForProfessional(subject.name, subject.professionalArea).some((tag) =>
      tagSet.has(tag)
    );
  });
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `cd app && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 실제 데이터로 동작 확인**

`프로그래밍`이 `cs-ai`와 `mechanical-elec` 양쪽에서 잡히는지, 미개설 전문교과가 포함되는지(개설 필터는 아직 없으므로 포함되어야 정상) 확인한다.

Run:
```bash
cd app && cat > /tmp/prof_check.mjs <<'EOF'
import { subjects } from "./src/data/subjects.ts";
import { resolveTagsForProfessional } from "./src/lib/professional-subjects.ts";
const forTag = (tag) =>
  subjects
    .filter((s) => s.area === "전문교과" && s.professionalArea)
    .filter((s) => resolveTagsForProfessional(s.name, s.professionalArea).includes(tag))
    .map((s) => s.name);
console.log("cs-ai:", forTag("cs-ai"));
console.log("mechanical-elec:", forTag("mechanical-elec"));
EOF
node --experimental-strip-types /tmp/prof_check.mjs; rm -f /tmp/prof_check.mjs
```

Expected: `cs-ai` 목록에 `프로그래밍`과 `정보과학`이 포함되고, `mechanical-elec` 목록에도 `프로그래밍`이 포함된다.

> `@/` 별칭이 plain node에서 해석되지 않아 위 스크립트가 실패하면, 상대경로 import(`./src/data/subjects.ts`)만 쓰는 위 형태를 유지하되 `subjects.ts`가 내부적으로 `@/`를 쓰면 이 확인은 건너뛰고 Task 3의 브라우저 검증으로 대체한다.

- [ ] **Step 4: 커밋**

```bash
git add app/src/data/professional-subjects.ts
git commit -m "feat: 태그별 전문교과 조회 데이터 모듈"
```

---

### Task 3: SubjectCard 라벨 + 추천 화면 통합 (효자고)

전문교과를 두 플로우(관심사별·계열별) 추천 목록에 개설분만 추가하고, 카드에 라벨을 표시한다.

**Files:**
- Modify: `app/src/components/SubjectCard.tsx`
- Modify: `app/src/app/(main)/recommend/page.tsx`

**Interfaces:**
- Consumes: `getProfessionalSubjectsForTags`, `isProfessionalSubject` (Task 2), `getInterestTagsByDept` from `@/data/career-mapping` (기존)
- Produces: `SubjectCardProps.professionalOffered?: boolean`

**중요 — `professionalOffered`가 필요한 이유:** `정보과학`은 `area="전문교과"`이면서 이미 `career-mapping`의 추천 목록에도 있다. 학교가 개설하지 않으면 이 과목은 "우리 학교 미개설 과목" 아코디언에 렌더된다. 카드가 `subject`만 보고 "우리 학교 개설"이라고 적으면 **거짓 문구**가 된다. 따라서 개설 여부를 호출자가 명시적으로 전달한다.

- [ ] **Step 1: SubjectCard에 prop 추가**

`app/src/components/SubjectCard.tsx` — `SubjectCardProps`에 한 줄 추가:

```ts
  consensus?: ConsensusBadge;
  /** 전문교과가 우리 학교 편제에 있는지. 라벨 문구를 가른다. */
  professionalOffered?: boolean;
```

함수 시그니처 구조분해에도 추가:

```ts
  detailReturnPath,
  consensus,
  professionalOffered,
}: SubjectCardProps) {
```

- [ ] **Step 2: 라벨 렌더링 추가**

`consensus` 블록(`{consensus && (consensus.core > 0 || ...)}` 로 시작하는 `<p>`) **바로 다음**에 삽입:

```tsx
              {subject.area === "전문교과" && subject.professionalArea && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                    전문교과
                  </span>
                  <span className="font-medium">
                    {professionalOffered && "우리 학교 개설 · "}
                    {subject.professionalArea} 계열
                  </span>
                </p>
              )}
```

좌측 컬러바를 쓰지 않는다.

- [ ] **Step 3: recommend 페이지 import 추가**

`app/src/app/(main)/recommend/page.tsx` 상단:

```ts
import {
  getProfessionalSubjectsForTags,
  isProfessionalSubject,
} from "@/data/professional-subjects";
```

`getInterestTagsByDept`는 이미 `@/data/career-mapping`에서 import되어 있다.

- [ ] **Step 4: DeptRecommendContent에 전문교과 합류**

`DeptRecommendContent`의 `bySemester` useMemo 안, `(["일반선택","진로선택","융합선택"] as const).forEach(...)` 루프가 끝난 **직후**에 삽입:

```ts
    // 전문교과: 학교 개설분만 후보에 추가
    getProfessionalSubjectsForTags(getInterestTagsByDept(deptName)).forEach((subject) => {
      if (seen.has(subject.id)) return;
      if (excludedNames.has(subject.name)) return;
      const semesters = selectableMap.get(subject.name) || [];
      const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
      if (!isAvailable) return; // 미개설 전문교과는 노출하지 않음
      seen.add(subject.id);
      allItems.push({ subject, isAvailable: true, suneung: subject.suneung === true, semesters });
    });
```

같은 useMemo의 deps 배열에 `deptName`을 추가한다.

- [ ] **Step 5: InterestRecommendContent에 전문교과 합류**

`InterestRecommendContent`의 `bySemester` useMemo 안, `interests.forEach(...)` 루프가 끝난 **직후**(`const unavail = ...` 앞)에 삽입:

```ts
    // 전문교과: 학교 개설분만 후보에 추가
    getProfessionalSubjectsForTags(interests).forEach((subject) => {
      if (seen.has(subject.id)) return;
      if (excludedNames.has(subject.name)) return;
      const semesters = selectableMap.get(subject.name) || [];
      const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
      if (!isAvailable) return;
      seen.add(subject.id);
      allItems.push({ subject, isAvailable: true, suneung: subject.suneung === true, semesters });
    });
```

- [ ] **Step 6: 학기 내 정렬 — 보통교과 먼저, 전문교과 뒤**

두 컴포넌트 모두, `semMap`을 채운 직후(반환 직전)에 삽입:

```ts
    // 보통교과 먼저, 전문교과 뒤 (Array.prototype.sort는 안정 정렬)
    semMap.forEach((list) =>
      list.sort(
        (a, b) => Number(isProfessionalSubject(a.subject)) - Number(isProfessionalSubject(b.subject))
      )
    );
```

- [ ] **Step 7: SubjectCard 호출부에 `professionalOffered` 전달**

`recommend/page.tsx`의 SubjectCard 호출 4곳 중, **학기별 섹션의 2곳**(Dept·Interest 각 1곳)에 추가:

```tsx
                      professionalOffered
```

**미개설 아코디언의 2곳에는 추가하지 않는다.** (기본값 `undefined` → "우리 학교 개설" 문구 미표시)

- [ ] **Step 8: 빌드 + 타입체크**

Run: `cd app && npm run build`
Expected: `✓ Compiled successfully`, TypeScript 통과

- [ ] **Step 9: 로컬 prod 서버로 실제 확인**

```bash
cd app && npm run start -- -p 3111
```

브라우저(또는 Playwright)로 확인:
- `http://localhost:3111/recommend?interests=cs-ai` → `프로그래밍` 카드에 「전문교과」 배지 + "우리 학교 개설 · 정보·통신 계열"
- `http://localhost:3111/recommend?dept=기계공학과` → `프로그래밍` 노출 (오버라이드가 `mechanical-elec`을 더했으므로)
- 두 화면 모두 `프로그래밍`에 「핵심과목 지정 N개교」 배지가 **없어야** 한다
- 미개설 전문교과(예: `고급 지구과학`)가 어디에도 없어야 한다

확인 후 서버 종료.

- [ ] **Step 10: 커밋**

```bash
git add app/src/components/SubjectCard.tsx "app/src/app/(main)/recommend/page.tsx"
git commit -m "feat: 추천 목록에 학교 개설 전문교과 노출 + 전문교과 라벨"
```

---

### Task 4: 로드맵 추천 표시 동기화 (효자고)

`/recommend`에서 추천으로 뜬 전문교과가 `/roadmap`에서도 추천으로 표시되게 한다. 커버리지 게이지는 건드리지 않는다.

**Files:**
- Modify: `app/src/app/(main)/roadmap/page.tsx`

**Interfaces:**
- Consumes: `getProfessionalSubjectsForTags` (Task 2), `getInterestTagsByDept` (기존, 이미 import됨)

- [ ] **Step 1: import 추가**

```ts
import { getProfessionalSubjectsForTags } from "@/data/professional-subjects";
```

- [ ] **Step 2: `buildRecommendedNames`에 전문교과 추가**

기존 함수를 아래로 교체:

```ts
function buildRecommendedNames(interests: string[]): Set<string> {
  const names = new Set<string>();
  interests.forEach((interestId) => {
    const rec = getRecommendedSubjectsByInterest(interestId);
    rec["일반선택"].forEach((s) => names.add(s.name));
    rec["진로선택"].forEach((s) => names.add(s.name));
    rec["융합선택"].forEach((s) => names.add(s.name));
  });
  getProfessionalSubjectsForTags(interests).forEach((s) => names.add(s.name));
  return names;
}
```

- [ ] **Step 3: `buildRecommendedNamesFromDept`에 전문교과 추가**

```ts
function buildRecommendedNamesFromDept(deptName: string): Set<string> {
  const names = new Set<string>();
  const deptData = getDepartmentRecommendation(deptName);
  if (!deptData) return names;

  deptData.subjects["일반선택"].forEach((n) => names.add(n));
  deptData.subjects["진로선택"].forEach((n) => names.add(n));
  deptData.subjects["융합선택"].forEach((n) => names.add(n));

  getProfessionalSubjectsForTags(getInterestTagsByDept(deptName)).forEach((s) => names.add(s.name));

  return names;
}
```

`getDepartmentRecommendation`이 `null`을 반환하면 전문교과도 추가하지 않는다(위 조기 반환 유지).

- [ ] **Step 4: 커버리지 게이지 불변 확인**

`coverage` useMemo는 **수정하지 않는다.** 전문교과는 대교협 `coreCounts`에 없으므로 분모에 들어가지 않는다.

Run: `cd app && npm run build && npm run start -- -p 3111`

브라우저로 `http://localhost:3111/roadmap?dept=기계공학과` 확인:
- 「대학 핵심과목」 게이지 백분율이 **36%** (이 변경 전과 동일)
- `프로그래밍`이 추천 과목으로 표시됨

서버 종료.

- [ ] **Step 5: 전체 테스트 + 커밋**

Run: `cd app && node --test tests/*.mjs`
Expected: PASS

```bash
git add "app/src/app/(main)/roadmap/page.tsx"
git commit -m "feat: 로드맵 추천 표시에 전문교과 반영"
```

---

### Task 5: FAQ + 인라인 근거 (효자고)

**Files:**
- Modify: `app/src/app/faq/page.tsx` (`FAQS` 배열)
- Modify: `app/src/app/(main)/recommend/page.tsx` (`RecommendBasisNote`)

- [ ] **Step 1: FAQ 항목 추가**

`app/src/app/faq/page.tsx`의 `FAQS` 배열 끝에 추가(기존 항목의 필드 구조를 그대로 따를 것 — 파일을 먼저 읽어 `Faq` 타입의 필드명을 확인한다):

```ts
  {
    q: "프로그래밍 같은 전문교과는 어떤 근거로 추천되나요?",
    a: "대교협 「2028학년도 권역별 대학별 권장과목」은 대입에 반영되는 보통교과(국어·수학·영어·탐구) 위주로 작성되어 전문교과를 다루지 않습니다. 자료에 없다는 것이 «권장하지 않는다»는 뜻은 아닙니다. 전문교과 추천은 두 가지 근거로 표시됩니다. 첫째, 우리 학교가 실제로 개설한 과목입니다. 둘째, 과목이 속한 전문교과 계열이 선택한 관심 계열과 일치합니다. 대학별 반영과목 근거가 아니므로 「핵심과목 지정 N개교」 배지가 붙지 않습니다.",
  },
```

- [ ] **Step 2: `RecommendBasisNote`에 한 줄 보강**

`RecommendBasisNote`의 마지막 문단 뒤, `/faq` 링크 앞에 문단 하나 추가:

```tsx
        <p>
          「전문교과」 라벨이 붙은 과목은 우리 학교가 개설한 전문교과입니다. 대교협 자료는 보통교과
          위주라 전문교과를 다루지 않으므로, 대학별 반영과목 배지가 붙지 않습니다.
        </p>
```

- [ ] **Step 3: 빌드 + 확인**

Run: `cd app && npm run build`
Expected: 통과

`http://localhost:3111/faq`에 새 항목이 보이고, `/recommend?interests=cs-ai`의 접이식 근거 설명에 새 문단이 있는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/src/app/faq/page.tsx "app/src/app/(main)/recommend/page.tsx"
git commit -m "docs: 전문교과 추천 근거 FAQ + 인라인 설명"
```

---

### Task 6: 커리컴퍼스 포팅

효자고 구현을 `generic-app/`에 옮긴다. 구조는 동일하되 `subjectCatalog` 주입 패턴을 따른다.

**Files (워크트리 `~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl`, 브랜치 `codex/generic-curriculum-assistant-clean`):**
- Create: `generic-app/src/lib/professional-subjects.ts` (Task 1과 **동일 내용**)
- Create: `generic-app/src/data/professional-subjects.ts`
- Modify: `generic-app/src/components/SubjectCard.tsx`
- Modify: `generic-app/src/app/s/[shareToken]/recommend/page.tsx`
- Modify: `generic-app/src/app/s/[shareToken]/roadmap/page.tsx`
- Modify: `generic-app/src/app/faq/page.tsx`

**Interfaces:**
- Produces: `getProfessionalSubjectsForTags(tags: string[], resolveSubject?: (name: string) => Subject | undefined): Subject[]`

- [ ] **Step 1: 순수 모듈 복사**

`app/src/lib/professional-subjects.ts`를 `generic-app/src/lib/professional-subjects.ts`로 **내용 변경 없이** 복사한다.

- [ ] **Step 2: 데이터 모듈 작성 (resolver 주입)**

`generic-app`의 `getRecommendedSubjectsByInterest(interestId, resolveSubject)` 패턴을 따른다. 업로드 학교의 과목 객체를 쓰기 위해 resolver를 받는다.

`generic-app/src/data/professional-subjects.ts`:

```ts
import { subjects, getSubjectByName, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";

export const PROFESSIONAL_AREA = "전문교과";

export function isProfessionalSubject(subject: Subject): boolean {
  return subject.area === PROFESSIONAL_AREA && !!subject.professionalArea;
}

/**
 * 관심분야 태그들에 해당하는 전문교과 목록.
 * 업로드 편제 과목까지 매칭하려면 subjectCatalog.getSubjectByName 주입.
 * 개설 여부 필터는 호출자가 담당한다.
 */
export function getProfessionalSubjectsForTags(
  tags: string[],
  resolveSubject: (name: string) => Subject | undefined = getSubjectByName,
): Subject[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  const result: Subject[] = [];
  subjects.forEach((staticSubject) => {
    if (!isProfessionalSubject(staticSubject)) return;
    const tagsForSubject = resolveTagsForProfessional(
      staticSubject.name,
      staticSubject.professionalArea,
    );
    if (!tagsForSubject.some((tag) => tagSet.has(tag))) return;
    result.push(resolveSubject(staticSubject.name) ?? staticSubject);
  });
  return result;
}
```

- [ ] **Step 3: SubjectCard 수정**

`generic-app/src/components/SubjectCard.tsx`에 Task 3 Step 1~2와 **동일한** `professionalOffered` prop과 라벨 블록을 추가한다. (이 파일은 `basePath` prop이 추가로 있다 — 기존 구조를 유지한 채 삽입한다.)

- [ ] **Step 4: recommend 페이지 수정**

`generic-app/src/app/s/[shareToken]/recommend/page.tsx`:

- import 추가:
  ```ts
  import {
    getProfessionalSubjectsForTags,
    isProfessionalSubject,
  } from "@/data/professional-subjects";
  ```
  (`getInterestTagsByDept`는 이미 import되어 있다.)

- `DeptRecommendContent`의 `bySemester` useMemo, 카테고리 루프 직후:
  ```ts
    getProfessionalSubjectsForTags(
      getInterestTagsByDept(deptName),
      subjectCatalog.getSubjectByName,
    ).forEach((subject) => {
      if (seen.has(subject.id)) return;
      if (excludedNames.has(subject.name)) return;
      const semesters = selectableMap.get(subject.name) || [];
      const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
      if (!isAvailable) return;
      seen.add(subject.id);
      allItems.push({ subject, isAvailable: true, suneung: subject.suneung === true, semesters });
    });
  ```
  deps 배열에 `deptName`, `subjectCatalog`가 포함되어 있는지 확인하고, 없으면 추가한다.

- `InterestRecommendContent`도 동일하되 첫 인자를 `interests`로 한다.

- 두 컴포넌트의 `semMap` 채운 직후 안정 정렬 추가 (Task 3 Step 6과 동일 코드).

- 학기별 섹션의 SubjectCard 2곳에 `professionalOffered` 전달. 미개설 아코디언 2곳에는 전달하지 않는다.

- [ ] **Step 5: roadmap 페이지 수정**

`generic-app/src/app/s/[shareToken]/roadmap/page.tsx`의 `buildRecommendedNames`와 `buildRecommendedNamesFromDept`는 `subjectCatalog` 인자를 추가로 받는다. 각 함수 반환 직전에 추가:

```ts
  getProfessionalSubjectsForTags(interests, subjectCatalog.getSubjectByName).forEach((s) =>
    names.add(s.name),
  );
```

```ts
  getProfessionalSubjectsForTags(
    getInterestTagsByDept(deptName),
    subjectCatalog.getSubjectByName,
  ).forEach((s) => names.add(s.name));
```

`coverage` useMemo는 수정하지 않는다. `getInterestTagsByDept` import가 없으면 추가한다.

- [ ] **Step 6: FAQ 항목 추가**

`generic-app/src/app/faq/page.tsx`의 `FAQS` 배열에 Task 5 Step 1과 같은 항목을 추가하되, "우리 학교"가 공유 뷰 문맥에서도 맞으므로 문구는 그대로 둔다.

`RecommendBasisNote`에도 Task 5 Step 2의 문단을 추가한다.

- [ ] **Step 7: 빌드**

Run: `cd generic-app && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 8: 커밋**

```bash
git add generic-app/src/lib/professional-subjects.ts \
        generic-app/src/data/professional-subjects.ts \
        generic-app/src/components/SubjectCard.tsx \
        "generic-app/src/app/s/[shareToken]/recommend/page.tsx" \
        "generic-app/src/app/s/[shareToken]/roadmap/page.tsx" \
        generic-app/src/app/faq/page.tsx
git commit -m "feat: 전문교과 추천 보정 (커리컴퍼스 포팅)"
```

---

### Task 7: 배포 + 라이브 검증

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: 효자고 배포**

개발 브랜치를 푸시하고 `main`에 머지한다(임시 워크트리 사용, 메인 워킹트리 오염 방지).

```bash
git push origin codex/generic-curriculum-assistant
git worktree add ../p2c-main-merge4 main
cd ../p2c-main-merge4
git merge codex/generic-curriculum-assistant --no-edit
git push origin main
cd - && git worktree remove ../p2c-main-merge4 --force && git worktree prune
```

- [ ] **Step 2: 커리컴퍼스 배포**

```bash
cd ~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl
git push origin codex/generic-curriculum-assistant-clean
```

- [ ] **Step 3: 라이브 검증 (Playwright — 배지는 클라이언트 렌더라 curl로 안 잡힌다)**

배포 완료까지 기다린 뒤 아래 4곳을 브라우저로 확인한다.

| URL | 기대 |
| --- | --- |
| `https://hyoja-curriculum.vercel.app/recommend?interests=cs-ai` | `프로그래밍` + 「전문교과」 라벨, 대교협 배지 없음 |
| `https://hyoja-curriculum.vercel.app/recommend?dept=기계공학과` | `프로그래밍` 노출 |
| `https://hyoja-curriculum.vercel.app/roadmap?dept=기계공학과` | 게이지 **36%** (불변), `프로그래밍` 추천 표시 |
| `https://cccompass.xyz/s/cYrKU6tM1r2EYzxia3ubO_9T7YQkXF13/recommend?dept=기계공학과` | 「전문교과」 라벨 동작 (의정부여고 편제에 전문교과가 없으면 미노출이 정상 — 편제 확인 후 판단) |

DOM 확인 스니펫:

```js
() => {
  const b = document.body.innerText;
  return {
    hasProgramming: b.includes("프로그래밍"),
    hasProfLabel: b.includes("전문교과"),
    hasOfferedCopy: b.includes("우리 학교 개설"),
    gauge: (b.match(/\d+%/g) || [])[0],
  };
}
```

- [ ] **Step 4: `HANDOFF.md` 갱신**

상단에 새 항목을 추가한다. 증상·원인·수정 범위·검증·커밋 해시를 기록한다.

- [ ] **Step 5: 커밋 + 푸시**

```bash
git add HANDOFF.md
git commit -m "docs: 전문교과 추천 보정 기록"
git push origin codex/generic-curriculum-assistant
```

---

## Self-Review

**스펙 커버리지**

| 스펙 요구 | 담당 태스크 |
| --- | --- |
| `lib/professional-subjects.ts` 순수 모듈 + 매핑 테이블 | Task 1 |
| `data/professional-subjects.ts` 데이터 결합 | Task 2 |
| 개설분만 필터 | Task 3 (Step 4·5의 `if (!isAvailable) return;`) |
| 중복 제거 (`정보과학`) | Task 3 (`seen` Set) |
| 통합 노출 + 「전문교과」 라벨 | Task 3 |
| 보통교과 먼저 정렬 | Task 3 Step 6 |
| 로드맵 추천 표시 동기화 | Task 4 |
| 커버리지 게이지 불변 | Task 4 Step 4 (검증) |
| FAQ + 인라인 근거 | Task 5 |
| 커리컴퍼스 포팅 | Task 6 |
| 테스트 5종 | Task 1 (6종으로 작성) |
| 엣지: `professionalArea` 없음 → `[]` | Task 1 테스트 3 |
| 엣지: 오버라이드가 area 대체 | Task 1 테스트 2 |
| 엣지: 빈 배열 area | Task 1 테스트 4 |

**스펙과의 차이 (의도적)**

- 스펙은 `SubjectCard`에 `professionalArea?: string` prop 추가를 제안했으나, `SubjectCard`는 이미 `subject: Subject` 전체를 받고 `Subject`에 `area`·`professionalArea`가 있다. prop을 새로 만들지 않고 `subject`에서 파생한다.
- 대신 `professionalOffered?: boolean` prop을 추가한다. `정보과학`이 미개설 상태로 "미개설 과목" 아코디언에 렌더될 때 "우리 학교 개설"이 거짓 문구가 되는 것을 막기 위함이다. 스펙 작성 시 놓친 케이스다.

**타입 일관성**

- `resolveTagsForProfessional(name, professionalArea)` — Task 1 정의, Task 2·6에서 동일 시그니처로 호출.
- `getProfessionalSubjectsForTags(tags)` — 효자고. `getProfessionalSubjectsForTags(tags, resolveSubject?)` — 커리컴퍼스(선택 인자 추가, 기본값 있음).
- `isProfessionalSubject(subject)` — Task 2 정의, Task 3 Step 6 정렬에서 사용.
- `professionalOffered?: boolean` — Task 3 정의, Task 6에서 동일 이름 사용.
