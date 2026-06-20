import type { ChoiceGroup, CurriculumSubject } from "@/lib/curriculum/schema";
import { SubjectEditor } from "@/components/curriculum/SubjectEditor";
import { createEmptySubject } from "@/lib/curriculum/factory";
import { expandSubjectBySplit } from "@/lib/curriculum/split-subjects";

type ChoiceGroupEditorProps = {
  group: ChoiceGroup;
  labelPrefix: string;
  onChange: (group: ChoiceGroup) => void;
};

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

export function ChoiceGroupEditor({ group, labelPrefix, onChange }: ChoiceGroupEditorProps) {
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
    const length = subjects.length;
    // subjects.length가 줄면 choose/min/maxChoose 불변식을 함께 보정한다.
    const choose = Math.min(group.choose, length);
    const maxChoose =
      group.maxChoose !== undefined ? Math.min(group.maxChoose, length) : undefined;
    const minChoose =
      group.minChoose !== undefined ? Math.min(group.minChoose, choose) : undefined;
    onChange({ ...group, subjects, choose, maxChoose, minChoose });
  }

  function splitOption(subjectIndex: number) {
    const expanded = expandSubjectBySplit(group.subjects[subjectIndex]);
    const subjects = [...group.subjects];
    subjects.splice(subjectIndex, 1, ...expanded);
    onChange({ ...group, subjects });
  }

  return (
    <section className="space-y-4 rounded-md border border-slate-300 bg-slate-50 p-4">
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
            onChange={(event) =>
              onChange({
                ...group,
                // 옵션 수를 넘는 choose는 superRefine 위반이므로 clamp.
                choose: Math.min(Number(event.target.value), group.subjects.length),
              })
            }
            aria-label={`${group.label || "선택 그룹"} 선택 수`}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        {group.subjects.map((subject, subjectIndex) => (
          <div
            key={`${group.id}-${subjectIndex}`}
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <SubjectEditor
              subject={subject}
              labelPrefix={`${labelPrefix}-subject-${subjectIndex}`}
              onChange={(updatedSubject) => updateSubject(subjectIndex, updatedSubject)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => splitOption(subjectIndex)}
                className={secondaryButtonClass}
              >
                과목명 분리
              </button>
              <button
                type="button"
                onClick={() => removeOption(subjectIndex)}
                disabled={group.subjects.length <= 1}
                className={secondaryButtonClass}
                aria-label={`${subject.name || "과목"} 옵션 삭제`}
              >
                옵션 삭제
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addOption} className={secondaryButtonClass}>
          + 옵션 추가
        </button>
      </div>
    </section>
  );
}
