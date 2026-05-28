import {
  type CurriculumSubject,
  subjectCategorySchema,
  type SubjectCategory,
} from "@/lib/curriculum/schema";

type SubjectEditorProps = {
  subject: CurriculumSubject;
  labelPrefix: string;
  onChange: (subject: CurriculumSubject) => void;
};

const categoryOptions = subjectCategorySchema.options;

export function SubjectEditor({ subject, labelPrefix, onChange }: SubjectEditorProps) {
  const subjectId = labelPrefix.replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 sm:grid-cols-[1fr_10rem_7rem_11rem]">
      <div className="space-y-1">
        <label
          htmlFor={`${subjectId}-name`}
          className="block text-sm font-semibold text-slate-800"
        >
          과목명
        </label>
        <input
          id={`${subjectId}-name`}
          type="text"
          value={subject.name}
          onChange={(event) => onChange({ ...subject, name: event.target.value })}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${subjectId}-area`}
          className="block text-sm font-semibold text-slate-800"
        >
          영역
        </label>
        <input
          id={`${subjectId}-area`}
          type="text"
          value={subject.area ?? ""}
          onChange={(event) =>
            onChange({
              ...subject,
              area: event.target.value.trim() ? event.target.value : undefined,
            })
          }
          aria-label={`${subject.name || "과목"} 영역`}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${subjectId}-credits`}
          className="block text-sm font-semibold text-slate-800"
        >
          학점
        </label>
        <input
          id={`${subjectId}-credits`}
          type="number"
          min="0.5"
          step="0.5"
          value={subject.credits}
          onChange={(event) =>
            onChange({
              ...subject,
              credits: Number(event.target.value),
            })
          }
          aria-label={`${subject.name || "과목"} 학점`}
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${subjectId}-category`}
          className="block text-sm font-semibold text-slate-800"
        >
          분류
        </label>
        <select
          id={`${subjectId}-category`}
          value={subject.category ?? ""}
          onChange={(event) =>
            onChange({
              ...subject,
              category: event.target.value ? (event.target.value as SubjectCategory) : undefined,
            })
          }
          aria-label={`${subject.name || "과목"} 분류`}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="">분류 없음</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
