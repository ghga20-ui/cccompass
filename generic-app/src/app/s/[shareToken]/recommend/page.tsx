"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Map, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getAllAvailableSubjectNames,
  getCohortData,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import {
  buildCurrentPath,
  buildShareHref,
  buildSubjectDetailHref,
} from "@/lib/hyoja/share-routes";

const recommendationSeeds: Record<string, string[]> = {
  간호학과: ["문학", "Economics", "Grade 1 Only Recommendation"],
  "health-medical": ["문학", "Economics", "Grade 1 Only Recommendation"],
};

function recommendedNames(dept: string | null, interests: string | null) {
  if (dept && recommendationSeeds[dept]) return recommendationSeeds[dept];
  if (interests) {
    return interests
      .split(",")
      .flatMap((interest) => recommendationSeeds[interest] ?? []);
  }
  return [];
}

export default function RecommendPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { cohort } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);
  const dept = searchParams.get("dept");
  const interests = searchParams.get("interests");
  const title = dept ? `${dept} 추천 과목` : "관심 분야 추천 과목";

  if (!cohortData) {
    return (
      <section className="mx-auto max-w-lg px-5 py-8">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            선택한 입학 연도에 공개할 과목 데이터가 없어요.
          </CardContent>
        </Card>
      </section>
    );
  }

  const currentPath = buildCurrentPath(pathname, searchParams.toString());
  const configuredSemesters = getStudentSemesterConfigs(cohortData);
  const recommended = new Set(recommendedNames(dept, interests));
  const recommendedBySemester = configuredSemesters.map((semester) => {
    const availableNames = getAllAvailableSubjectNames(
      schoolData,
      cohort,
      semester.grade,
      semester.semester,
    ).filter((name) => recommended.has(name));

    return {
      ...semester,
      subjects: availableNames,
    };
  });
  const roadmapSubjects = recommendedBySemester.flatMap((semester) => semester.subjects);
  const roadmapHref = buildShareHref(basePath, "/roadmap", {
    subjects: roadmapSubjects.join(","),
  });

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <Link
        href={buildShareHref(basePath, "/")}
        className="mb-4 inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        홈으로
      </Link>

      <section className="rounded-2xl bg-[var(--primary)] px-5 py-6 text-white">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <Badge className="bg-white/20 text-white">추천</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/80">
          {schoolData.schoolName} 편제표에서 2·3학년에 실제로 열리는 과목만
          보여줘요.
        </p>
      </section>

      <div className="mt-5 space-y-3">
        {recommendedBySemester.map((semester) => (
          <Card key={`${semester.grade}-${semester.semester}`}>
            <CardHeader>
              <CardTitle>{semester.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {semester.subjects.length > 0 ? (
                semester.subjects.map((subjectName) => {
                  const subject = subjectCatalog.getSubjectByName(subjectName);
                  const subjectId = subject?.id ?? subjectName;

                  return (
                    <Link
                      key={subjectName}
                      href={buildSubjectDetailHref(subjectId, currentPath, basePath)}
                      className="block rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-[var(--primary)]/40"
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        {subjectName}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {subject?.area ?? "학교 편제 과목"}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  이 학기에는 조건에 맞는 추천 과목이 없어요.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-[72px] z-30 mt-6 border-t border-border bg-background/95 py-3 backdrop-blur-md">
        <Button
          render={<Link href={roadmapHref} />}
          disabled={roadmapSubjects.length === 0}
          className="h-12 w-full rounded-xl bg-[var(--cta)] text-base font-semibold text-white hover:bg-[var(--cta)]/90"
        >
          <Map className="h-4 w-4" />
          로드맵에 담기
        </Button>
      </div>
    </div>
  );
}
