import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Download,
  GraduationCap,
  Search,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockScreenProps } from "../types";
import { Chip, RecBadge, hot, hotClass } from "./_shared";

/* 1) 학생 홈 (home / homeTagSelected) ------------------------------------ */
export function HomeScreen(p: MockScreenProps) {
  const tagSelected = p.screen === "homeTagSelected" || Boolean(p.ui.selectedTag);
  const cohort = p.ui.cohort ?? null;
  const tags = [
    { id: "interestTagAI", label: "인공지능/소프트웨어" },
    { id: "interestTagHealth", label: "보건/간호" },
    { id: "interestTagEdu", label: "교육" },
  ];

  return (
    <div className="mx-auto max-w-sm">
      <div
        {...hot("schoolHeader", p)}
        className="flex items-center gap-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--secondary)]">
          <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
        </span>
        <span className="text-base font-bold">효자고등학교</span>
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug">
        나에게 맞는 <span className="text-[var(--primary)]">선택과목</span>을 찾아보자
      </h2>

      {/* 입학연도 토글 */}
      <p className="mt-4 text-xs font-semibold text-slate-600">입학 연도</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <span
          {...hot("cohortToggleGo1", p)}
          className={cn(
            "rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors",
            cohort === "go1"
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-border bg-white text-foreground",
            hotClass("cohortToggleGo1", p),
          )}
        >
          고1 · 2026
        </span>
        <span
          {...hot("cohortToggleGo2", p)}
          className={cn(
            "rounded-lg border px-3 py-2 text-center text-sm font-semibold",
            cohort === "go2"
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-border bg-white text-foreground",
          )}
        >
          고2 · 2025
        </span>
      </div>

      {/* 학과 검색 */}
      <div
        {...hot("deptSearchInput", p)}
        className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        학과로 검색
      </div>

      {/* 관심 분야 태그 */}
      <p className="mt-4 text-xs font-semibold text-slate-600">관심 분야</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isAI = tag.id === "interestTagAI";
          const selected = tagSelected && isAI;
          const key = selected ? "interestTagAISelected" : tag.id;
          return (
            <span
              key={tag.id}
              {...hot(key, p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-border bg-white text-foreground",
                hotClass(tag.id, p),
              )}
            >
              {tag.label}
            </span>
          );
        })}
      </div>

      {/* 태그 선택 후: 관련 학과 패널 */}
      {tagSelected && (
        <div
          {...hot("deptPanel", p)}
          className="mt-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--secondary)]/60 p-3"
        >
          <p className="text-xs font-semibold text-[var(--primary)]">
            관련 학과 (골라도 되고, 안 골라도 돼)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              {...hot("deptOptionCS", p)}
              className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium"
            >
              컴퓨터공학과
            </span>
            <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium">
              소프트웨어학과
            </span>
          </div>
        </div>
      )}

      {/* 하단 CTA */}
      <div
        {...hot(tagSelected ? "ctaRecommendActive" : "ctaRecommend", p)}
        className={cn(
          "mt-5 rounded-xl py-2.5 text-center text-sm font-semibold",
          tagSelected
            ? cn(
                "bg-[var(--cta)] text-white shadow-sm",
                hotClass("ctaRecommendActive", p),
              )
            : "bg-muted text-muted-foreground",
        )}
      >
        맞춤 과목 추천받기
      </div>
    </div>
  );
}

/* 2) 추천 (recommend) ---------------------------------------------------- */
export function RecommendScreen(p: MockScreenProps) {
  return (
    <div className="mx-auto max-w-sm">
      <p {...hot("recommendHeader", p)} className="text-base font-bold">
        맞춤 과목 추천
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <span {...hot("interestBadge", p)}>
          <Chip tone="primary">인공지능/소프트웨어</Chip>
        </span>
        <span
          {...hot("availableSummary", p)}
          className="text-xs text-muted-foreground"
        >
          우리 학교 수강 가능 추천 6개
        </span>
      </div>

      <div
        {...hot("semesterSection21", p)}
        className="mt-3 rounded-xl border border-border bg-white p-3"
      >
        <p className="text-xs font-semibold text-slate-500">2학년 1학기</p>
        <div className="mt-2 space-y-2">
          <div
            {...hot("subjectCardRecommended", p)}
            className={cn(
              "rounded-lg border border-[var(--cta)]/40 bg-[var(--cta)]/5 p-2.5",
              hotClass("subjectCardRecommended", p),
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">미적분</span>
              <RecBadge />
            </div>
            <span
              {...hot("schoolOpenMark", p)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"
            >
              <Check className="h-3 w-3" /> 우리 학교 개설
            </span>
          </div>
          <div className="rounded-lg border border-border p-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">인공지능 기초</span>
              <RecBadge />
            </div>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <Check className="h-3 w-3" /> 우리 학교 개설
            </span>
          </div>
        </div>
      </div>

      <div
        {...hot("unavailableAccordion", p)}
        className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
      >
        우리 학교 미개설 과목 2개
        <ChevronDown className="h-4 w-4" />
      </div>

      <div
        {...hot("ctaRoadmap", p)}
        className={cn(
          "mt-4 rounded-xl bg-[var(--cta)] py-2.5 text-center text-sm font-semibold text-white shadow-sm",
          hotClass("ctaRoadmap", p),
        )}
      >
        3년 로드맵 만들기
      </div>
    </div>
  );
}

/* 3) 로드맵 (roadmap / roadmapFilled) ------------------------------------ */
export function RoadmapScreen(p: MockScreenProps) {
  const filled = p.screen === "roadmapFilled" || (p.ui.picked?.length ?? 0) > 0;
  return (
    <div className="mx-auto max-w-sm">
      <p {...hot("roadmapHeader", p)} className="text-base font-bold">
        나의 수강 로드맵
      </p>

      {/* 상단 학점 요약 바 */}
      <div
        {...hot(filled ? "creditBarComplete" : "creditBar", p)}
        className={cn(
          "mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
          filled
            ? "bg-emerald-50 text-emerald-700"
            : "bg-muted text-slate-600",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {filled && <CheckCircle2 className="h-4 w-4" />}
          고2 1학기
        </span>
        <span>{filled ? "8 / 8학점 완료" : "0 / 8학점"}</span>
      </div>

      {/* 학교지정 과목 */}
      <div {...hot("designatedChips", p)} className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="muted">확률과 통계 (지정)</Chip>
        <Chip tone="muted">영어Ⅱ (지정)</Chip>
      </div>

      {/* 선택과목군 */}
      <div
        {...hot("selectionGroup1", p)}
        className="mt-3 rounded-xl border border-border bg-white p-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500">선택과목군</p>
          <Chip tone="primary">택1 · 4학점</Chip>
        </div>
        <div className="mt-2 space-y-2">
          <div
            {...hot(filled ? "subjectOptionChecked" : "subjectOptionRecommended", p)}
            className={cn(
              "flex items-center justify-between rounded-lg border p-2.5",
              filled
                ? "border-[var(--primary)] bg-[var(--secondary)]"
                : "border-[var(--cta)]/40 bg-[var(--cta)]/5",
              hotClass(
                filled ? "subjectOptionChecked" : "subjectOptionRecommended",
                p,
              ),
            )}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              {filled ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              미적분
            </span>
            <RecBadge />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
            <span className="inline-flex items-center gap-2">
              <Circle className="h-4 w-4 text-muted-foreground" />
              기하
            </span>
          </div>
        </div>
        <p
          {...hot(filled ? "semesterCreditComplete" : "semesterCreditSum", p)}
          className={cn(
            "mt-2 text-right text-xs font-semibold",
            filled ? "text-emerald-700" : "text-muted-foreground",
          )}
        >
          {filled ? "학기 학점 채움 ✓" : "학점 합계 4 / 8"}
        </p>
      </div>

      {/* 공유/저장 */}
      <div className="mt-4 flex items-center gap-2">
        <div
          {...hot("shareBtn", p)}
          className={cn(
            "flex-1 rounded-lg bg-[var(--cta)] py-2.5 text-center text-sm font-semibold text-white shadow-sm",
            hotClass("shareBtn", p),
          )}
        >
          <Share2 className="mr-1 inline h-4 w-4" /> 공유하기
        </div>
        <div
          {...hot("exportBtn", p)}
          className="flex-1 rounded-lg border border-border bg-white py-2.5 text-center text-sm font-semibold text-foreground"
        >
          <Download className="mr-1 inline h-4 w-4" /> 이미지 저장
        </div>
      </div>
    </div>
  );
}
