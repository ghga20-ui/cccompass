"use client";

import { useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, School } from "lucide-react";
import SubjectCard from "@/components/SubjectCard";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getAllAvailableSubjectNames,
  getCohortData,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import { buildCurrentPath } from "@/lib/hyoja/share-routes";
import { cn } from "@/lib/utils";

export default function SubjectsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("전체");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [showCommon, setShowCommon] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlySuneung, setOnlySuneung] = useState(false);

  const detailReturnPath = buildCurrentPath(pathname, searchParams.toString());

  // 이 학교/cohort에서 개설되는 모든 과목명 (묶음과목 확장은 어댑터가 처리)
  const availableSubjectNames = useMemo(() => {
    const names = new Set<string>();
    if (!cohortData) return names;
    getStudentSemesterConfigs(cohortData).forEach((semester) => {
      getAllAvailableSubjectNames(
        schoolData,
        cohort,
        semester.grade,
        semester.semester,
      ).forEach((name) => names.add(name));
    });
    return names;
  }, [cohortData, schoolData, cohort]);

  // 학년 범위 안내 문구 (예: "2·3학년에 열리는")
  const gradeRangeText = useMemo(() => {
    if (!cohortData) return "";
    const grades = Array.from(
      new Set(getStudentSemesterConfigs(cohortData).map((s) => s.grade)),
    ).sort((a, b) => a - b);
    if (grades.length === 0) return "";
    return `${grades.join("·")}학년에 열리는`;
  }, [cohortData]);

  const filtered = useMemo(() => {
    return subjectCatalog.subjects.filter((s) => {
      if (!showCommon && s.category === "공통") return false;

      const matchSearch =
        !search ||
        s.name.includes(search) ||
        s.description.includes(search) ||
        (s.relatedCareers?.some((c) => c.includes(search)) ?? false) ||
        (s.keyContents?.some((k) => k.includes(search)) ?? false);

      const matchArea = subjectCatalog.subjectAreaMatches(s.area, selectedArea);
      const matchCategory =
        selectedCategory === "전체" || s.category === selectedCategory;
      const matchSuneung = !onlySuneung || s.suneung === true;
      const matchAvailable = !onlyAvailable || availableSubjectNames.has(s.name);

      return (
        matchSearch &&
        matchArea &&
        matchCategory &&
        matchSuneung &&
        matchAvailable
      );
    });
  }, [
    subjectCatalog,
    search,
    selectedArea,
    selectedCategory,
    showCommon,
    onlyAvailable,
    onlySuneung,
    availableSubjectNames,
  ]);

  const categoryOptions = showCommon
    ? ["전체", "공통", "일반선택", "진로선택", "융합선택"]
    : ["전체", "일반선택", "진로선택", "융합선택"];

  return (
    <div className="min-h-dvh pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 pt-3 pb-2">
        <div className="mx-auto max-w-lg">
          <div className="mb-3">
            <h1 className="text-base font-semibold text-foreground">과목 탐색</h1>
            <p className="text-[11px] text-muted-foreground">
              {schoolData.schoolName}
              {cohortLabel ? ` · ${cohortLabel}` : ""}
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="과목명, 진로, 키워드 검색"
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Toggle filters row */}
          <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors border min-h-[32px]",
                onlyAvailable
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              <School className="h-3 w-3" />
              우리 학교 개설
            </button>
            <button
              onClick={() => setOnlySuneung(!onlySuneung)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors border min-h-[32px]",
                onlySuneung
                  ? "bg-violet-100 text-violet-700 border-violet-300"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              수능 출제
            </button>
            <button
              onClick={() => {
                setShowCommon(!showCommon);
                if (showCommon && selectedCategory === "공통") {
                  setSelectedCategory("전체");
                }
              }}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors border min-h-[32px]",
                showCommon
                  ? "bg-gray-200 text-gray-700 border-gray-400"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              공통 포함
            </button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]",
                  selectedCategory === cat
                    ? "bg-[var(--primary)] text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Area filter */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedArea("전체")}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors min-h-[32px]",
                selectedArea === "전체"
                  ? "bg-foreground text-card"
                  : "bg-muted/70 text-muted-foreground"
              )}
            >
              전체
            </button>
            {subjectCatalog.subjectAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors min-h-[32px]",
                  selectedArea === area
                    ? "bg-foreground text-card"
                    : "bg-muted/70 text-muted-foreground"
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-3">
        <p className="mb-3 text-xs text-muted-foreground">
          {gradeRangeText ? `${gradeRangeText} 과목 · ` : ""}
          {filtered.length}개 과목
        </p>
        <div className="flex flex-col gap-2.5">
          {filtered.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              basePath={basePath}
              compact
              isAvailable={availableSubjectNames.has(subject.name)}
              suneung={subject.suneung}
              detailReturnPath={detailReturnPath}
            />
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
