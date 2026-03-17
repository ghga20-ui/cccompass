"use client";

import { useCallback } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SelectionGroup as SelectionGroupType } from "@/data/school";

export interface SelectionGroupProps {
  group: SelectionGroupType;
  selected: string[];
  onToggle: (subjectName: string) => void;
  recommendedSubjects?: Set<string>;
}

export default function SelectionGroup({
  group,
  selected,
  onToggle,
  recommendedSubjects,
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
          const isDisabled = !isSelected && isFull;

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
                isDisabled && "opacity-40 cursor-not-allowed",
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
                    : "border-2 border-muted-foreground/30 bg-white"
                )}
              >
                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>

              {/* Subject name */}
              <span
                className={cn(
                  "flex-1 text-sm",
                  isSelected ? "font-medium text-foreground" : "text-foreground/80"
                )}
              >
                {name}
              </span>

              {/* Badges */}
              <span className="flex shrink-0 items-center gap-1">
                {isRecommended && (
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
