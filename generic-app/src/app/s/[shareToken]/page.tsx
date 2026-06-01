"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import { buildShareHref } from "@/lib/hyoja/share-routes";
import { cn } from "@/lib/utils";

const departmentOptions = [
  {
    departmentName: "간호학과",
    label: "간호학과",
    fieldName: "보건·의료",
    trackName: "자연·보건",
  },
  {
    departmentName: "컴퓨터공학과",
    label: "컴퓨터공학과",
    fieldName: "공학",
    trackName: "정보·공학",
  },
  {
    departmentName: "경영학과",
    label: "경영학과",
    fieldName: "사회·상경",
    trackName: "인문·사회",
  },
];

const interestTags = [
  { id: "health-medical", label: "보건·의료" },
  { id: "engineering-it", label: "공학·IT" },
  { id: "business-social", label: "경영·사회" },
  { id: "education-humanities", label: "교육·인문" },
];

export default function ShareHomePage() {
  const router = useRouter();
  const { basePath, schoolData } = useHyojaRuntime();
  const { cohort, setCohort, cohortOptions } = useCohort();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<
    (typeof departmentOptions)[number] | null
  >(null);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("ko-KR");
    if (!query || selectedDepartment) return [];

    return departmentOptions.filter((department) =>
      department.departmentName.toLocaleLowerCase("ko-KR").includes(query),
    );
  }, [searchQuery, selectedDepartment]);

  const canProceed = selectedDepartment !== null || selectedInterest !== null;

  function handleSelectDepartment(department: (typeof departmentOptions)[number]) {
    setSelectedDepartment(department);
    setSelectedInterest(null);
    setSearchQuery("");
  }

  function handleNext() {
    if (selectedDepartment) {
      router.push(
        buildShareHref(basePath, "/recommend", {
          dept: selectedDepartment.departmentName,
        }),
      );
      return;
    }

    if (selectedInterest) {
      router.push(
        buildShareHref(basePath, "/recommend", {
          interests: selectedInterest,
        }),
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <section className="px-5 pb-6 pt-10 md:pt-16 md:text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex items-center gap-2.5 md:justify-center">
            <img
              src="/school-logo.png"
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
            />
            <span className="text-2xl font-bold tracking-normal text-foreground">
              {schoolData.schoolName}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
            나에게 맞는
            <br />
            <span className="text-[var(--primary)]">선택과목</span>을 찾아보자
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground md:text-base">
            우리 학교 편제표를 기반으로
            <br className="md:hidden" />
            진로에 맞는 과목을 추천해줄게
          </p>
        </div>
      </section>

      <section className="px-5 pb-4">
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-medium text-foreground">
              입학 연도를 선택해줘
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {cohortOptions.map((option) => {
              const isSelected = cohort === option.entranceYear;

              return (
                <button
                  key={option.entranceYear}
                  type="button"
                  onClick={() => setCohort(option.entranceYear)}
                  className="text-center"
                >
                  <Card
                    className={cn(
                      "transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)] shadow-md"
                        : "border-border bg-card hover:border-[var(--primary)]/30",
                    )}
                  >
                    <CardContent className="p-3.5">
                      <p
                        className={cn(
                          "text-lg font-bold",
                          isSelected ? "text-white" : "text-foreground",
                        )}
                      >
                        {option.entranceYear}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          isSelected ? "text-white/75" : "text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-4">
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Search className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-medium text-foreground">학과로 검색</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="학과를 검색해봐"
              disabled={selectedDepartment !== null}
              className="min-h-[44px] w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
            />

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {searchResults.map((department) => (
                  <button
                    key={department.departmentName}
                    type="button"
                    onClick={() => handleSelectDepartment(department)}
                    className="flex min-h-[44px] w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--primary)]/5"
                  >
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {department.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {department.fieldName} · {department.trackName}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedDepartment && (
            <div className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2">
              <span className="text-sm font-medium text-[var(--primary)]">
                {selectedDepartment.label}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full transition-colors hover:bg-[var(--primary)]/20"
              >
                <X className="h-3.5 w-3.5 text-[var(--primary)]" />
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="px-5">
        <div className="mx-auto max-w-lg">
          <hr className="border-border" />
        </div>
      </div>

      <section className="flex-1 px-5 pb-6 pt-4">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-sm font-medium text-foreground">
            관심 분야를 골라봐
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {interestTags.map((tag) => {
              const isSelected = selectedInterest === tag.id;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedInterest(isSelected ? null : tag.id);
                    setSelectedDepartment(null);
                  }}
                  className={cn(
                    "min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                      : "border-border bg-card text-foreground hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5",
                  )}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sticky bottom-[72px] z-30 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-md md:bottom-0">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              "h-12 w-full rounded-xl text-base font-semibold transition-all",
              canProceed
                ? "bg-[var(--cta)] text-white shadow-lg shadow-[var(--cta)]/25 hover:bg-[var(--cta)]/90"
                : "bg-muted text-muted-foreground",
            )}
          >
            맞춤 과목 추천받기
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
