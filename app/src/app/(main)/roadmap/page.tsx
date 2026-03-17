"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCohort } from "@/contexts/CohortContext";
import {
  getDesignatedSubjects,
  getSelectionGroups,
} from "@/data/school";
import { getSubjectByName } from "@/data/subjects";
import {
  interestTags,
  getRecommendedSubjectsByInterest,
} from "@/data/career-mapping";
import { getDepartmentRecommendation } from "@/data/search-index";
import { getSubjectPriorityScores, getSubjectPriorityScoresByInterests } from "@/data/university-requirements";
import SelectionGroup from "@/components/SelectionGroup";

// ========== Types ==========

interface SemesterConfig {
  grade: number;
  semester: number;
  label: string;
}

// ========== Helper: build recommended subject names set ==========

function buildRecommendedNames(interests: string[]): Set<string> {
  const names = new Set<string>();
  interests.forEach((interestId) => {
    const rec = getRecommendedSubjectsByInterest(interestId);
    rec["일반선택"].forEach((s) => names.add(s.name));
    rec["진로선택"].forEach((s) => names.add(s.name));
    rec["융합선택"].forEach((s) => names.add(s.name));
  });
  return names;
}

// 분야별 핵심 교과 area (자동 선택 우선순위용)
// 핵심 교과에 해당하는 과목이 먼저 자동 선택됨
const fieldCoreAreas: Record<string, string[]> = {
  health_medicine: ["과학", "수학"],
  engineering: ["수학", "과학", "정보"],
  natural_sciences: ["과학", "수학"],
  social_sciences: ["사회", "수학"],
  humanities: ["국어", "사회", "영어"],
  education: ["교양"],  // 교육의 이해 등
  arts_sports: ["예술", "체육"],
  interdisciplinary: [],
};

function getDeptFieldId(deptName: string): string | null {
  const deptData = getDepartmentRecommendation(deptName);
  if (!deptData) return null;
  // fieldName에서 field id 역추적
  const fieldNameMap: Record<string, string> = {
    "인문 분야": "humanities",
    "사회 분야": "social_sciences",
    "자연 분야": "natural_sciences",
    "공학 분야": "engineering",
    "보건·의약학 분야": "health_medicine",
    "교육 분야": "education",
    "예술·체육 분야": "arts_sports",
    "자율전공 분야": "interdisciplinary",
  };
  return fieldNameMap[deptData.department.fieldName] || null;
}

/** 추천 과목을 대입 반영 점수 → 핵심 교과 순으로 정렬 */
function sortByPriority(
  subjectNames: string[],
  uniScores: Map<string, number>,
  coreAreas: string[]
): string[] {
  return [...subjectNames].sort((a, b) => {
    // 1순위: 대입 반영 점수 (높을수록 우선)
    const scoreA = uniScores.get(a) || 0;
    const scoreB = uniScores.get(b) || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 2순위: 핵심 교과 area fallback
    const subA = getSubjectByName(a);
    const subB = getSubjectByName(b);
    const aIsCore = subA ? coreAreas.includes(subA.area) : false;
    const bIsCore = subB ? coreAreas.includes(subB.area) : false;
    if (aIsCore && !bIsCore) return -1;
    if (!aIsCore && bIsCore) return 1;
    return 0;
  });
}

// 태그별 핵심 교과 area
const tagCoreAreas: Record<string, string[]> = {
  "medical": ["과학", "수학"],
  "nursing-health": ["과학", "수학"],
  "cs-ai": ["수학", "정보", "과학"],
  "mechanical-elec": ["수학", "과학"],
  "architecture": ["수학", "과학"],
  "biotech": ["과학", "수학"],
  "natural-science": ["과학", "수학"],
  "bio-earth": ["과학", "수학"],
  "business": ["사회", "수학"],
  "law-politics": ["사회"],
  "media-comm": ["사회", "국어"],
  "psychology-social": ["사회"],
  "literature": ["국어", "영어"],
  "humanities": ["국어", "사회"],
  "global": ["영어", "사회"],
  "education": ["교양"],
  "art-design": ["예술"],
  "music-perform": ["예술"],
  "sports": ["체육"],
  "environment": ["과학", "사회"],
  "food-nutrition": ["과학"],
};

function getCoreAreasFromInterests(interests: string[]): string[] {
  const areas = new Set<string>();
  interests.forEach((id) => {
    (tagCoreAreas[id] || []).forEach((a) => areas.add(a));
  });
  return Array.from(areas);
}

function buildRecommendedNamesFromDept(deptName: string): Set<string> {
  const names = new Set<string>();
  const deptData = getDepartmentRecommendation(deptName);
  if (!deptData) return names;

  deptData.subjects["일반선택"].forEach((n) => names.add(n));
  deptData.subjects["진로선택"].forEach((n) => names.add(n));
  deptData.subjects["융합선택"].forEach((n) => names.add(n));

  return names;
}

// ========== Main Content Component ==========

function RoadmapContent() {
  const searchParams = useSearchParams();
  const deptName = searchParams.get("dept");
  const interests = searchParams.get("interests")?.split(",").filter(Boolean) ?? [];
  const { cohort } = useCohort();

  // Determine which semesters to show based on cohort
  const semesterConfigs: SemesterConfig[] = useMemo(() => {
    if (cohort === "2025") {
      // 현 고2: only show 고3 selections
      return [
        { grade: 3, semester: 1, label: "3학년 1학기" },
        { grade: 3, semester: 2, label: "3학년 2학기" },
      ];
    }
    // 현 고1 (2026): show 고2 + 고3
    return [
      { grade: 2, semester: 1, label: "2학년 1학기" },
      { grade: 2, semester: 2, label: "2학년 2학기" },
      { grade: 3, semester: 1, label: "3학년 1학기" },
      { grade: 3, semester: 2, label: "3학년 2학기" },
    ];
  }, [cohort]);

  // Build recommended subject names from dept or interests
  const recommendedNames = useMemo(() => {
    if (deptName) return buildRecommendedNamesFromDept(deptName);
    return buildRecommendedNames(interests);
  }, [deptName, interests]);

  // Selection state: Record<groupId, selectedNames[]>
  // Auto-select recommended subjects as initial state
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const recNames = deptName
      ? buildRecommendedNamesFromDept(deptName)
      : buildRecommendedNames(interests);

    if (recNames.size === 0) return {};

    // 대입 반영 점수 + 핵심 교과 area 결정
    let uniScores = new Map<string, number>();
    let coreAreas: string[] = [];

    if (deptName) {
      uniScores = getSubjectPriorityScores(deptName);
      const fieldId = getDeptFieldId(deptName);
      coreAreas = fieldId ? (fieldCoreAreas[fieldId] || []) : [];
    } else if (interests.length > 0) {
      uniScores = getSubjectPriorityScoresByInterests(interests);
      coreAreas = getCoreAreasFromInterests(interests);
    }

    const init: Record<string, string[]> = {};
    const configs = cohort === "2025"
      ? [{ grade: 3, semester: 1 }, { grade: 3, semester: 2 }]
      : [{ grade: 2, semester: 1 }, { grade: 2, semester: 2 }, { grade: 3, semester: 1 }, { grade: 3, semester: 2 }];

    configs.forEach(({ grade, semester }) => {
      const groups = getSelectionGroups(cohort, grade, semester);

      // 이 학기 이전에 (같은 학년 1학기) 선택된 과목 수집
      const prevSemSelected = new Set<string>();
      if (semester === 2) {
        const s1Groups = getSelectionGroups(cohort, grade, 1);
        s1Groups.forEach((g) => {
          (init[g.id] || []).forEach((n) => prevSemSelected.add(n));
        });
      }

      // 같은 학기 내 이미 선택된 과목 추적 (선택군 간 중복 방지)
      const sameSemSelected = new Set<string>();

      groups.forEach((group) => {
        const recommended = group.options.filter((opt) =>
          recNames.has(opt) &&
          !prevSemSelected.has(opt) &&
          !sameSemSelected.has(opt)
        );
        const sorted = sortByPriority(recommended, uniScores, coreAreas);
        const picked = sorted.slice(0, group.choose);
        init[group.id] = picked;
        picked.forEach((n) => sameSemSelected.add(n));
      });
    });

    return init;
  });

  // ========== 충돌 감지: 같은 학기 내 다른 선택군 + 같은 학년 이전 학기 ==========
  const getConflictsForGroup = useCallback(
    (targetGroupId: string, grade: number, semester: number): Map<string, string> => {
      const conflicts = new Map<string, string>();
      const allGroups = getSelectionGroups(cohort, grade, semester);

      // 1) 같은 학기 내 다른 선택군에서 선택된 과목 → 중복 수강 불가
      allGroups.forEach((g) => {
        if (g.id === targetGroupId) return;
        const sel = selections[g.id] || [];
        sel.forEach((name) => {
          conflicts.set(name, "이미 선택");
        });
      });

      // 2) 같은 학년 이전 학기에서 선택된 과목 → 중복 수강 불가
      if (semester === 2) {
        const s1Groups = getSelectionGroups(cohort, grade, 1);
        s1Groups.forEach((g) => {
          const sel = selections[g.id] || [];
          sel.forEach((name) => {
            conflicts.set(name, "1학기 수강");
          });
        });
      }

      return conflicts;
    },
    [cohort, selections]
  );

  const handleToggle = useCallback(
    (groupId: string, choose: number, subjectName: string) => {
      setSelections((prev) => {
        const current = prev[groupId] || [];
        const isRadio = choose === 1;

        if (current.includes(subjectName)) {
          // Deselect
          return { ...prev, [groupId]: current.filter((n) => n !== subjectName) };
        }

        if (isRadio) {
          // Radio: replace selection
          return { ...prev, [groupId]: [subjectName] };
        }

        // Checkbox: add if under limit
        if (current.length < choose) {
          return { ...prev, [groupId]: [...current, subjectName] };
        }

        return prev;
      });
    },
    []
  );

  // Credit calculation per semester
  const getSemesterCredits = useCallback(
    (grade: number, semester: number) => {
      const designated = getDesignatedSubjects(cohort, grade, semester);
      const designatedCredits = designated.reduce((sum, d) => sum + d.credits, 0);

      const groups = getSelectionGroups(cohort, grade, semester);
      const selectionCredits = groups.reduce((sum, g) => {
        const sel = selections[g.id] || [];
        return sum + sel.length * g.creditsEach;
      }, 0);

      const totalExpected = designatedCredits + groups.reduce((sum, g) => sum + g.totalCredits, 0);

      return { designatedCredits, selectionCredits, total: designatedCredits + selectionCredits, totalExpected };
    },
    [cohort, selections]
  );

  // Grand total across all visible semesters
  const grandTotal = useMemo(() => {
    return semesterConfigs.reduce(
      (acc, { grade, semester }) => {
        const c = getSemesterCredits(grade, semester);
        return {
          selected: acc.selected + c.total,
          expected: acc.expected + c.totalExpected,
        };
      },
      { selected: 0, expected: 0 }
    );
  }, [semesterConfigs, getSemesterCredits]);

  // Interest labels for display
  const interestLabels = useMemo(() => {
    return interests
      .map((id) => interestTags.find((t) => t.id === id)?.label)
      .filter(Boolean) as string[];
  }, [interests]);

  return (
    <div className="min-h-dvh pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={deptName ? `/recommend?dept=${encodeURIComponent(deptName)}` :
                  interests.length > 0 ? `/recommend?interests=${interests.join(",")}` : "/"}
            className="shrink-0 p-1"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">
              나의 수강 로드맵
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {cohort === "2025" ? "고2" : "고1"} &middot; 효자고등학교
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-5 pb-6">
        {/* Department context header */}
        {deptName && (
          <div className="flex items-center gap-2 bg-[var(--cta)]/10 rounded-xl px-4 py-3 border border-[var(--cta)]/20">
            <GraduationCap className="h-4 w-4 text-[var(--cta)]" />
            <span className="text-sm font-medium text-[var(--cta)]">
              {deptName} 추천 기반 로드맵
            </span>
          </div>
        )}

        {/* Interest tags display */}
        {!deptName && interestLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-0.5">관심 분야:</span>
            {interestLabels.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-[10px] px-2 py-0 h-5 bg-[var(--cta)]/10 text-[var(--cta)] border-0"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Guide text */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          학교지정 과목은 자동으로 포함됩니다. 선택과목군에서 원하는 과목을 골라 나만의 커리큘럼을 완성하세요.
        </p>

        {/* Semester sections */}
        {semesterConfigs.map(({ grade, semester, label }) => {
          const designated = getDesignatedSubjects(cohort, grade, semester);
          const groups = getSelectionGroups(cohort, grade, semester);
          const credits = getSemesterCredits(grade, semester);
          const isGrade2 = grade === 2;

          return (
            <section
              key={`${grade}-${semester}`}
              className={cn(
                "rounded-xl border-l-[3px] pl-0",
                isGrade2 ? "border-l-[var(--primary)]" : "border-l-[var(--cta)]"
              )}
            >
              {/* Semester title */}
              <div className="flex items-center gap-2 px-3 pb-2">
                {isGrade2 ? (
                  <BookOpen className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <GraduationCap className="h-4 w-4 text-[var(--cta)]" />
                )}
                <h2 className="text-sm font-bold text-foreground">{label}</h2>
              </div>

              <div className="space-y-3 px-3">
                {/* Designated subjects - compact chips */}
                {designated.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      학교지정 과목
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {designated.map((d, idx) => (
                        <span
                          key={`${d.subject}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                        >
                          {d.subject === "논술↔생태와 환경" ? (
                            <span className="text-[11px]">논술/생태와 환경</span>
                          ) : (
                            d.subject
                          )}
                          <span className="text-[10px] opacity-60">{d.credits}학점</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection groups */}
                {groups.map((group) => (
                  <Card key={group.id} className="border-border/50 shadow-none">
                    <CardContent className="p-3">
                      <SelectionGroup
                        group={group}
                        selected={selections[group.id] || []}
                        onToggle={(name) => handleToggle(group.id, group.choose, name)}
                        recommendedSubjects={recommendedNames}
                        conflictSubjects={getConflictsForGroup(group.id, grade, semester)}
                      />
                    </CardContent>
                  </Card>
                ))}

                {/* Semester credit summary */}
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium",
                    credits.total === credits.totalExpected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>학기 학점 합계</span>
                  <span>
                    {credits.total} / {credits.totalExpected}학점
                    {credits.total === credits.totalExpected && " \u2713"}
                  </span>
                </div>
              </div>
            </section>
          );
        })}

        {/* Grand total summary */}
        <div
          className={cn(
            "rounded-xl p-4 text-center space-y-1",
            grandTotal.selected === grandTotal.expected
              ? "bg-emerald-50 ring-1 ring-emerald-200"
              : "bg-muted/50 ring-1 ring-border"
          )}
        >
          <p className="text-xs text-muted-foreground">
            {cohort === "2025" ? "고3" : "고2~고3"} 전체 학점
          </p>
          <p
            className={cn(
              "text-2xl font-bold",
              grandTotal.selected === grandTotal.expected
                ? "text-emerald-700"
                : "text-foreground"
            )}
          >
            {grandTotal.selected}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / {grandTotal.expected}학점
            </span>
          </p>
          {grandTotal.selected === grandTotal.expected && (
            <p className="text-xs text-emerald-600 font-medium">
              모든 선택이 완료되었습니다!
            </p>
          )}
          {grandTotal.selected < grandTotal.expected && grandTotal.selected > 0 && (
            <p className="text-xs text-muted-foreground">
              {grandTotal.expected - grandTotal.selected}학점 더 선택해주세요
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Page Export ==========

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <RoadmapContent />
    </Suspense>
  );
}
