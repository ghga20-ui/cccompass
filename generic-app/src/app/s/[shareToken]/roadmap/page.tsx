"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getCohortData,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import { buildShareHref } from "@/lib/hyoja/share-routes";
import {
  decodeRoadmapSelectionState,
  encodeRoadmapSelectionState,
} from "@/lib/roadmap-selection-state";

export default function RoadmapPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { cohort } = useCohort();
  const { basePath, schoolData } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);
  const validGroupIds = useMemo(
    () => new Set(cohortData?.selections.map((group) => group.id) ?? []),
    [cohortData],
  );
  const initialState = useMemo(
    () => decodeRoadmapSelectionState(searchParams.get("state"), validGroupIds),
    [searchParams, validGroupIds],
  );
  const [selected, setSelected] = useState<Record<string, string>>(
    initialState?.selections ?? {},
  );

  if (!cohortData) {
    return (
      <section className="mx-auto max-w-lg px-5 py-8">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            선택한 입학 연도에 공개할 로드맵 데이터가 없어요.
          </CardContent>
        </Card>
      </section>
    );
  }

  const semesterConfigs = getStudentSemesterConfigs(cohortData);
  const selectedCredits = Object.entries(selected).reduce((total, [groupId]) => {
    const group = cohortData.selections.find((item) => item.id === groupId);
    return total + (group?.creditsEach ?? 0);
  }, 0);
  const designatedCredits = cohortData.designated.reduce(
    (total, subject) => total + subject.credits,
    0,
  );
  const totalCredits = designatedCredits + selectedCredits;
  const shareState = encodeRoadmapSelectionState({ cohort, selections: selected });
  const sharePath = buildShareHref(basePath, "/roadmap", { state: shareState });

  function toggleSelection(groupId: string, option: string) {
    setSelected((current) => ({
      ...current,
      [groupId]: current[groupId] === option ? "" : option,
    }));
  }

  async function copyShareLink() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    await navigator.clipboard.writeText(`${origin}${sharePath}`);
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <section className="rounded-2xl bg-[var(--primary)] px-5 py-6 text-white">
        <h1 className="text-2xl font-bold tracking-normal">선택과목 로드맵</h1>
        <p className="mt-2 text-sm text-white/80">
          {schoolData.schoolName}의 2·3학년 과목만 반영했어요.
        </p>
      </section>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <span className="text-sm font-medium text-foreground">선택 학점 {totalCredits}</span>
        <Button variant="outline" size="sm" onClick={copyShareLink}>
          <Link2 className="h-4 w-4" />
          공유 링크 복사
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {semesterConfigs.map((semester) => {
          const groups = cohortData.selections.filter(
            (group) =>
              group.grade === semester.grade && group.semester === semester.semester,
          );
          const designated = cohortData.designated.filter(
            (subject) =>
              subject.grade === semester.grade &&
              subject.semester === semester.semester,
          );

          return (
            <Card key={`${semester.grade}-${semester.semester}`}>
              <CardHeader>
                <CardTitle>{semester.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {designated.map((subject) => (
                  <div
                    key={subject.subject}
                    className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground"
                  >
                    {subject.subject}
                  </div>
                ))}
                {groups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleSelection(group.id, option)}
                          className="min-h-[40px] rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground"
                        >
                          {option} 선택
                        </button>
                      ))}
                    </div>
                    {selected[group.id] && (
                      <p className="text-sm text-primary">{selected[group.id]}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <input type="hidden" value={pathname} readOnly />
    </div>
  );
}
