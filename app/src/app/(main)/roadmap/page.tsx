"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Share2, Download } from "lucide-react";
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

// ========== URL 인코딩/디코딩 ==========

function encodeSelections(
  selections: Record<string, string[]>,
  cohort: string
): string {
  const configs =
    cohort === "2025"
      ? [
          { grade: 3, semester: 1 },
          { grade: 3, semester: 2 },
        ]
      : [
          { grade: 2, semester: 1 },
          { grade: 2, semester: 2 },
          { grade: 3, semester: 1 },
          { grade: 3, semester: 2 },
        ];

  const parts: string[] = [];
  configs.forEach(({ grade, semester }) => {
    getSelectionGroups(cohort, grade, semester).forEach((group) => {
      const selected = selections[group.id] || [];
      const indices = selected
        .map((name) => group.options.indexOf(name))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      parts.push(indices.join(","));
    });
  });

  const raw = parts.join("|");
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSelections(
  encoded: string,
  cohort: string
): Record<string, string[]> {
  try {
    const raw = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));

    const configs =
      cohort === "2025"
        ? [
            { grade: 3, semester: 1 },
            { grade: 3, semester: 2 },
          ]
        : [
            { grade: 2, semester: 1 },
            { grade: 2, semester: 2 },
            { grade: 3, semester: 1 },
            { grade: 3, semester: 2 },
          ];

    const parts = raw.split("|");
    const result: Record<string, string[]> = {};
    let partIdx = 0;

    configs.forEach(({ grade, semester }) => {
      getSelectionGroups(cohort, grade, semester).forEach((group) => {
        const part = parts[partIdx++] || "";
        if (!part) {
          result[group.id] = [];
          return;
        }
        const indices = part
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n >= 0);
        result[group.id] = indices
          .map((idx) => group.options[idx])
          .filter(Boolean) as string[];
      });
    });

    return result;
  } catch {
    return {};
  }
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
const fieldCoreAreas: Record<string, string[]> = {
  health_medicine: ["과학", "수학"],
  engineering: ["수학", "과학", "정보"],
  natural_sciences: ["과학", "수학"],
  social_sciences: ["사회", "수학"],
  humanities: ["국어", "사회", "영어"],
  education: ["교양"],
  arts_sports: ["예술", "체육"],
  interdisciplinary: [],
};

function getDeptFieldId(deptName: string): string | null {
  const deptData = getDepartmentRecommendation(deptName);
  if (!deptData) return null;
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
    const scoreA = uniScores.get(a) || 0;
    const scoreB = uniScores.get(b) || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const subA = getSubjectByName(a);
    const subB = getSubjectByName(b);
    const aIsCore = subA ? coreAreas.includes(subA.area) : false;
    const bIsCore = subB ? coreAreas.includes(subB.area) : false;
    if (aIsCore && !bIsCore) return -1;
    if (!aIsCore && bIsCore) return 1;
    return 0;
  });
}

const tagCoreAreas: Record<string, string[]> = {
  medical: ["과학", "수학"],
  "nursing-health": ["과학", "수학"],
  "cs-ai": ["수학", "정보", "과학"],
  "mechanical-elec": ["수학", "과학"],
  architecture: ["수학", "과학"],
  biotech: ["과학", "수학"],
  "natural-science": ["과학", "수학"],
  "bio-earth": ["과학", "수학"],
  business: ["사회", "수학"],
  "law-politics": ["사회"],
  "media-comm": ["사회", "국어"],
  "psychology-social": ["사회"],
  literature: ["국어", "영어"],
  humanities: ["국어", "사회"],
  global: ["영어", "사회"],
  education: ["교양"],
  "art-design": ["예술"],
  "music-perform": ["예술"],
  sports: ["체육"],
  environment: ["과학", "사회"],
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
  const sParam = searchParams.get("s");
  const cohortFromUrl = searchParams.get("c") as "2025" | "2026" | null;
  const { cohort } = useCohort();

  const captureRef = useRef<HTMLDivElement>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Determine which semesters to show based on cohort
  const semesterConfigs: SemesterConfig[] = useMemo(() => {
    if (cohort === "2025") {
      return [
        { grade: 3, semester: 1, label: "3학년 1학기" },
        { grade: 3, semester: 2, label: "3학년 2학기" },
      ];
    }
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

  // Selection state — 공유 링크의 s 파라미터가 있으면 복원, 없으면 자동 추천
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    // 1. URL에 s 파라미터가 있으면 디코딩하여 복원
    if (sParam) {
      const decodeCohort =
        cohortFromUrl === "2025" || cohortFromUrl === "2026"
          ? cohortFromUrl
          : cohort;
      const decoded = decodeSelections(sParam, decodeCohort);
      if (Object.keys(decoded).length > 0) return decoded;
    }

    // 2. 없으면 자동 추천 로직
    const recNames = deptName
      ? buildRecommendedNamesFromDept(deptName)
      : buildRecommendedNames(interests);

    if (recNames.size === 0) return {};

    let uniScores = new Map<string, number>();
    let coreAreas: string[] = [];

    if (deptName) {
      uniScores = getSubjectPriorityScores(deptName);
      const fieldId = getDeptFieldId(deptName);
      coreAreas = fieldId ? fieldCoreAreas[fieldId] || [] : [];
    } else if (interests.length > 0) {
      uniScores = getSubjectPriorityScoresByInterests(interests);
      coreAreas = getCoreAreasFromInterests(interests);
    }

    const init: Record<string, string[]> = {};
    const configs =
      cohort === "2025"
        ? [
            { grade: 3, semester: 1 },
            { grade: 3, semester: 2 },
          ]
        : [
            { grade: 2, semester: 1 },
            { grade: 2, semester: 2 },
            { grade: 3, semester: 1 },
            { grade: 3, semester: 2 },
          ];

    configs.forEach(({ grade, semester }) => {
      const groups = getSelectionGroups(cohort, grade, semester);

      const prevSelected = new Set<string>();
      if (semester === 2) {
        const s1Groups = getSelectionGroups(cohort, grade, 1);
        s1Groups.forEach((g) => {
          (init[g.id] || []).forEach((n) => prevSelected.add(n));
        });
      }
      if (grade > 2) {
        for (let pg = 2; pg < grade; pg++) {
          for (const ps of [1, 2]) {
            const pgGroups = getSelectionGroups(cohort, pg, ps);
            pgGroups.forEach((g) => {
              (init[g.id] || []).forEach((n) => prevSelected.add(n));
            });
          }
        }
      }

      const sameSemSelected = new Set<string>();

      groups.forEach((group) => {
        const recommended = group.options.filter(
          (opt) =>
            recNames.has(opt) &&
            !prevSelected.has(opt) &&
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

  // ========== 충돌 감지 ==========
  const getConflictsForGroup = useCallback(
    (targetGroupId: string, grade: number, semester: number): Map<string, string> => {
      const conflicts = new Map<string, string>();
      const allGroups = getSelectionGroups(cohort, grade, semester);

      allGroups.forEach((g) => {
        if (g.id === targetGroupId) return;
        const sel = selections[g.id] || [];
        sel.forEach((name) => {
          conflicts.set(name, "이미 선택");
        });
      });

      if (semester === 2) {
        const s1Groups = getSelectionGroups(cohort, grade, 1);
        s1Groups.forEach((g) => {
          const sel = selections[g.id] || [];
          sel.forEach((name) => {
            conflicts.set(name, "1학기 수강");
          });
        });
      }

      if (grade > 2) {
        for (let prevGrade = 2; prevGrade < grade; prevGrade++) {
          for (const prevSem of [1, 2]) {
            const prevGroups = getSelectionGroups(cohort, prevGrade, prevSem);
            prevGroups.forEach((g) => {
              const sel = selections[g.id] || [];
              sel.forEach((name) => {
                conflicts.set(name, `${prevGrade}학년 수강`);
              });
            });
          }
        }
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
          return { ...prev, [groupId]: current.filter((n) => n !== subjectName) };
        }

        if (isRadio) {
          return { ...prev, [groupId]: [subjectName] };
        }

        if (current.length < choose) {
          return { ...prev, [groupId]: [...current, subjectName] };
        }

        return prev;
      });
    },
    []
  );

  // Credit calculation
  const getSemesterCredits = useCallback(
    (grade: number, semester: number) => {
      const designated = getDesignatedSubjects(cohort, grade, semester);
      const designatedCredits = designated.reduce((sum, d) => sum + d.credits, 0);

      const groups = getSelectionGroups(cohort, grade, semester);
      const selectionCredits = groups.reduce((sum, g) => {
        const sel = selections[g.id] || [];
        return sum + sel.length * g.creditsEach;
      }, 0);

      const totalExpected =
        designatedCredits + groups.reduce((sum, g) => sum + g.totalCredits, 0);

      return {
        designatedCredits,
        selectionCredits,
        total: designatedCredits + selectionCredits,
        totalExpected,
      };
    },
    [cohort, selections]
  );

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

  const gradeTotals = useMemo(() => {
    const byGrade: Record<number, { selected: number; expected: number }> = {};
    semesterConfigs.forEach(({ grade, semester }) => {
      if (!byGrade[grade]) byGrade[grade] = { selected: 0, expected: 0 };
      const c = getSemesterCredits(grade, semester);
      byGrade[grade].selected += c.total;
      byGrade[grade].expected += c.totalExpected;
    });
    return byGrade;
  }, [semesterConfigs, getSemesterCredits]);

  const interestLabels = useMemo(() => {
    return interests
      .map((id) => interestTags.find((t) => t.id === id)?.label)
      .filter(Boolean) as string[];
  }, [interests]);

  // ========== 공유하기 ==========
  const handleShare = useCallback(async () => {
    const encoded = encodeSelections(selections, cohort);
    const params = new URLSearchParams();
    params.set("c", cohort);
    if (deptName) params.set("dept", deptName);
    if (interests.length > 0) params.set("interests", interests.join(","));
    params.set("s", encoded);
    const url = `${window.location.origin}/roadmap?${params.toString()}`;

    try {
      await navigator.share({ title: "효자고 수강 로드맵", url });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast("링크가 복사되었습니다!");
      } catch {
        showToast("공유 실패 — 주소창에서 URL을 복사해 주세요");
      }
    }
  }, [selections, cohort, deptName, interests, showToast]);

  // ========== 이미지 저장 ==========
  const handleExportImage = useCallback(async () => {
    if (!captureRef.current) return;
    showToast("이미지 생성 중...");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, {
        quality: 1,
        backgroundColor: "#ffffff",
        pixelRatio: 1,
      });
      const link = document.createElement("a");
      link.download = `효자고_로드맵_${cohort}.png`;
      link.href = dataUrl;
      link.click();
      setToastMsg(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`저장 실패: ${msg.slice(0, 40)}`);
    }
  }, [cohort, showToast]);

  return (
    <div className="min-h-dvh pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={
              deptName
                ? `/recommend?dept=${encodeURIComponent(deptName)}`
                : interests.length > 0
                ? `/recommend?interests=${interests.join(",")}`
                : "/"
            }
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

      {/* Sticky 학점 요약 바 */}
      <div className="sticky top-[49px] z-20 px-4 py-3 mt-1 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto max-w-lg flex items-center justify-center gap-4">
          {cohort === "2026" ? (
            <>
              {[2, 3].map((grade) => {
                const gt = gradeTotals[grade];
                if (!gt) return null;
                const isComplete = gt.selected === gt.expected;
                return (
                  <div
                    key={grade}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                      isComplete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <span className="font-semibold">고{grade}</span>
                    <span className="text-base font-bold">
                      {gt.selected}/{gt.expected}
                    </span>
                    <span>학점</span>
                    {isComplete && <span>{"\u2713"}</span>}
                  </div>
                );
              })}
            </>
          ) : (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                grandTotal.selected === grandTotal.expected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-muted/60 text-muted-foreground"
              )}
            >
              <span className="font-semibold">고3 전체</span>
              <span className="text-base font-bold">
                {grandTotal.selected}/{grandTotal.expected}
              </span>
              <span>학점</span>
              {grandTotal.selected === grandTotal.expected && (
                <span>{"\u2713"}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 (캡처 제외) */}
      <div className="bg-white">
        {/* 캡처용 타이틀 */}
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-3 pb-2">
          <div className="flex items-center gap-2 pb-1">
            <div>
              <p className="text-xs font-bold text-foreground">효자고등학교</p>
              <p className="text-[10px] text-muted-foreground">
                {cohort === "2025" ? "고2 (2025학번)" : "고1 (2026학번)"} 수강 로드맵
              </p>
            </div>
          </div>

          {/* Department context */}
          {deptName && (
            <div className="flex items-center gap-2 bg-[var(--cta)]/10 rounded-xl px-4 py-3 border border-[var(--cta)]/20">
              <GraduationCap className="h-4 w-4 text-[var(--cta)]" />
              <span className="text-sm font-medium text-[var(--cta)]">
                {deptName} 추천 기반 로드맵
              </span>
            </div>
          )}

          {/* Interest tags */}
          {!deptName && interestLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-0.5">
                관심 분야:
              </span>
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

          <p className="text-xs text-muted-foreground leading-relaxed">
            학교지정 과목은 자동으로 포함됩니다. 선택과목군에서 원하는 과목을 골라 나만의 커리큘럼을 완성하세요.
          </p>
        </div>

        <div className="mx-auto max-w-lg px-4 pt-1 space-y-5 pb-6">
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
                  isGrade2
                    ? "border-l-[var(--primary)]"
                    : "border-l-[var(--cta)]"
                )}
              >
                <div className="flex items-center gap-2 px-3 pb-2">
                  {isGrade2 ? (
                    <BookOpen className="h-4 w-4 text-[var(--primary)]" />
                  ) : (
                    <GraduationCap className="h-4 w-4 text-[var(--cta)]" />
                  )}
                  <h2 className="text-sm font-bold text-foreground">{label}</h2>
                </div>

                <div className="space-y-3 px-3">
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
                            <span className="text-[10px] opacity-60">
                              {d.credits}학점
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {groups.map((group) => (
                    <Card key={group.id} className="border-border/50 shadow-none">
                      <CardContent className="p-3">
                        <SelectionGroup
                          group={group}
                          selected={selections[group.id] || []}
                          onToggle={(name) =>
                            handleToggle(group.id, group.choose, name)
                          }
                          recommendedSubjects={recommendedNames}
                          conflictSubjects={getConflictsForGroup(
                            group.id,
                            grade,
                            semester
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}

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
        </div>
      </div>
      {/* 공유 / 이미지 저장 버튼 */}
      <div className="mx-auto max-w-lg px-4 pb-8 pt-2 flex gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm active:scale-[0.98] transition-transform"
        >
          <Share2 className="h-4 w-4" />
          공유하기
        </button>
        <button
          type="button"
          onClick={handleExportImage}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm active:scale-[0.98] transition-transform"
        >
          <Download className="h-4 w-4" />
          이미지 저장
        </button>
      </div>

      {/* ===== 이미지 저장용 off-screen 카드 ===== */}
      <div
        ref={captureRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "400px",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#ffffff",
          padding: "28px 24px 22px",
        }}
      >
        {/* 헤더 */}
        <div style={{ paddingBottom: "14px", marginBottom: "16px", borderBottom: "1.5px solid #e5e7eb" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
            효자고등학교
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
            {cohort === "2025" ? "고2 (2025학번)" : "고1 (2026학번)"} 수강 로드맵
          </div>
          {deptName && (
            <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#ede9fe", color: "#7c3aed", padding: "4px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 600 }}>
              🎓 {deptName}
            </div>
          )}
          {!deptName && interestLabels.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {interestLabels.map((label) => (
                <span key={label} style={{ background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 600 }}>
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 학기별 섹션 */}
        {semesterConfigs.map(({ grade, semester, label }) => {
          const designated = getDesignatedSubjects(cohort, grade, semester);
          const groups = getSelectionGroups(cohort, grade, semester);
          const selected = groups.flatMap((g) => selections[g.id] || []);
          const credits = getSemesterCredits(grade, semester);
          const isGrade2 = grade === 2;
          const accent = isGrade2 ? "#2563eb" : "#7c3aed";
          const chipBg = isGrade2 ? "#eff6ff" : "#f5f3ff";

          return (
            <div key={`${grade}-${semester}`} style={{ marginBottom: "14px" }}>
              {/* 학기 레이블 */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px" }}>
                <div style={{ width: "3px", height: "14px", background: accent, borderRadius: "2px" }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: accent }}>{label}</span>
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#9ca3af" }}>
                  {credits.total}/{credits.totalExpected}학점{credits.total === credits.totalExpected ? " ✓" : ""}
                </span>
              </div>
              {/* 과목 chip 목록 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {designated.map((d, i) => (
                  <span key={i} style={{ background: "#f3f4f6", color: "#6b7280", fontSize: "11px", padding: "3px 9px", borderRadius: "6px" }}>
                    {d.subject === "논술↔생태와 환경" ? "논술/생태와환경" : d.subject}
                  </span>
                ))}
                {selected.map((name) => (
                  <span key={name} style={{ background: chipBg, color: accent, fontSize: "11px", padding: "3px 9px", borderRadius: "6px", fontWeight: 600 }}>
                    {name}
                  </span>
                ))}
                {selected.length === 0 && (
                  <span style={{ fontSize: "11px", color: "#d1d5db" }}>선택 없음</span>
                )}
              </div>
            </div>
          );
        })}

        {/* 하단 학점 요약 */}
        <div style={{ borderTop: "1.5px solid #e5e7eb", paddingTop: "12px", marginTop: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
          {cohort === "2026" ? (
            <>
              {[2, 3].map((grade) => {
                const gt = gradeTotals[grade];
                if (!gt) return null;
                return (
                  <span key={grade} style={{ fontSize: "12px", fontWeight: 600, color: gt.selected === gt.expected ? "#059669" : "#6b7280" }}>
                    고{grade} {gt.selected}/{gt.expected}학점{gt.selected === gt.expected ? " ✓" : ""}
                  </span>
                );
              })}
            </>
          ) : (
            <span style={{ fontSize: "12px", fontWeight: 600, color: grandTotal.selected === grandTotal.expected ? "#059669" : "#6b7280" }}>
              고3 {grandTotal.selected}/{grandTotal.expected}학점{grandTotal.selected === grandTotal.expected ? " ✓" : ""}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#d1d5db" }}>효자고 선택과목 도우미</span>
        </div>
      </div>
      {/* ===== off-screen 카드 끝 ===== */}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          {toastMsg}
        </div>
      )}
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
