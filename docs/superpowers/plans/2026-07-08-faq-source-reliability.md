# 추천 근거 인라인 설명 + FAQ 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추천 화면에 "이 추천은 어떤 근거로 만들어졌나요?" 인라인 접이식 설명을 달고, 자료 출처·신뢰도 문의에 답하는 독립 `/faq` 페이지를 효자고·커리컴퍼스 양쪽에 추가한다.

**Architecture:** FAQ 페이지는 로직 없는 정적 콘텐츠 — 페이지 파일 내부의 로컬 `FaqItem` 컴포넌트 + 문항 배열 상수로 구성(별도 데이터 파일 없음). 인라인 설명은 recommend 페이지 모듈 레벨에 작은 `RecommendBasisNote` 컴포넌트를 만들어 두 콘텐츠 컴포넌트(Dept/Interest)에서 공용. 정적 UI라 단위 테스트 없음 — 검증은 lint+build+육안.

**Tech Stack:** Next.js 15/16 App Router, TypeScript, Tailwind, lucide-react, 기존 ui/accordion 또는 자체 details 토글

**Spec:** `docs/superpowers/specs/2026-07-08-faq-source-reliability-design.md`

## Global Constraints

- 좌측 컬러바(border-l accent) 절대 금지
- 신규 UI 스타일 도입 금지 — 기존 `CompetencyAccordion` 접이식 패턴/토큰 재사용
- FAQ 문항은 페이지 파일 내 배열 상수로 관리(별도 데이터 파일 금지, YAGNI)
- 효자고/커리컴퍼스 카피 차이는 Q1·Q7 두 항목뿐 — 각 앱 파일에서 해당 문구만 다르게
- FAQ 카피는 스펙의 "FAQ 카피 전문" 문구를 verbatim 사용
- 효자고 검증: `cd app && npm run lint && npm run build` / 커리컴퍼스 검증: `cd generic-app && npx pnpm run build`
- 배포 경로: 효자고=codex→main 머지, 커리컴퍼스=clean 브랜치 푸시
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 효자고 `/faq` 페이지 + 푸터 링크

**Files:**
- Create: `app/src/app/faq/page.tsx`
- Modify: `app/src/components/Footer.tsx`

**Interfaces:**
- Produces: `/faq` 라우트(효자고). 다른 태스크는 이 경로로 링크만 건다.

- [ ] **Step 1: FAQ 페이지 생성**

`app/src/app/faq/page.tsx` — 스펙 "FAQ 카피 전문"의 Q1~Q6 사용(Q7은 커리컴퍼스 전용이라 효자고엔 제외). Q1은 효자고 변형("서울진로진학정보센터의 「2022 개정 교육과정 선택 과목 안내서」") 사용:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "추천 과목은 어떤 자료를 근거로 하나요?",
    a: "두 가지 자료를 씁니다. ① 계열별 추천 과목의 뼈대는 서울진로진학정보센터의 「2022 개정 교육과정 선택 과목 안내서」입니다. ② 각 과목이 대학에서 얼마나 요구되는지는 한국대학교육협의회(대교협)가 발표한 「2028학년도 권역별 대학별 권장과목」(전국 47개 대학)과 대조해 확인합니다. 두 자료를 교차 검증해, 안내서가 추천하지만 대학 요구 근거가 없는 과목과 대학이 요구하지만 빠진 과목을 점검했습니다.",
  },
  {
    q: "과목에 붙은 「핵심 N개교」·「권장 M개교」는 무슨 뜻인가요?",
    a: "선택한 계열의 모집단위를 기준으로, 대교협 자료에서 그 과목을 '핵심과목'(필수적 이수 권장) 또는 '권장과목'으로 지정한 대학의 수입니다. 예를 들어 「핵심 15개교」는 그 계열에서 15개 대학이 해당 과목을 핵심과목으로 제시했다는 뜻입니다. 뱃지가 없는 과목은 대입 반영과목 목록에는 없지만, 탐구·역량 강화에 도움이 되는 추천 과목입니다.",
  },
  {
    q: "로드맵의 '대학 핵심과목 N%'는 어떻게 계산되나요?",
    a: "선택한 계열에서 여러 대학(3개교 이상)이 핵심과목으로 꼽은 과목 중, 우리 학교에서 들을 수 있는 과목을 기준(분모)으로, 현재 로드맵에 담은 과목의 비율입니다. 학교에 개설되지 않은 과목은 계산에서 빼되 따로 안내합니다.",
  },
  {
    q: "이 추천만 따르면 대학에 갈 수 있나요?",
    a: "아닙니다. 대교협 자료는 「필수 이수 기준」이 아니라 참고용 안내이며, 대교협도 이를 명시하고 있습니다. 실제 지원 대학·학과의 최신 모집요강을 반드시 함께 확인하세요. 이 서비스는 3년간의 과목 선택 로드맵을 설계하는 데 방향을 잡아주는 도구입니다.",
  },
  {
    q: "자료는 언제 기준이고 얼마나 자주 갱신되나요?",
    a: "현재 반영과목 자료는 대교협이 2026년 2월 발표한 「2028학년도 권역별 대학별 권장과목」 기준입니다. 이 자료는 확정본이 아니라 대학별 발표에 따라 수시로 갱신되므로, 대학 수·과목은 이후 변동될 수 있습니다.",
  },
  {
    q: "우리 학교에 없는 과목이 추천되면 어떻게 하나요?",
    a: "공동교육과정(다른 학교·거점센터에서 수강), 온라인학교, 소인수 과목 개설 요청 등을 학교 선생님과 상담해보세요. 로드맵의 커버리지에서도 '우리 학교 미개설' 과목을 따로 표시합니다.",
  },
];

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{faq.q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">자주 묻는 질문</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          추천 과목의 근거와 자료 출처에 대한 안내입니다.
        </p>
        <div className="space-y-2.5">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} faq={faq} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 푸터에 FAQ 링크 추가**

`app/src/components/Footer.tsx`의 "자료 출처" `<p>` 아래에 추가(현재 Footer는 만든이/자료출처/대입반영과목 3줄 구조):

```tsx
<p>
  <Link href="/faq" className="underline underline-offset-2 hover:text-foreground/70">
    자주 묻는 질문 · 자료 출처 안내
  </Link>
</p>
```

파일 상단에 `import Link from "next/link";`가 없으면 추가.

- [ ] **Step 3: 검증**

```bash
cd app && npm run lint && npm run build
```

Expected: lint 신규 에러 0, build 성공. `/faq` 라우트가 빌드 출력에 나타남.
육안(선택): `npm run dev` → `/faq` 접속 → 6문항 아코디언 펼침/접힘, 푸터 링크 이동 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/src/app/faq/page.tsx app/src/components/Footer.tsx
git commit -m "feat: 자료 출처·신뢰도 FAQ 페이지 + 푸터 링크"
```

---

### Task 2: 효자고 추천 화면 인라인 근거 설명

**Files:**
- Modify: `app/src/app/(main)/recommend/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `/faq` 라우트
- Produces: 모듈 레벨 `RecommendBasisNote` 컴포넌트(같은 파일 내). 이후 커리컴퍼스 포팅(Task 3)이 동일 컴포넌트를 복제.

- [ ] **Step 1: RecommendBasisNote 컴포넌트 추가**

`recommend/page.tsx`의 `CompetencyAccordion` 정의(21행 부근) 바로 아래에 추가. 파일 상단 import에 `Link`(next/link)가 이미 있는지 확인하고 없으면 추가:

```tsx
// ========== 추천 근거 설명 접이식 ==========
function RecommendBasisNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-3 text-left"
      >
        <p className="text-xs font-semibold text-[var(--primary)]">
          이 추천은 어떤 근거로 만들어졌나요?
        </p>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2 text-sm text-foreground leading-relaxed">
          <p>
            계열별 추천 과목은 <b>2022 개정 교육과정 선택 과목 안내서</b>를 바탕으로,
            대학이 실제 요구하는 과목과 대조해 구성했습니다.
          </p>
          <p>
            과목에 붙은 <b>「핵심 N개교」</b> 뱃지는 한국대학교육협의회(대교협)
            「2028학년도 권역별 대학별 권장과목」(전국 47개 대학)에서 그 과목을 지정한
            대학 수입니다.
          </p>
          <p>
            뱃지가 없는 과목은 대입 반영과목은 아니지만, 탐구활동·세부능력특기사항 등
            역량을 보여주기에 좋은 과목입니다.
          </p>
          <Link
            href="/faq"
            className="inline-block text-[var(--primary)] font-medium underline underline-offset-2"
          >
            자료 출처와 자주 묻는 질문 →
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: DeptRecommendContent에 삽입**

`DeptRecommendContent`(175행 부근)의 `<CompetencyAccordion ... />`(291행 부근) 바로 위에 `<RecommendBasisNote />` 추가.

- [ ] **Step 3: InterestRecommendContent에 삽입**

`InterestRecommendContent`(397행 부근)의 반환 JSX에서 "Summary" 카드(추천 과목 개수 표시 블록) 바로 아래에 `<RecommendBasisNote />` 추가. Summary 블록은 `우리 학교에서 수강 가능한 추천 과목` 문구가 있는 `<div className="mb-4 ...">`.

- [ ] **Step 4: 검증**

```bash
cd app && npm run lint && npm run build
```

Expected: lint 신규 에러 0, build 성공.
육안(선택): `/recommend?interests=cs-ai`와 `/recommend?dept=<학과>` 둘 다 접이식 표시, 펼치면 3문단+FAQ 링크, 링크가 `/faq`로 이동.

- [ ] **Step 5: 커밋**

```bash
git add "app/src/app/(main)/recommend/page.tsx"
git commit -m "feat: 추천 화면에 추천 근거 인라인 설명 접이식"
```

---

### Task 3: 커리컴퍼스(generic-app) 포팅

**Files (worktree `~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl`):**
- Create: `generic-app/src/app/faq/page.tsx`
- Modify: `generic-app/src/components/Footer.tsx`
- Modify: `generic-app/src/app/s/[shareToken]/recommend/page.tsx`

**Interfaces:**
- Consumes: Task 1·2의 효자고 구현(포팅 원본). 커밋 diff 참조: 효자고 Task 1·2 커밋.

- [ ] **Step 1: 커리컴퍼스 `/faq` 페이지 생성**

`generic-app/src/app/faq/page.tsx` — Task 1의 효자고 페이지와 동일 구조. 단 **Q1은 커리컴퍼스 변형**("각 학교가 올린 편제표와 교육과정 안내서")을 쓰고, **Q7(커리컴퍼스 전용)을 FAQS 배열 끝에 추가**:

Q1 answer(커리컴퍼스판):
```
두 가지 자료를 씁니다. ① 계열별 추천 과목의 뼈대는 각 학교가 올린 편제표와 「2022 개정 교육과정 선택 과목 안내서」입니다. ② 각 과목이 대학에서 얼마나 요구되는지는 한국대학교육협의회(대교협)가 발표한 「2028학년도 권역별 대학별 권장과목」(전국 47개 대학)과 대조해 확인합니다. 두 자료를 교차 검증해, 안내서가 추천하지만 대학 요구 근거가 없는 과목과 대학이 요구하지만 빠진 과목을 점검했습니다.
```

Q7 항목(배열 끝 추가):
```tsx
{
  q: "우리 학교도 등록하려면 어떻게 하나요?",
  a: "학교 선생님이 편제표(교육과정 편성표) 파일을 올리면 그 학교 전용 추천 화면이 만들어집니다. 홈 화면의 '편제표 올리고 시작하기'에서 진행하세요.",
},
```

나머지 Q2~Q6은 Task 1과 동일. 헤더의 뒤로가기 `Link href`는 커리컴퍼스 홈(`/`)으로. `BrandLogo` 등 커리컴퍼스 헤더 관례가 있으면 `/guide` 페이지 헤더 스타일을 참고해 맞춰도 됨(선택).

- [ ] **Step 2: 커리컴퍼스 푸터에 FAQ 링크**

`generic-app/src/components/Footer.tsx`의 "문의·제안" `<p>` 아래(또는 대교협 출처 줄 근처)에 `/faq` 링크 추가. 커리컴퍼스 Footer는 중앙정렬 flex-col 구조이므로 형식을 맞춘다:

```tsx
<p className="text-xs text-foreground/45">
  <Link href="/faq" className="underline underline-offset-2 hover:text-foreground/70">
    자주 묻는 질문 · 자료 출처 안내
  </Link>
</p>
```

`import Link from "next/link";` 없으면 추가.

- [ ] **Step 3: 공유 뷰 추천 화면에 인라인 근거 설명**

`generic-app/src/app/s/[shareToken]/recommend/page.tsx`에 Task 2의 `RecommendBasisNote`를 그대로 복제(모듈 레벨, `CompetencyAccordion` 아래)하고, DeptRecommendContent·InterestRecommendContent 두 곳에 동일 위치로 삽입. FAQ 링크 `href="/faq"`는 share-scope 밖 top-level이라 그대로 사용.

- [ ] **Step 4: 검증**

```bash
cd "~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl/generic-app" && npx pnpm run build
```

Expected: Compiled successfully, `/faq` 라우트 생성, TS 에러 없음.

- [ ] **Step 5: 커밋 (worktree, next-env.d.ts 등 무관 변경 제외)**

```bash
cd ~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl
git add generic-app/src/app/faq/page.tsx generic-app/src/components/Footer.tsx "generic-app/src/app/s/[shareToken]/recommend/page.tsx"
git commit -m "feat: 추천 근거 인라인 설명 + FAQ 페이지 (메인 포팅)"
```

---

### Task 4: 배포 (효자고 main 머지 + 커리컴퍼스 푸시) + 라이브 확인

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: Task 1~3의 모든 커밋

- [ ] **Step 1: HANDOFF 갱신 + 효자고 codex 브랜치 푸시**

HANDOFF 최상단에 이번 작업 요약(인라인 근거 설명 + /faq, 양쪽 배포) 추가 후:

```bash
cd "C:/Users/admin/Desktop/2026_project/project2_curriculum"
git add HANDOFF.md && git commit -m "docs: HANDOFF 추천 근거 설명+FAQ 기록"
git push origin codex/generic-curriculum-assistant
```

- [ ] **Step 2: 커리컴퍼스 clean 브랜치 푸시**

```bash
cd ~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl
git push origin codex/generic-curriculum-assistant-clean
```

- [ ] **Step 3: 효자고 main 머지**

임시 워크트리에서 codex→main 머지(2026-07-07 확립 방식). 이번 변경은 신규 파일 위주라 충돌 가능성 낮음:

```bash
cd "C:/Users/admin/Desktop/2026_project"
git -C project2_curriculum worktree add ../p2c-main-merge2 main
cd p2c-main-merge2
git merge codex/generic-curriculum-assistant --no-edit
# 충돌 시: 코드/신규파일은 codex(theirs), 전시관 자산은 main(ours) 원칙(2026-07-07과 동일)
cd app && npm install --no-audit --no-fund && npm run build
cd .. && git push origin main
cd "C:/Users/admin/Desktop/2026_project" && rm -rf p2c-main-merge2
git -C project2_curriculum worktree prune
```

- [ ] **Step 4: 라이브 확인**

배포 대기 후 두 사이트 확인:

```bash
sleep 150
curl -fsSL "https://hyoja-curriculum.vercel.app/faq" -o /dev/null -w "hyoja /faq: %{http_code}\n"
curl -fsSL "https://generic-curriculum-assistant.vercel.app/faq" | grep -o "자주 묻는 질문\|대교협" | head -2
```

Expected: hyoja /faq 200, 커리컴퍼스 FAQ 문구 노출. 육안으로 추천 화면 접이식·FAQ 링크 흐름 확인.
