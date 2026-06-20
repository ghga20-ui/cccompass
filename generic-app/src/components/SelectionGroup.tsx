"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SelectionGroup as SelectionGroupType } from "@/lib/hyoja/school-adapter";
import type { Subject } from "@/data/subjects";
import { getAssessmentBadge } from "@/data/assessment";
import { buildSubjectDetailHref } from "@/lib/hyoja/share-routes";

const categoryLabel: Record<string, string> = {
  "일반선택": "일반",
  "진로선택": "진로",
  "융합선택": "융합",
};
const categoryStyle: Record<string, string> = {
  "일반선택": "bg-sky-100 text-sky-600",
  "진로선택": "bg-emerald-100 text-emerald-600",
  "융합선택": "bg-violet-100 text-violet-600",
  "교양": "bg-gray-100 text-gray-600",
};

export interface SelectionGroupProps {
  group: SelectionGroupType;
  selected: string[];
  onToggle: (subjectName: string) => void;
  /** 과목명으로 카탈로그 조회 (정적 + 업로드 fallback 병합본) */
  getSubjectByName: (name: string) => Subject | undefined;
  basePath: string;
  recommendedSubjects?: Set<string>;
  /** 다른 선택군 또는 다른 학기에서 이미 수강한 과목 (중복 수강 불가) */
  conflictSubjects?: Map<string, string>; // subjectName -> reason
  detailReturnPath?: string;
}

export default function SelectionGroup({
  group,
  selected,
  onToggle,
  getSubjectByName,
  basePath,
  recommendedSubjects,
  conflictSubjects,
  detailReturnPath,
}: SelectionGroupProps) {
  const isRadio = group.choose === 1;
  const isFull = selected.length >= group.choose;

  const handleToggle = useCallback(
    (name: string) => {
      onToggle(name);
    },
    [onToggle]
  );

  return (
    <div className="space-y-2">
      {/* Group header */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground leading-tight">
          {group.label}
        </h4>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          택{group.choose} / {group.totalCredits}학점
        </span>
      </div>

      {/* Options list */}
      <div className="space-y-1">
        {group.options.map((name) => {
          const isSelected = selected.includes(name);
          const isRecommended = recommendedSubjects?.has(name) ?? false;
          const conflictReason = conflictSubjects?.get(name);
          const isConflict = !!conflictReason && !isSelected;
          const isDisabled = isConflict || (!isSelected && isFull);
          const subjectData = getSubjectByName(name);
          const cat = subjectData?.category;
          const typeLabel = subjectData?.area === "교양" ? "교양" : cat;
          const assessment = subjectData ? getAssessmentBadge(subjectData) : null;
          const detailHref = subjectData
            ? buildSubjectDetailHref(subjectData.id, detailReturnPath, basePath)
            : null;

          return (
            <div
              key={name}
              className={cn(
                "flex w-full items-stretch gap-2.5 rounded-lg border border-transparent min-h-[48px] text-left transition-all",
                isSelected
                  ? "bg-[var(--primary)]/8 ring-1 ring-[var(--primary)]/35"
                  : "bg-muted/30 hover:bg-muted/60",
                isRecommended &&
                  "border-[var(--cta)]/55 bg-[var(--cta)]/10 shadow-sm shadow-[var(--cta)]/10 ring-1 ring-[var(--cta)]/20"
              )}
            >
              {/* Radio/Checkbox indicator */}
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleToggle(name)}
                className={cn(
                  "flex w-10 shrink-0 items-center justify-center rounded-l-lg transition-colors",
                  isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                )}
                aria-label={`${name} 선택`}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors",
                    !isRadio && "rounded-[4px]",
                    isSelected
                      ? "bg-[var(--primary)] text-white"
                      : "border-2 border-muted-foreground/30 bg-white"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>

              {/* Subject name + info labels */}
              <Link
                href={detailHref ?? "#"}
                aria-disabled={!detailHref}
                className={cn(
                  "flex min-w-0 flex-1 items-center py-2 pr-2",
                  isDisabled && "opacity-60",
                  !detailHref && "pointer-events-none"
                )}
              >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm",
                    isSelected ? "font-medium text-foreground" : "text-foreground/80",
                  )}
                >
                  {name}
                </span>
                {subjectData && typeLabel && cat !== "공통" && (
                  <span className="ml-1.5 inline-flex items-center gap-1">
                    <span className={cn("rounded px-1 py-0 text-[10px] font-medium leading-[16px]", categoryStyle[typeLabel] ?? "bg-muted text-muted-foreground")}>
                      {categoryLabel[typeLabel] ?? typeLabel}
                    </span>
                    <span className={cn("rounded px-1 py-0 text-[10px] font-medium leading-[16px]", assessment?.color ?? "bg-muted text-muted-foreground")}>
                      {assessment?.label}
                    </span>
                  </span>
                )}
              </span>

              {/* Badges */}
              <span className="flex shrink-0 items-center gap-1">
                {isConflict && (
                  <Badge
                    variant="secondary"
                    className="border-0 bg-red-100 px-1.5 py-0 text-[10px] font-medium text-red-500 h-4"
                  >
                    {conflictReason}
                  </Badge>
                )}
                {isRecommended && !isConflict && (
                  <Badge
                    variant="secondary"
                    className="border border-[var(--cta)]/25 bg-[var(--cta)] px-1.5 py-0 text-[10px] font-semibold text-white h-4"
                  >
                    추천
                  </Badge>
                )}
                {detailHref && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-end">
        <span
          className={cn(
            "text-[11px] font-medium",
            selected.length === group.choose
              ? "text-emerald-600"
              : selected.length > 0
              ? "text-[var(--primary)]"
              : "text-muted-foreground"
          )}
        >
          {selected.length}/{group.choose} 선택
          {selected.length === group.choose && " ✓"}
        </span>
      </div>
    </div>
  );
}
