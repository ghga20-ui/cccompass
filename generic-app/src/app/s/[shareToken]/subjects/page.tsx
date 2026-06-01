"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getAllAvailableSubjectNames,
  getCohortData,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import { buildCurrentPath, buildSubjectDetailHref } from "@/lib/hyoja/share-routes";

export default function SubjectsPage() {
  const pathname = usePathname();
  const { cohort } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);
  const currentPath = buildCurrentPath(pathname, "");

  const subjectNames = Array.from(
    new Set(
      (cohortData ? getStudentSemesterConfigs(cohortData) : []).flatMap((semester) =>
        getAllAvailableSubjectNames(
          schoolData,
          cohort,
          semester.grade,
          semester.semester,
        ),
      ),
    ),
  );

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <section className="mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-normal text-foreground">
            과목 탐색
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {schoolData.schoolName}에서 2·3학년에 열리는 과목만 모았어요.
        </p>
      </section>

      <div className="space-y-3">
        {subjectNames.map((subjectName) => {
          const subject = subjectCatalog.getSubjectByName(subjectName);
          const subjectId = subject?.id ?? subjectName;

          return (
            <Link
              key={subjectName}
              href={buildSubjectDetailHref(subjectId, currentPath, basePath)}
            >
              <Card className="transition-colors hover:ring-[var(--primary)]/40">
                <CardContent className="p-4">
                  <p className="text-base font-semibold text-foreground">
                    {subjectName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subject?.area ?? "학교 편제 과목"} · {subject?.credits ?? ""}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {subject?.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
