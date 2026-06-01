"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getCohortData,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import { getInternalReturnPath } from "@/lib/hyoja/share-routes";

export default function SubjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const { cohort } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const subject = subjectCatalog.getSubjectById(params.id);
  const cohortData = getCohortData(schoolData, cohort);
  const returnPath = getInternalReturnPath(searchParams.get("from"), basePath);

  if (!subject || !cohortData) {
    return (
      <section className="mx-auto max-w-lg px-5 py-8">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            과목 정보를 찾지 못했어요.
          </CardContent>
        </Card>
      </section>
    );
  }

  const availability = getStudentSemesterConfigs(cohortData).flatMap((semester) => {
    const designated = cohortData.designated
      .filter(
        (item) =>
          item.subject === subject.name &&
          item.grade === semester.grade &&
          item.semester === semester.semester,
      )
      .map(() => ({ ...semester, type: "지정" }));
    const selected = cohortData.selections
      .filter(
        (group) =>
          group.options.includes(subject.name) &&
          group.grade === semester.grade &&
          group.semester === semester.semester,
      )
      .map(() => ({ ...semester, type: "선택" }));

    return [...designated, ...selected];
  });

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <Link
        href={returnPath}
        className="mb-4 inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="text-sm font-medium text-primary">{subject.area}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-foreground">
          {subject.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {subject.description}
        </p>
      </section>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>우리 학교 개설 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {availability.map((item) => (
            <div
              key={`${item.grade}-${item.semester}-${item.type}`}
              className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground"
            >
              {item.grade}학년 {item.semester}학기 · {item.type}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
