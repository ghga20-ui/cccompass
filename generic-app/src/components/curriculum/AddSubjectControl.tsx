"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjects, subjectAreas, subjectAreaMatches } from "@/data/subjects";

function parseCredits(raw: string): number {
  const match = String(raw).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 1;
}

/**
 * 과목 추가 컨트롤: 교과군을 고르면 해당 교과군 과목이 드롭다운으로 열리고 선택해 추가.
 * '직접 입력' 모드로 자유 입력도 가능(기존 방식 유지).
 */
export function AddSubjectControl({
  onAdd,
  label = "과목 추가",
}: {
  onAdd: (subject: { name: string; credits: number }) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");

  const areaSubjects = useMemo(
    () =>
      area
        ? subjects
            .filter((s) => subjectAreaMatches(s.area, area))
            .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        : [],
    [area],
  );

  function reset() {
    setArea("");
    setName("");
    setManual(false);
    setManualName("");
  }

  function close() {
    reset();
    setOpen(false);
  }

  function add() {
    if (manual) {
      const trimmed = manualName.trim();
      if (!trimmed) return;
      onAdd({ name: trimmed, credits: 1 });
    } else {
      const subject = subjects.find((s) => s.name === name);
      if (!subject) return;
      onAdd({ name: subject.name, credits: parseCredits(subject.credits) });
    }
    reset();
    // 연속 추가 편의를 위해 패널은 열린 채 유지
  }

  const selectClass =
    "min-h-[38px] rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--primary)]/25 bg-[var(--secondary)]/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--primary)]">{label}</p>
        <button
          type="button"
          onClick={close}
          className="rounded p-0.5 text-slate-400 hover:text-slate-700"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {manual ? (
        <input
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="과목명 직접 입력"
          autoFocus
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setName("");
            }}
            className={selectClass}
            aria-label="교과군"
          >
            <option value="">교과군 선택</option>
            {subjectAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!area}
            className={`${selectClass} min-w-[10rem] flex-1 disabled:opacity-50`}
            aria-label="과목"
          >
            <option value="">{area ? "과목 선택" : "교과군을 먼저 골라주세요"}</option>
            {areaSubjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={add}
          disabled={manual ? manualName.trim().length === 0 : name === ""}
        >
          추가
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setManual((m) => !m);
            setName("");
            setManualName("");
          }}
          className="text-slate-500"
        >
          {manual ? "목록에서 선택" : "직접 입력"}
        </Button>
      </div>
    </div>
  );
}
