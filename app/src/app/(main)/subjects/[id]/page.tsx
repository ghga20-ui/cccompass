"use client";

import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Briefcase,
  School,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { subjects, getSubjectById } from "@/data/subjects";
import { getCohortData, getExpandedSubjectNames, type SelectionGroup } from "@/data/school";
import { getUniversitiesRequiringSubject } from "@/data/university-requirements";
import { useCohort } from "@/contexts/CohortContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const categoryColors: Record<string, string> = {
  공통: "bg-gray-100 text-gray-700",
  일반선택: "bg-blue-100 text-blue-700",
  진로선택: "bg-orange-100 text-orange-700",
  융합선택: "bg-emerald-100 text-emerald-700",
};

interface SchoolAvailability {
  grade: number;
  semester: number;
  label: string;
  type: "designated" | "selection";
}

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const subject = getSubjectById(params.id);
  const { cohort } = useCohort();

  // Find school availability for this subject
  const schoolAvailability = useMemo((): SchoolAvailability[] => {
    if (!subject) return [];
    const cohortData = getCohortData(cohort);
    if (!cohortData) return [];
    const results: SchoolAvailability[] = [];

    // Check designated subjects
    cohortData.designated.forEach((d) => {
      if (getExpandedSubjectNames(d.subject).includes(subject.name)) {
        results.push({
          grade: d.grade,
          semester: d.semester,
          label: "지정 과목",
          type: "designated",
        });
      }
    });

    // Check selection groups
    cohortData.selections.forEach((group) => {
      if (group.options.some((name) => getExpandedSubjectNames(name).includes(subject.name))) {
        results.push({
          grade: group.grade,
          semester: group.semester,
          label: group.label,
          type: "selection",
        });
      }
    });

    return results;
  }, [subject, cohort]);

  // University requirements for this subject
  const universityResults = useMemo(() => {
    if (!subject) return [];
    // Try both by area and by exact name
    const byArea = getUniversitiesRequiringSubject(subject.area);
    const byName = getUniversitiesRequiringSubject(subject.name);
    // Deduplicate by university+department
    const seen = new Set<string>();
    const merged: { field: string; department: string; university: string }[] =
      [];
    [...byName, ...byArea].forEach((r) => {
      const key = `${r.university}__${r.department}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    });
    return merged;
  }, [subject]);

  // Unique university names for summary display
  const uniqueUniversities = useMemo(() => {
    const names = new Set<string>();
    universityResults.forEach((r) => names.add(r.university));
    return Array.from(names);
  }, [universityResults]);

  if (!subject) {
    notFound();
  }

  const isAvailable = schoolAvailability.length > 0;

  return (
    <div className="min-h-dvh pb-6">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/subjects" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground truncate">
            과목 상세
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-4">
        {/* Header card */}
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge
                className={cn(
                  "text-xs",
                  categoryColors[subject.category] || categoryColors["공통"]
                )}
              >
                {subject.category}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {subject.area}
              </Badge>
              {subject.suneung ? (
                <Badge className="bg-violet-100 text-violet-700 text-xs">
                  수능 출제
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  수능 미출제
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {subject.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {subject.description}
            </p>
          </CardContent>
        </Card>

        {/* Key contents */}
        {subject.keyContents && subject.keyContents.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-foreground">
                  주요 학습 내용
                </h3>
              </div>
              <ul className="space-y-2">
                {subject.keyContents.map((content, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]/40" />
                    {content}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Related careers */}
        {subject.relatedCareers && subject.relatedCareers.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-foreground">
                  관련 직업
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subject.relatedCareers.map((career) => (
                  <Badge
                    key={career}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {career}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related departments */}
        {subject.relatedDepartments && subject.relatedDepartments.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-foreground">
                  관련 학과
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subject.relatedDepartments.map((dept) => (
                  <Badge
                    key={dept}
                    className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-normal"
                  >
                    {dept}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* School availability */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <School className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="text-sm font-semibold text-foreground">
                우리 학교 개설 정보
              </h3>
            </div>
            {isAvailable ? (
              <div className="space-y-2">
                {schoolAvailability.map((avail, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-foreground">
                      <span className="font-medium">
                        {avail.grade}학년 {avail.semester}학기
                      </span>
                      {" "}
                      {avail.type === "designated" ? (
                        <span className="text-muted-foreground">
                          지정 과목으로 수강
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {avail.label}에서 수강 가능
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                효자고등학교에서는 현재 개설되지 않은 과목입니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* University requirements */}
        {universityResults.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  대학 반영 정보
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                이 과목 교과영역({subject.area})을 반영하는 대학이{" "}
                <span className="font-semibold text-foreground">
                  {uniqueUniversities.length}개교
                </span>{" "}
                있습니다.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueUniversities.slice(0, 12).map((uni) => (
                  <Badge
                    key={uni}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-normal border-indigo-200 text-indigo-600 bg-indigo-50"
                  >
                    {uni}
                  </Badge>
                ))}
                {uniqueUniversities.length > 12 && (
                  <span className="text-[10px] text-indigo-400 self-center">
                    +{uniqueUniversities.length - 12}개교
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
