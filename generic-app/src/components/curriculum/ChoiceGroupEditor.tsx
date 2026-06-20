import type { ChoiceGroup, CurriculumSubject } from "@/lib/curriculum/schema";
import { SubjectRow } from "@/components/curriculum/SubjectRow";
import { createEmptySubject } from "@/lib/curriculum/factory";

type ChoiceGroupEditorProps = {
  group: ChoiceGroup;
  /** 이 선택군이 속한 학기(1 또는 2) */
  semester: number;
  labelPrefix: string;
  onChange: (group: ChoiceGroup) => void;
};

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

// 옵션 수/입력이 바뀔 때 choose/min/maxChoose 불변식(정수·범위)을 보정한다.
function clampGroup(group: ChoiceGroup): ChoiceGroup {
  const length = group.subjects.length;
  const chooseInt = Math.floor(group.choose);
  const choose = Math.min(
    Math.max(Number.isFinite(chooseInt) ? chooseInt : 1, 1),
    Math.max(length, 1),
  );
  const maxChoose =
    group.maxChoose !== undefined
      ? Math.min(Math.floor(group.maxChoose), length)
      : undefined;
  const minChoose =
    group.minChoose !== undefined
      ? Math.min(Math.floor(group.minChoose), choose)
      : undefined;
  return { ...group, choose, maxChoose, minChoose };
}

export function ChoiceGroupEditor({
  group,
  semester,
  labelPrefix,
  onChange,
}: ChoiceGroupEditorProps) {
  const groupId = labelPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");

  function updateSubject(subjectIndex: number, subject: CurriculumSubject) {
    onChange({
      ...group,
      subjects: group.subjects.map((currentSubject, index) =>
        index === subjectIndex ? subject : currentSubject,
      ),
    });
  }

  function addOption() {
    onChange({ ...group, subjects: [...group.subjects, createEmptySubject()] });
  }

  function removeOption(subjectIndex: number) {
    const subjects = group.subjects.filter((_, index) => index !== subjectIndex);
    onChange(clampGroup({ ...group, subjects }));
  }

  function replaceOption(subjectIndex: number, replacements: CurriculumSubject[]) {
    const subjects = [...group.subjects];
    subjects.splice(subjectIndex, 1, ...replacements);
    onChange(clampGroup({ ...group, subjects }));
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-300 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1">
          <label
            htmlFor={`${groupId}-label`}
            className="block text-sm font-semibold text-slate-800"
          >
            선택 그룹명
          </label>
          <input
            id={`${groupId}-label`}
            type="text"
            value={group.label}
            onChange={(event) => onChange({ ...group, label: event.target.value })}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`${groupId}-choose`}
            className="block text-sm font-semibold text-slate-800"
          >
            선택 수
          </label>
          <input
            id={`${groupId}-choose`}
            type="number"
            min="1"
            max={group.subjects.length}
            step="1"
            value={group.choose}
            onChange={(event) => {
              const raw = Number(event.target.value);
              const next = Number.isFinite(raw) ? raw : group.choose;
              onChange(clampGroup({ ...group, choose: next }));
            }}
            aria-label={`${group.label || "선택 그룹"} 선택 수`}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        {group.subjects.map((subject, subjectIndex) => (
          <div key={`${group.id}-${subjectIndex}`} className="relative">
            <SubjectRow
              subject={subject}
              semester={semester}
              labelPrefix={`${labelPrefix}-subject-${subjectIndex}`}
              onChange={(updatedSubject) => updateSubject(subjectIndex, updatedSubject)}
              onDelete={() => removeOption(subjectIndex)}
              canDelete={group.subjects.length > 1}
              onReplace={(replacements) => replaceOption(subjectIndex, replacements)}
            />
          </div>
        ))}
        <button type="button" onClick={addOption} className={secondaryButtonClass}>
          + 옵션 추가
        </button>
      </div>
    </section>
  );
}
