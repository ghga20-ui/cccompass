"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ExhibitionSubjectCard } from "@/components/ExhibitionSubjectCard";
import type { Subject } from "@/data/subjects";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getCohortData,
  getDesignatedSubjects,
  getSelectionGroups,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import { buildCurrentPath } from "@/lib/hyoja/share-routes";
import { cn } from "@/lib/utils";

interface ExhibitionItem {
  subject: Subject;
  semesterKeys: string[]; // ["2-1", "3-2"]
}

export default function ExhibitionPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string>("전체");
  const [semester, setSemester] = useState<string>("all");

  const detailReturnPath = buildCurrentPath(pathname, searchParams.toString());

  const semesterConfigs = useMemo(
    () => (cohortData ? getStudentSemesterConfigs(cohortData) : []),
    [cohortData],
  );

  // 편제 개설 과목 → subject + 개설 학기 목록
  const items = useMemo<ExhibitionItem[]>(() => {
    if (!cohortData) return [];
    const bySubjectId = new Map<string, ExhibitionItem>();

    const add = (name: string, semKey: string) => {
      const subject = subjectCatalog.getSubjectByName(name);
      if (!subject) return;
      const existing = bySubjectId.get(subject.id);
      if (existing) {
        if (!existing.semesterKeys.includes(semKey)) {
          existing.semesterKeys.push(semKey);
        }
        return;
      }
      bySubjectId.set(subject.id, { subject, semesterKeys: [semKey] });
    };

    semesterConfigs.forEach(({ grade, semester: sem }) => {
      const semKey = `${grade}-${sem}`;
      getDesignatedSubjects(schoolData, cohort, grade, sem).forEach((d) =>
        add(d.subject, semKey),
      );
      getSelectionGroups(schoolData, cohort, grade, sem).forEach((g) =>
        g.options.forEach((o) => add(o, semKey)),
      );
    });

    return Array.from(bySubjectId.values());
  }, [cohortData, semesterConfigs, schoolData, cohort, subjectCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return items.filter(({ subject, semesterKeys }) => {
      if (subject.category === "공통") return false;
      const matchQuery =
        !q ||
        subject.name.includes(q) ||
        subject.description.includes(q) ||
        subject.area.includes(q);
      const matchArea = subjectCatalog.subjectAreaMatches(subject.area, area);
      const matchSemester = semester === "all" || semesterKeys.includes(semester);
      return matchQuery && matchArea && matchSemester;
    });
  }, [items, query, area, semester, subjectCatalog]);

  const semesterFilters = useMemo(
    () => [
      { key: "all", label: "전체 학기" },
      ...semesterConfigs.map((s) => ({
        key: `${s.grade}-${s.semester}`,
        label: s.label,
      })),
    ],
    [semesterConfigs],
  );

  if (!cohortData) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 text-center">
        <p className="text-muted-foreground">편제 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-6">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src="/exhibition/hero-curriculum-fair.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
        <div className="relative mx-auto max-w-3xl px-6 py-14 text-white">
          <p className="text-sm font-semibold text-white/80">
            {schoolData.schoolName}
            {cohortLabel ? ` · ${cohortLabel}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            선택과목 전시관
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/85">
            포스터로 우리 학교 선택과목을 한눈에 둘러보세요.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과목명, 영역 검색"
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {semesterFilters.length > 2 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {semesterFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSemester(f.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[34px]",
                    semester === f.key
                      ? "bg-[var(--primary)] text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setArea("전체")}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors min-h-[32px]",
                area === "전체"
                  ? "bg-foreground text-card"
                  : "bg-muted/70 text-muted-foreground",
              )}
            >
              전체
            </button>
            {subjectCatalog.subjectAreas.map((a) => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors min-h-[32px]",
                  area === a
                    ? "bg-foreground text-card"
                    : "bg-muted/70 text-muted-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <p className="mb-3 text-xs text-muted-foreground">{filtered.length}개 과목</p>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            조건에 맞는 과목이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ subject, semesterKeys }) => (
              <ExhibitionSubjectCard
                key={subject.id}
                subject={subject}
                basePath={basePath}
                semesterLabels={semesterKeys.map((k) => {
                  const [g, s] = k.split("-");
                  return `${g}학년 ${s}학기`;
                })}
                detailReturnPath={detailReturnPath}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
