"use client";

import { useState } from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CurriculumSubject } from "@/lib/curriculum/schema";
import {
  hasConcentratedMarker,
  resolveConcentratedName,
  splitConcentratedNames,
} from "@/lib/curriculum/split-subjects";
import { getReviewFlag } from "@/lib/curriculum/review-flags";

type SubjectRowProps = {
  subject: CurriculumSubject;
  /** 이 과목이 속한 학기(1 또는 2). 집중이수(↔) 칩 추천 표시에 사용 */
  semester: number;
  labelPrefix: string;
  onChange: (subject: CurriculumSubject) => void;
  onDelete: () => void;
  /** false면 삭제 버튼 비활성(선택군 최소 1개 옵션 유지용) */
  canDelete?: boolean;
  /** 선택군 안에서는 학점을 그룹 단위로 관리하므로 행의 학점 입력을 숨긴다 */
  hideCredits?: boolean;
};

export function SubjectRow({
  subject,
  semester,
  labelPrefix,
  onChange,
  onDelete,
  canDelete = true,
  hideCredits = false,
}: SubjectRowProps) {
  const rowId = labelPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");
  const [creditsText, setCreditsText] = useState(() => String(subject.credits));
  // 외부에서 과목명/학점이 바뀌면 입력값을 재동기화한다.
  // (effect 내 setState 대신 렌더 중 보정 — React 권장 패턴)
  const [syncedKey, setSyncedKey] = useState(`${subject.name}|${subject.credits}`);
  const currentKey = `${subject.name}|${subject.credits}`;
  if (syncedKey !== currentKey) {
    setSyncedKey(currentKey);
    setCreditsText(String(subject.credits));
  }

  const concentrated = hasConcentratedMarker(subject.name);
  const reviewFlag = getReviewFlag(subject);
  const rawText = subject.rawText?.trim();

  // 집중이수("A↔B") — 보통 파싱 단계에서 학기별로 자동 분리되지만,
  // 자동 분리가 안 된 잔여 ↔는 교사가 이 학기에 열리는 과목을 칩으로 직접 고른다.
  const concentratedParts = concentrated ? splitConcentratedNames(subject.name) : [];
  // 학기 순서 기반 추천(1학기→앞, 2학기→뒤). 칩에 '추천' 표시로만 사용.
  const recommendedName = concentrated ? resolveConcentratedName(subject.name, semester) : "";

  function pickConcentrated(part: string) {
    onChange({ ...subject, name: part });
  }

  const inputClass =
    "rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        reviewFlag ? "border-amber-300 bg-amber-50/60" : "border-[var(--border)] bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          id={`${rowId}-name`}
          type="text"
          value={subject.name}
          placeholder="과목명"
          onChange={(event) => onChange({ ...subject, name: event.target.value })}
          aria-label="과목명"
          className={`min-w-0 flex-1 ${inputClass}`}
        />
        {!hideCredits ? (
          <>
            <input
              id={`${rowId}-credits`}
              type="number"
              min="0.5"
              step="0.5"
              value={creditsText}
              onChange={(event) => {
                const raw = event.target.value;
                setCreditsText(raw);
                const next = Number(raw);
                if (raw !== "" && Number.isFinite(next) && next > 0) {
                  onChange({ ...subject, credits: next });
                }
              }}
              onBlur={() => {
                const next = Number(creditsText);
                if (creditsText === "" || !Number.isFinite(next) || next <= 0) {
                  setCreditsText(String(subject.credits));
                }
              }}
              aria-label={`${subject.name || "과목"} 학점`}
              className={`w-14 text-center ${inputClass}`}
            />
            <span className="text-[11px] text-slate-400">학점</span>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={`${subject.name || "과목"} 삭제`}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {reviewFlag ? (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-100/70 px-2 py-1 text-[11px] leading-relaxed text-amber-900">
          <span aria-hidden="true">⚠️</span>
          <span>
            <span className="font-bold">{reviewFlag.label}</span> · {reviewFlag.reason}
            {rawText ? (
              <span className="mt-0.5 block text-amber-800/90">원본: {rawText}</span>
            ) : null}
          </span>
        </div>
      ) : rawText ? (
        <p className="mt-1 text-[11px] text-slate-400">원본: {rawText}</p>
      ) : null}

      {concentrated && concentratedParts.length >= 2 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md bg-amber-100/70 px-2 py-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900">
            <ArrowLeftRight className="h-3.5 w-3.5" />이 학기 과목:
          </span>
          {concentratedParts.map((part) => {
            const isRecommended = part === recommendedName;
            return (
              <button
                key={part}
                type="button"
                onClick={() => pickConcentrated(part)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {part}
                {isRecommended ? (
                  <span className="text-[10px] font-bold text-[var(--primary)]">
                    {semester}학기 추천
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
