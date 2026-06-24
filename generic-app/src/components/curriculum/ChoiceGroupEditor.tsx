import { Layers, Merge, Trash2 } from "lucide-react";
import type { ChoiceGroup, CurriculumSubject } from "@/lib/curriculum/schema";
import { SubjectRow } from "@/components/curriculum/SubjectRow";
import { AddSubjectControl } from "@/components/curriculum/AddSubjectControl";
import { Button } from "@/components/ui/button";

type ChoiceGroupEditorProps = {
  group: ChoiceGroup;
  /** 이 선택군이 속한 학기(1 또는 2) */
  semester: number;
  /** 학기 내 선택군 순번(표시용) */
  groupNumber: number;
  labelPrefix: string;
  onChange: (group: ChoiceGroup) => void;
  /** 이 선택군을 같은 학기 지정과목으로 합치기(집중이수 오인 교정) */
  onConvertToRequired: () => void;
  /** 선택군 삭제 */
  onRemove: () => void;
};

// 옵션 수/입력이 바뀔 때 choose/min/maxChoose 불변식(정수·범위)을 보정한다.
// 범위 모드(maxChoose 존재)면 choose는 항상 minChoose와 같게 맞춘다.
function clampGroup(group: ChoiceGroup): ChoiceGroup {
  const length = Math.max(group.subjects.length, 1);

  if (group.maxChoose !== undefined) {
    let min = Math.floor(group.minChoose ?? group.choose ?? 1);
    let max = Math.floor(group.maxChoose);
    min = Math.min(Math.max(Number.isFinite(min) ? min : 1, 1), length);
    max = Math.min(Math.max(Number.isFinite(max) ? max : min, min), length);
    return { ...group, minChoose: min, maxChoose: max, choose: min };
  }

  const chooseInt = Math.floor(group.choose);
  const choose = Math.min(Math.max(Number.isFinite(chooseInt) ? chooseInt : 1, 1), length);
  return { ...group, choose, minChoose: undefined, maxChoose: undefined };
}

export function ChoiceGroupEditor({
  group,
  semester,
  groupNumber,
  labelPrefix,
  onChange,
  onConvertToRequired,
  onRemove,
}: ChoiceGroupEditorProps) {
  const groupId = labelPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");

  const rangeOn = group.maxChoose !== undefined;
  const minChoose = group.minChoose ?? group.choose;
  const maxChoose = group.maxChoose ?? group.choose;
  const chooseLabel = rangeOn
    ? minChoose === maxChoose
      ? `택 ${minChoose}`
      : `택 ${minChoose}~${maxChoose}`
    : `택 ${group.choose}`;
  // 같은 선택군 과목은 학점이 동일하므로 그룹 단위로 관리한다.
  const creditValue = group.creditsEach ?? group.subjects[0]?.credits ?? 1;

  function updateSubject(subjectIndex: number, subject: CurriculumSubject) {
    onChange({
      ...group,
      subjects: group.subjects.map((currentSubject, index) =>
        index === subjectIndex ? subject : currentSubject,
      ),
    });
  }

  // 그룹 학점 변경 → creditsEach + 모든 옵션 학점을 함께 맞춰 합계·검증을 일관되게 유지.
  function setCredit(next: number) {
    if (!Number.isFinite(next) || next <= 0) return;
    onChange({
      ...group,
      creditsEach: next,
      subjects: group.subjects.map((subject) => ({ ...subject, credits: next })),
    });
  }

  function addOption(input: { name: string; credits: number }) {
    const credits = group.creditsEach ?? group.subjects[0]?.credits ?? input.credits;
    onChange({
      ...group,
      subjects: [...group.subjects, { name: input.name, credits }],
    });
  }

  function removeOption(subjectIndex: number) {
    const subjects = group.subjects.filter((_, index) => index !== subjectIndex);
    onChange(clampGroup({ ...group, subjects }));
  }

  function toggleRange(on: boolean) {
    if (on) {
      const min = group.choose;
      const max = Math.min(group.choose + 1, group.subjects.length);
      onChange(clampGroup({ ...group, minChoose: min, maxChoose: max, choose: min }));
    } else {
      onChange(clampGroup({ ...group, minChoose: undefined, maxChoose: undefined }));
    }
  }

  const fieldClass =
    "rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm text-center outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <section className="overflow-hidden rounded-xl border-2 border-[var(--primary)]/50 bg-[var(--secondary)]/40 shadow-sm ring-1 ring-[var(--primary)]/10">
      {/* 헤더 바 — 선택군임을 강하게 구분 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--primary)]/15 bg-[var(--secondary)] px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)] text-white">
          <Layers className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-bold text-[var(--primary)]">선택 그룹 {groupNumber}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--primary)] ring-1 ring-[var(--primary)]/20">
          {chooseLabel}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          과목당 {creditValue}학점
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onConvertToRequired}
            className="text-amber-700 hover:bg-amber-100/60"
            title="집중이수를 잘못 묶었을 때: 이 선택군의 과목들을 같은 학기 지정(필수) 과목으로 옮깁니다."
          >
            <Merge className="h-3.5 w-3.5" />
            지정과목으로 합치기
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
            선택군 삭제
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <label htmlFor={`${groupId}-label`} className="block text-xs font-semibold text-slate-600">
            선택 그룹명
          </label>
          <input
            id={`${groupId}-label`}
            type="text"
            value={group.label}
            onChange={(event) => onChange({ ...group, label: event.target.value })}
            placeholder="예: 제2외국어, 과학 선택"
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

        {/* 과목당 학점 + 선택 수(택N/범위) — 우측 정렬 */}
        <div className="flex flex-wrap items-end justify-end gap-x-5 gap-y-2">
          <div className="space-y-1">
            <label htmlFor={`${groupId}-credits`} className="block text-xs font-semibold text-slate-600">
              과목당 학점
            </label>
            <input
              id={`${groupId}-credits`}
              type="number"
              min="0.5"
              step="0.5"
              value={creditValue}
              onChange={(event) => setCredit(Number(event.target.value))}
              aria-label={`${group.label || "선택 그룹"} 과목당 학점`}
              className={`w-20 ${fieldClass}`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${groupId}-choose`} className="text-xs font-semibold text-slate-600">
                선택 수
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-slate-500">
                <input
                  type="checkbox"
                  checked={rangeOn}
                  onChange={(event) => toggleRange(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--primary)]"
                />
                범위로
              </label>
            </div>
            {rangeOn ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max={maxChoose}
                  step="1"
                  value={minChoose}
                  onChange={(event) =>
                    onChange(clampGroup({ ...group, minChoose: Number(event.target.value) }))
                  }
                  aria-label="최소 선택 수"
                  className={`w-16 ${fieldClass}`}
                />
                <span className="text-sm text-slate-400">~</span>
                <input
                  type="number"
                  min={minChoose}
                  max={group.subjects.length}
                  step="1"
                  value={maxChoose}
                  onChange={(event) =>
                    onChange(clampGroup({ ...group, maxChoose: Number(event.target.value) }))
                  }
                  aria-label="최대 선택 수"
                  className={`w-16 ${fieldClass}`}
                />
                <span className="text-[11px] text-slate-400">개 선택</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  id={`${groupId}-choose`}
                  type="number"
                  min="1"
                  max={group.subjects.length}
                  step="1"
                  value={group.choose}
                  onChange={(event) =>
                    onChange(clampGroup({ ...group, choose: Number(event.target.value) }))
                  }
                  aria-label={`${group.label || "선택 그룹"} 선택 수`}
                  className={`w-16 ${fieldClass}`}
                />
                <span className="text-[11px] text-slate-400">개 선택</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {group.subjects.map((subject, subjectIndex) => (
            <SubjectRow
              key={`${group.id}-${subjectIndex}`}
              subject={subject}
              semester={semester}
              labelPrefix={`${labelPrefix}-subject-${subjectIndex}`}
              onChange={(updatedSubject) => updateSubject(subjectIndex, updatedSubject)}
              onDelete={() => removeOption(subjectIndex)}
              canDelete={group.subjects.length > 1}
              hideCredits
            />
          ))}
          <AddSubjectControl onAdd={addOption} label="이 그룹에 과목 추가" />
        </div>
      </div>
    </section>
  );
}
