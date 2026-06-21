"use client";

import { useEffect, useState } from "react";
import type { CurriculumSubject } from "@/lib/curriculum/schema";
import {
  hasConcentratedMarker,
  parseManualSplit,
  resolveConcentratedName,
} from "@/lib/curriculum/split-subjects";
import { getReviewFlag } from "@/lib/curriculum/review-flags";

type SubjectRowProps = {
  subject: CurriculumSubject;
  /** 이 과목이 속한 학기(1 또는 2). 집중이수(↔) 배정에 사용 */
  semester: number;
  labelPrefix: string;
  onChange: (subject: CurriculumSubject) => void;
  onDelete: () => void;
  /** 한 과목을 여러 과목으로 치환(수동 분리). area/credits 등은 원본 복제 */
  onReplace: (subjects: CurriculumSubject[]) => void;
  /** false면 삭제 버튼 비활성(선택군 최소 1개 옵션 유지용) */
  canDelete?: boolean;
};

const actionButtonClass =
  "inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100";

export function SubjectRow({
  subject,
  semester,
  labelPrefix,
  onChange,
  onDelete,
  onReplace,
  canDelete = true,
}: SubjectRowProps) {
  const rowId = labelPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitText, setSplitText] = useState("");
  // 학점 입력 중 빈칸/소수 타이핑을 허용하되 상태에는 양수만 반영하기 위한 표시용 문자열
  const [creditsText, setCreditsText] = useState(() => String(subject.credits));

  // key가 인덱스 기반이라 분리/삭제 시 같은 위치에 다른 과목이 들어올 수 있다.
  // 과목이 바뀌면 분리 패널/학점 표시를 그 과목 기준으로 리셋한다.
  useEffect(() => {
    setSplitOpen(false);
    setSplitText("");
    setCreditsText(String(subject.credits));
  }, [subject.name, subject.credits]);

  const concentrated = hasConcentratedMarker(subject.name);
  const reviewFlag = getReviewFlag(subject);

  function openSplit() {
    setSplitText(subject.name);
    setSplitOpen(true);
  }

  function confirmSplit() {
    const names = parseManualSplit(splitText);
    if (names.length === 0) {
      setSplitOpen(false);
      return;
    }
    onReplace(names.map((name) => ({ ...subject, name })));
    setSplitOpen(false);
  }

  function assignConcentrated() {
    onChange({ ...subject, name: resolveConcentratedName(subject.name, semester) });
  }

  return (
    <div
      className={`rounded-md border p-3 ${
        reviewFlag ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"
      }`}
    >
      {reviewFlag ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-md bg-amber-100/70 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">
          <span aria-hidden="true">⚠️</span>
          <span>
            <span className="font-semibold">{reviewFlag.label}</span> · {reviewFlag.reason}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor={`${rowId}-name`}
            className="block text-xs font-semibold text-slate-700"
          >
            과목명
          </label>
          <input
            id={`${rowId}-name`}
            type="text"
            value={subject.name}
            onChange={(event) => onChange({ ...subject, name: event.target.value })}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>

        <div className="w-20 space-y-1">
          <label
            htmlFor={`${rowId}-credits`}
            className="block text-xs font-semibold text-slate-700"
          >
            학점
          </label>
          <input
            id={`${rowId}-credits`}
            type="number"
            min="0.5"
            step="0.5"
            value={creditsText}
            onChange={(event) => {
              const raw = event.target.value;
              setCreditsText(raw);
              // 양수일 때만 상태에 반영 (빈칸/0/NaN은 보류해 schema positive 위반 방지)
              const next = Number(raw);
              if (raw !== "" && Number.isFinite(next) && next > 0) {
                onChange({ ...subject, credits: next });
              }
            }}
            onBlur={() => {
              // 비우거나 잘못 입력한 채 벗어나면 직전 유효 학점으로 되돌린다.
              const next = Number(creditsText);
              if (creditsText === "" || !Number.isFinite(next) || next <= 0) {
                setCreditsText(String(subject.credits));
              }
            }}
            aria-label={`${subject.name || "과목"} 학점`}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {concentrated ? (
          <button
            type="button"
            onClick={assignConcentrated}
            className={actionButtonClass}
            title="집중이수: 1학기는 앞 과목, 2학기는 뒤 과목으로 배정합니다."
          >
            집중이수 {semester}학기 배정
          </button>
        ) : null}
        <button type="button" onClick={openSplit} className={actionButtonClass}>
          과목 나누기
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={`${actionButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label={`${subject.name || "과목"} 삭제`}
        >
          삭제
        </button>
      </div>

      {splitOpen ? (
        <div className="mt-2 space-y-2 rounded-md border border-slate-300 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            한 줄에 한 과목씩 입력하세요. (여러 과목이 한 칸에 붙어 들어온 경우 직접 나눠 주세요)
          </p>
          <textarea
            value={splitText}
            onChange={(event) => setSplitText(event.target.value)}
            rows={Math.min(8, Math.max(3, splitText.split("\n").length + 1))}
            aria-label={`${subject.name || "과목"} 나누기 입력`}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={confirmSplit} className={actionButtonClass}>
              확인
            </button>
            <button
              type="button"
              onClick={() => setSplitOpen(false)}
              className={actionButtonClass}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
