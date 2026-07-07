"use client";

import type { CoverageResult } from "@/lib/consensus";

export default function CoverageGauge({ result }: { result: CoverageResult }) {
  if (result.denominator === 0) return null;
  const topMissing = result.missing.slice(0, 3);

  return (
    <div className="mx-auto max-w-lg mt-2 rounded-xl bg-card/80 border border-border/50 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground shrink-0">
          대학 핵심과목
        </span>
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--cta)] transition-all"
            style={{ width: `${result.percent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--cta)] shrink-0">
          {result.percent}%
        </span>
      </div>
      {topMissing.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          빠짐:{" "}
          {topMissing
            .map((m) => `${m.name}(${m.count}개교 핵심)`)
            .join(", ")}
        </p>
      )}
      {result.notOffered.length > 0 && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
          우리 학교 미개설: {result.notOffered
            .slice(0, 3)
            .map((m) => `${m.name}(${m.count}개교 핵심)`)
            .join(", ")} — 공동교육과정 등 확인
        </p>
      )}
    </div>
  );
}
