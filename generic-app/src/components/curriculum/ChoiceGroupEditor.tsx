import type { ChoiceGroup, CurriculumSubject } from "@/lib/curriculum/schema";
import { SubjectEditor } from "@/components/curriculum/SubjectEditor";

type ChoiceGroupEditorProps = {
  group: ChoiceGroup;
  labelPrefix: string;
  onChange: (group: ChoiceGroup) => void;
};

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
                choose: Number(event.target.value),
              })
            }
            aria-label={`${group.label || "선택 그룹"} 선택 수`}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        {group.subjects.map((subject, subjectIndex) => (
          <SubjectEditor
            key={`${group.id}-${subjectIndex}`}
            subject={subject}
            labelPrefix={`${labelPrefix}-subject-${subjectIndex}`}
            onChange={(updatedSubject) => updateSubject(subjectIndex, updatedSubject)}
          />
        ))}
      </div>
    </section>
  );
}
