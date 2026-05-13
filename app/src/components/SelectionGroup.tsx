"use client";

import { useCallback } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SelectionGroup as SelectionGroupType } from "@/data/school";
import { getSubjectByName } from "@/data/subjects";
import { getAssessmentBadge } from "@/data/assessment";

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
  recommendedSubjects?: Set<string>;
  /** 다른 선택군 또는 다른 학기에서 이미 수강한 과목 (중복 수강 불가) */
  conflictSubjects?: Map<string, string>;  // subjectName -> reason
}

export default function SelectionGroup({
  group,
  selected,
  onToggle,
  recommendedSubjects,
  conflictSubjects,
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

          return (
            <button
              key={name}
              type="button"
              disabled={isDisabled}
              onClick={() => handleToggle(name)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 min-h-[44px] text-left transition-all",
                isSelected
                  ? "bg-[var(--primary)]/8 ring-1 ring-[var(--primary)]/30"
                  : "bg-muted/30 hover:bg-muted/60",
                isDisabled && "cursor-not-allowed",
                isRecommended && !isSelected && "ring-1 ring-[var(--cta)]/20"
              )}
            >
              {/* Radio/Checkbox indicator */}
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full transition-colors",
                  isRadio ? "h-[18px] w-[18px]" : "h-[18px] w-[18px] rounded-[4px]",
                  isSelected
                    ? "bg-[var(--primary)] text-white"
                    : "border-2 border-muted-foreground/30 bg-white",
                  isDisabled && "opacity-40"
                )}
              >
                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>

              {/* Subject name + info labels */}
              <span className={cn("flex-1 min-w-0", isDisabled && "opacity-40")}>
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
                    className="border-0 bg-[var(--cta)]/10 px-1.5 py-0 text-[10px] font-semibold text-[var(--cta)] h-4"
                  >
                    추천
                  </Badge>
                )}
              </span>
            </button>
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
          {selected.length === group.choose && " \u2713"}
        </span>
      </div>
    </div>
  );
}
