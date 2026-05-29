"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  Layers3,
  Search,
} from "lucide-react";
import type {
  ChoiceGroup,
  CurriculumCohort,
  CurriculumSemester,
  CurriculumSubject,
  SchoolCurriculum,
} from "@/lib/curriculum/schema";

type StudentCurriculumAssistantProps = {
  curriculum: SchoolCurriculum;
};

type SelectionState = Record<string, string[]>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function subjectKey(subject: CurriculumSubject) {
  return `${subject.name}-${subject.credits}-${subject.area ?? ""}`;
}

function groupKey(cohort: CurriculumCohort, grade: number, semester: number, group: ChoiceGroup) {
  return `${cohort.entranceYear}:${grade}:${semester}:${group.id}`;
}

function countRequiredSubjects(cohort: CurriculumCohort) {
  return cohort.grades.reduce(
    (total, grade) =>
      total +
      grade.semesters.reduce((semesterTotal, semester) => {
        return semesterTotal + semester.requiredSubjects.length;
      }, 0),
    0,
  );
}

function countChoiceSubjects(cohort: CurriculumCohort) {
  return cohort.grades.reduce(
    (total, grade) =>
      total +
      grade.semesters.reduce((semesterTotal, semester) => {
        return (
          semesterTotal +
          semester.choiceGroups.reduce((groupTotal, group) => groupTotal + group.subjects.length, 0)
        );
      }, 0),
    0,
  );
}

function selectedCredits(
  selection: SelectionState,
  cohort: CurriculumCohort,
) {
  const selected = Object.values(selection).flat();

  return cohort.grades.reduce((total, grade) => {
    return (
      total +
      grade.semesters.reduce((semesterTotal, semester) => {
        const requiredCredits = semester.requiredSubjects.reduce(
          (sum, subject) => sum + subject.credits,
          0,
        );
        const choiceCredits = semester.choiceGroups.reduce((sum, group) => {
          return (
            sum +
            group.subjects.reduce((subjectSum, subject) => {
              if (!selected.includes(subject.name)) {
                return subjectSum;
              }

              return subjectSum + subject.credits;
            }, 0)
          );
        }, 0);

        return semesterTotal + requiredCredits + choiceCredits;
      }, 0)
    );
  }, 0);
}

function getCompletion(selection: SelectionState, cohort: CurriculumCohort) {
  const groups = cohort.grades.flatMap((grade) =>
    grade.semesters.flatMap((semester) =>
      semester.choiceGroups.map((group) => ({
        key: groupKey(cohort, grade.grade, semester.semester, group),
        choose: group.choose,
      })),
    ),
  );

  const completed = groups.filter((group) => (selection[group.key]?.length ?? 0) >= group.choose);

  return {
    completed: completed.length,
    total: groups.length,
  };
}

function SubjectPill({ subject, required = false }: { subject: CurriculumSubject; required?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-md border px-3 py-2",
        required ? "border-slate-200 bg-slate-50" : "border-blue-100 bg-blue-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-slate-950">{subject.name}</p>
        <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600">
          {subject.credits}학점
        </span>
      </div>
      {(subject.area || subject.category) && (
        <p className="mt-1 text-xs text-slate-500">
          {[subject.area, subject.category].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function ChoiceGroupCard({
  group,
  groupId,
  selected,
  search,
  onToggle,
}: {
  group: ChoiceGroup;
  groupId: string;
  selected: string[];
  search: string;
  onToggle: (groupId: string, subject: CurriculumSubject) => void;
}) {
  const visibleSubjects = group.subjects.filter((subject) => {
    const query = search.trim();
    if (!query) return true;

    return [subject.name, subject.area, subject.category, subject.rawText]
      .filter(Boolean)
      .some((value) => value?.includes(query));
  });
  const isComplete = selected.length >= group.choose;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-950">{group.label}</h4>
          {group.notes && group.notes.length > 0 && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{group.notes[0]}</p>
          )}
        </div>
        <div
          className={cx(
            "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
          )}
        >
          {isComplete && <Check className="h-3.5 w-3.5" />}
          {selected.length}/{group.choose} 선택
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visibleSubjects.map((subject) => {
          const isSelected = selected.includes(subject.name);
          const isDisabled = !isSelected && selected.length >= group.choose;

          return (
            <button
              key={subjectKey(subject)}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(groupId, subject)}
              className={cx(
                "min-h-16 rounded-md border px-3 py-2 text-left transition",
                isSelected
                  ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-900 hover:border-blue-300 hover:bg-blue-50",
                isDisabled && "cursor-not-allowed opacity-45",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold leading-5">{subject.name}</span>
                <span
                  className={cx(
                    "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
                    isSelected ? "bg-white/15 text-white" : "bg-white text-slate-600",
                  )}
                >
                  {subject.credits}학점
                </span>
              </div>
              {(subject.area || subject.category) && (
                <span className={cx("mt-1 block text-xs", isSelected ? "text-blue-50" : "text-slate-500")}>
                  {[subject.area, subject.category].filter(Boolean).join(" · ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visibleSubjects.length === 0 && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          검색 조건에 맞는 과목이 없습니다.
        </p>
      )}
    </article>
  );
}

function SemesterSection({
  cohort,
  semester,
  grade,
  selection,
  search,
  onToggle,
}: {
  cohort: CurriculumCohort;
  semester: CurriculumSemester;
  grade: number;
  selection: SelectionState;
  search: string;
  onToggle: (groupId: string, subject: CurriculumSubject) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">
            {grade}학년 {semester.semester}학기
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            필수 {semester.requiredSubjects.length}개 · 선택 묶음 {semester.choiceGroups.length}개
          </p>
        </div>
        <BookOpen className="h-5 w-5 text-blue-600" />
      </div>

      {semester.requiredSubjects.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">필수 이수</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {semester.requiredSubjects.map((subject) => (
              <SubjectPill key={subjectKey(subject)} subject={subject} required />
            ))}
          </div>
        </div>
      )}

      {semester.choiceGroups.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">선택 과목</h4>
          {semester.choiceGroups.map((group) => {
            const id = groupKey(cohort, grade, semester.semester, group);

            return (
              <ChoiceGroupCard
                key={id}
                group={group}
                groupId={id}
                selected={selection[id] ?? []}
                search={search}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export function StudentCurriculumAssistant({ curriculum }: StudentCurriculumAssistantProps) {
  const [cohortYear, setCohortYear] = useState(curriculum.cohorts[0]?.entranceYear ?? "");
  const [activeGrade, setActiveGrade] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<SelectionState>({});

  const cohort = useMemo(() => {
    return (
      curriculum.cohorts.find((candidate) => candidate.entranceYear === cohortYear) ??
      curriculum.cohorts[0]
    );
  }, [cohortYear, curriculum.cohorts]);

  const grades = useMemo(() => {
    if (!cohort) return [];
    if (activeGrade === "all") return cohort.grades;

    return cohort.grades.filter((grade) => grade.grade === activeGrade);
  }, [activeGrade, cohort]);

  const selectedSubjectNames = useMemo(() => new Set(Object.values(selection).flat()), [selection]);
  const completion = cohort ? getCompletion(selection, cohort) : { completed: 0, total: 0 };
  const selectedCount = selectedSubjectNames.size;
  const requiredCount = cohort ? countRequiredSubjects(cohort) : 0;
  const choiceSubjectCount = cohort ? countChoiceSubjects(cohort) : 0;
  const totalCredits = cohort ? selectedCredits(selection, cohort) : 0;

  const handleToggle = (id: string, subject: CurriculumSubject) => {
    setSelection((current) => {
      const selected = current[id] ?? [];
      const isSelected = selected.includes(subject.name);

      if (isSelected) {
        return {
          ...current,
          [id]: selected.filter((name) => name !== subject.name),
        };
      }

      const group = cohort?.grades
        .flatMap((grade) =>
          grade.semesters.flatMap((semester) =>
            semester.choiceGroups.map((candidate) => ({
              id: groupKey(cohort, grade.grade, semester.semester, candidate),
              group: candidate,
            })),
          ),
        )
        .find((candidate) => candidate.id === id)?.group;

      if (!group || selected.length >= group.choose) {
        return current;
      }

      return {
        ...current,
        [id]: [...selected, subject.name],
      };
    });
  };

  if (!cohort) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950">
        <p>게시된 교육과정 데이터가 비어 있습니다.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-600">선택과목 도우미</p>
                <h1 className="text-2xl font-bold tracking-normal sm:text-4xl">
                  {curriculum.schoolName}
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              입학생 학년도와 학년을 고른 뒤 선택 묶음별로 과목을 눌러 조합해보세요. 필수 과목은
              자동으로 포함되고, 선택 조건을 채우면 오른쪽 요약에 반영됩니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-xs text-slate-500">필수</p>
              <p className="text-lg font-bold">{requiredCount}</p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-xs text-slate-500">선택 후보</p>
              <p className="text-lg font-bold">{choiceSubjectCount}</p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-xs text-slate-500">내 선택</p>
              <p className="text-lg font-bold">{selectedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr]">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">입학생 학년도</span>
                <span className="relative block">
                  <select
                    value={cohort.entranceYear}
                    onChange={(event) => {
                      setCohortYear(event.target.value);
                      setSelection({});
                    }}
                    className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {curriculum.cohorts.map((candidate) => (
                      <option key={candidate.entranceYear} value={candidate.entranceYear}>
                        {candidate.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">학년</span>
                <span className="relative block">
                  <select
                    value={activeGrade}
                    onChange={(event) => {
                      const value = event.target.value;
                      setActiveGrade(value === "all" ? "all" : Number(value));
                    }}
                    className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">전체 학년</option>
                    {cohort.grades.map((grade) => (
                      <option key={grade.grade} value={grade.grade}>
                        {grade.grade}학년
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">과목 검색</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="과목명, 영역, 구분 검색"
                    className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 pl-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </span>
              </label>
            </div>
          </section>

          {grades.map((grade) => (
            <div key={grade.grade} className="space-y-4">
              {grade.semesters.map((semester) => (
                <SemesterSection
                  key={`${grade.grade}-${semester.semester}`}
                  cohort={cohort}
                  grade={grade.grade}
                  semester={semester}
                  selection={selection}
                  search={search}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">내 선택 요약</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {completion.completed}/{completion.total}개 선택 조건 완료
                </p>
              </div>
              <Layers3 className="h-5 w-5 text-blue-600" />
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">예상 이수 학점</p>
              <p className="mt-1 text-3xl font-bold">{totalCredits}</p>
              <p className="mt-1 text-xs text-slate-500">필수 과목 + 현재 선택 과목 기준</p>
            </div>

            <div className="mt-4 space-y-2">
              {selectedSubjectNames.size > 0 ? (
                Array.from(selectedSubjectNames).map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold">{name}</span>
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  아직 선택한 과목이 없습니다.
                </p>
              )}
            </div>

            {completion.completed < completion.total && (
              <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>모든 선택 묶음을 채우지 않았습니다. 학기별 선택 조건을 확인해 주세요.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
