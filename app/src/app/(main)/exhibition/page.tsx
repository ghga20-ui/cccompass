"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ExhibitionSubjectCard } from "@/components/ExhibitionSubjectCard";
import {
  exhibitionSemesterFiltersByAudience,
  getExhibitionOfferings,
  isVisibleForExhibitionAudience,
  semesterKey,
  type ExhibitionAudience,
} from "@/data/exhibition-placement";
import {
  exhibitionAreaMatches,
  exhibitionAreas,
  exhibitionSubjects,
  type ExhibitionArea,
} from "@/data/exhibition-subjects";
import { cn } from "@/lib/utils";

const semesterFilterLabels = {
  all: "전체 학기",
  "2-1": "2학년 1학기",
  "2-2": "2학년 2학기",
  "3-1": "3학년 1학기",
  "3-2": "3학년 2학기",
} as const;

type SemesterFilterKey = keyof typeof semesterFilterLabels;

function includesSemesterFilter(
  semesterFilters: readonly string[],
  selectedSemester: string
): boolean {
  return semesterFilters.includes(selectedSemester);
}

export default function ExhibitionPage() {
  const [audience, setAudience] = useState<ExhibitionAudience>("grade1");
  const [semester, setSemester] = useState("all");
  const [area, setArea] = useState<ExhibitionArea>("전체");
  const [query, setQuery] = useState("");

  const visibleSemesterFilters = useMemo<readonly SemesterFilterKey[]>(
    () => ["all", ...exhibitionSemesterFiltersByAudience[audience]],
    [audience]
  );

  function handleAudienceChange(nextAudience: ExhibitionAudience): void {
    setAudience(nextAudience);

    const nextSemesterFilters = exhibitionSemesterFiltersByAudience[nextAudience];
    if (
      semester !== "all" &&
      !includesSemesterFilter(nextSemesterFilters, semester)
    ) {
      setSemester("all");
    }
  }

  const filteredSubjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

    return exhibitionSubjects
      .filter((subject) => isVisibleForExhibitionAudience(subject.name, audience))
      .map((subject) => ({
        subject,
        offerings: getExhibitionOfferings(subject.name, audience),
      }))
      .filter(({ subject }) =>
        normalizedQuery
          ? subject.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
          : true
      )
      .filter(({ subject }) => exhibitionAreaMatches(subject, area))
      .filter(({ offerings }) =>
        semester === "all"
          ? offerings.length > 0
          : offerings.some((offering) => semesterKey(offering) === semester)
      );
  }, [area, audience, query, semester]);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fffaf0] pb-20">
      <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-b from-sky-50 via-white to-[#fffaf0] px-4 pb-7 pt-7">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fffaf0] to-transparent" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <Image
                src="/exhibition/school-logo.png"
                alt="효자고등학교 로고"
                width={52}
                height={52}
                className="h-13 w-13 rounded-full bg-white object-cover shadow-sm ring-1 ring-sky-100"
                priority
              />
              <div>
                <p className="text-sm font-black text-[var(--primary)]">
                  효자고등학교
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  교육과정박람회
                </p>
              </div>
            </div>

            <p className="text-4xl font-black leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
              2027학년도 선택과목
            </p>
            <h1 className="mt-1 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
              온라인 전시관
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              관심 있는 과목을 검색하고, 영상과 포스터를 함께 보며 나에게 맞는 과목을 찾아보세요.
            </p>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="과목명 검색"
                className="min-h-12 w-full rounded-2xl border border-sky-100 bg-white py-3 pl-11 pr-4 text-base font-semibold shadow-sm outline-none placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          <div className="relative min-h-52 lg:min-h-[340px]">
            <Image
              src="/exhibition/hero-curriculum-fair.png"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-contain object-center opacity-95"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#fffaf0] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#fffaf0]/30" />
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-sky-100 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAudienceChange("grade1")}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-bold transition-colors",
                audience === "grade1"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              1학년
            </button>
            <button
              type="button"
              onClick={() => handleAudienceChange("grade2")}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-bold transition-colors",
                audience === "grade2"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              2학년
            </button>
          </div>

          <div className="relative -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto pb-1 pr-8">
              {visibleSemesterFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSemester(item)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors",
                    semester === item
                      ? "bg-foreground text-card"
                      : "bg-background text-muted-foreground ring-1 ring-border"
                  )}
                >
                  {semesterFilterLabels[item]}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white/95 to-transparent" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground">과목 둘러보기</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredSubjects.length}개 과목
            </p>
          </div>
        </div>

        <div className="relative -mx-4 mb-5 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 pr-8">
            {exhibitionAreas.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setArea(item)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors",
                  area === item
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white text-muted-foreground ring-1 ring-border"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#fffaf0] to-transparent" />
        </div>

        {filteredSubjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map(({ subject, offerings }) => (
              <ExhibitionSubjectCard
                key={subject.id}
                subject={subject}
                audience={audience}
                offerings={offerings}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white p-10 text-center">
            <p className="text-base font-bold text-foreground">
              조건에 맞는 과목이 없습니다.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              검색어를 줄이거나 필터를 바꿔보세요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
