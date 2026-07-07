"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Subject } from "@/data/subjects";
import { getAssessmentBadge } from "@/data/assessment";
import { buildSubjectDetailHref } from "@/lib/subject-navigation";
import type { ConsensusBadge } from "@/data/university-recommendations";
import { CheckCircle2, XCircle } from "lucide-react";

interface SubjectCardProps {
  subject: Subject;
  priority?: "필수" | "권장" | "추천";
  reason?: string;
  compact?: boolean;
  isAvailable?: boolean;
  suneung?: boolean;
  semesters?: string[]; // e.g. ["2-1", "3-2"]
  detailReturnPath?: string;
  consensus?: ConsensusBadge;
}

const categoryColors: Record<string, string> = {
  공통: "bg-gray-100 text-gray-700 border-gray-200",
  일반선택: "bg-blue-100 text-blue-700 border-blue-200",
  진로선택: "bg-orange-100 text-orange-700 border-orange-200",
  융합선택: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const priorityColors: Record<string, string> = {
  필수: "bg-red-500 text-white",
  권장: "bg-amber-500 text-white",
  추천: "bg-sky-500 text-white",
};

export default function SubjectCard({
  subject,
  priority,
  reason,
  compact = false,
  isAvailable,
  suneung,
  semesters,
  detailReturnPath,
  consensus,
}: SubjectCardProps) {
  const showAvailability = isAvailable !== undefined;
  const unavailable = showAvailability && !isAvailable;
  const gradeType = getAssessmentBadge(subject);
  const detailHref = buildSubjectDetailHref(subject.id, detailReturnPath);

  return (
    <Link href={detailHref}>
      <Card
        className={cn(
          "cursor-pointer border-border/60 transition-all active:scale-[0.98]",
          "hover:border-[var(--primary)]/30 hover:shadow-md",
          unavailable && "opacity-50"
        )}
      >
        <CardContent className={cn(compact ? "p-3" : "p-4")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    "font-medium text-foreground",
                    compact ? "text-sm" : "text-base"
                  )}
                >
                  {subject.name}
                </h3>
                {priority && (
                  <Badge
                    className={cn(
                      "shrink-0 text-[10px] px-1.5 py-0",
                      priorityColors[priority]
                    )}
                  >
                    {priority}
                  </Badge>
                )}
                {suneung && (
                  <Badge className="shrink-0 text-[10px] px-1.5 py-0 bg-violet-500 text-white">
                    수능
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-normal",
                    categoryColors[subject.category] || categoryColors["공통"]
                  )}
                >
                  {subject.category}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {subject.area}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1 py-0 font-normal border-0", gradeType.color)}
                >
                  {gradeType.label}
                </Badge>
                {showAvailability && (
                  isAvailable ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      우리 학교 개설
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium">
                      <XCircle className="h-3 w-3" />
                      미개설
                    </span>
                  )
                )}
                {semesters && semesters.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)] font-medium">
                    {semesters.map((sem) => (
                      <span key={sem} className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5">
                        {sem.replace("-", "학년 ")}학기
                      </span>
                    ))}
                  </span>
                )}
              </div>

              {consensus && (consensus.core > 0 || consensus.recommended > 0) && (
                <p className="mt-1 text-[11px] font-medium text-[var(--cta)]">
                  {consensus.core > 0 && `핵심과목 지정 ${consensus.core}개교`}
                  {consensus.core > 0 && consensus.recommended > 0 && " · "}
                  {consensus.recommended > 0 && `권장 ${consensus.recommended}개교`}
                </p>
              )}

              {!compact && (
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {reason || subject.description}
                </p>
              )}

            </div>

            <div className="shrink-0 text-muted-foreground/50">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
