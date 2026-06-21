"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceGroupEditor } from "@/components/curriculum/ChoiceGroupEditor";
import { SubjectRow } from "@/components/curriculum/SubjectRow";
import {
  createEmptyChoiceGroup,
  createEmptySubject,
} from "@/lib/curriculum/factory";
import { getReviewFlag } from "@/lib/curriculum/review-flags";
import {
  schoolCurriculumSchema,
  type ChoiceGroup,
  type CurriculumSemester,
  type CurriculumSubject,
  type SchoolCurriculum,
} from "@/lib/curriculum/schema";

type CurriculumReviewFormProps = {
  draftId: string;
  editToken: string;
  initialCurriculum: SchoolCurriculum;
};

type ApiPayload = {
  error?: string;
  manageUrl?: string;
};

const fallbackSaveError = "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const fallbackPublishError = "게시 중 문제가 발생했습니다. 저장 내용을 확인한 뒤 다시 시도해 주세요.";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

async function readApiPayload(response: Response): Promise<ApiPayload> {
  try {
    const payload: unknown = await response.json();

    if (payload && typeof payload === "object") {
      return payload as ApiPayload;
    }
  } catch {
    return {};
  }

  return {};
}

export function CurriculumReviewForm({
  draftId,
  editToken,
  initialCurriculum,
}: CurriculumReviewFormProps) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<SchoolCurriculum>(initialCurriculum);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // cohortIndex별 활성 학년(grade 숫자)
  const [activeGrades, setActiveGrades] = useState<Record<number, number>>({});

  function activeGradeFor(cohortIndex: number, fallbackGrade: number) {
    return activeGrades[cohortIndex] ?? fallbackGrade;
  }

  function setActiveGrade(cohortIndex: number, grade: number) {
    setActiveGrades((prev) => ({ ...prev, [cohortIndex]: grade }));
  }

  function updateCurriculum(mutator: (draft: SchoolCurriculum) => void) {
    setCurriculum((currentCurriculum) => {
      const nextCurriculum = structuredClone(currentCurriculum);
      mutator(nextCurriculum);
      return nextCurriculum;
    });
  }

  function semesterOf(
    draft: SchoolCurriculum,
    c: number,
    g: number,
    s: number,
  ): CurriculumSemester {
    return draft.cohorts[c].grades[g].semesters[s];
  }

  // 전체에서 '확인 필요' 항목 개수
  function countReviewFlags(): number {
    let n = 0;
    for (const cohort of curriculum.cohorts)
      for (const grade of cohort.grades)
        for (const semester of grade.semesters) {
          semester.requiredSubjects.forEach((s) => {
            if (getReviewFlag(s)) n += 1;
          });
          semester.choiceGroups.forEach((gr) =>
            gr.subjects.forEach((s) => {
              if (getReviewFlag(s)) n += 1;
            }),
          );
        }
    return n;
  }

  // 학기 예상 학점 합계 (지정 + 선택군 택N×과목당학점)
  function semesterCreditSum(semester: CurriculumSemester): number {
    const designated = semester.requiredSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);
    const choice = semester.choiceGroups.reduce((sum, g) => {
      const each = g.creditsEach ?? g.subjects[0]?.credits ?? 0;
      return sum + g.choose * each;
    }, 0);
    return designated + choice;
  }

  function updateRequiredSubject(
    c: number,
    g: number,
    s: number,
    subjectIndex: number,
    subject: CurriculumSubject,
  ) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).requiredSubjects[subjectIndex] = subject;
    });
  }

  function replaceRequiredSubject(
    c: number,
    g: number,
    s: number,
    subjectIndex: number,
    replacements: CurriculumSubject[],
  ) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).requiredSubjects.splice(subjectIndex, 1, ...replacements);
    });
  }

  function addRequiredSubject(c: number, g: number, s: number) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).requiredSubjects.push(createEmptySubject());
    });
  }

  function removeRequiredSubject(c: number, g: number, s: number, subjectIndex: number) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).requiredSubjects.splice(subjectIndex, 1);
    });
  }

  function updateChoiceGroup(
    c: number,
    g: number,
    s: number,
    groupIndex: number,
    group: ChoiceGroup,
  ) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).choiceGroups[groupIndex] = group;
    });
  }

  function addChoiceGroup(c: number, g: number, s: number) {
    updateCurriculum((draft) => {
      const semester = semesterOf(draft, c, g, s);
      semester.choiceGroups.push(createEmptyChoiceGroup(semester.choiceGroups));
    });
  }

  function removeChoiceGroup(c: number, g: number, s: number, groupIndex: number) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).choiceGroups.splice(groupIndex, 1);
    });
  }

  // 집중이수(예: 정보↔한문 오인) 교정: 선택군 옵션을 같은 학기 지정과목으로 옮기고 그룹 제거.
  function convertGroupToRequired(c: number, g: number, s: number, groupIndex: number) {
    updateCurriculum((draft) => {
      const semester = semesterOf(draft, c, g, s);
      const group = semester.choiceGroups[groupIndex];
      group.subjects.forEach((subject) => {
        // 빈 과목명 옵션은 전이 제외 (name min1 위반 방지)
        if (subject.name.trim().length === 0) return;
        // credits=0/NaN을 nullish(??)가 통과시키므로 양수 가드로 보충 (positive 위반 방지)
        const credits =
          subject.credits > 0
            ? subject.credits
            : group.creditsEach && group.creditsEach > 0
              ? group.creditsEach
              : 1;
        semester.requiredSubjects.push({ ...subject, credits });
      });
      semester.choiceGroups.splice(groupIndex, 1);
    });
  }

  // 저장/게시 전 클라이언트 검증 — raw 400 대신 어디가 문제인지 한글로 안내.
  function validateBeforeSave(): string | null {
    const result = schoolCurriculumSchema.safeParse(curriculum);
    if (result.success) return null;

    const hasEmptyName = result.error.issues.some((issue) =>
      issue.path.includes("name"),
    );
    const hasBadCredits = result.error.issues.some((issue) =>
      issue.path.includes("credits"),
    );
    const hasBadChoose = result.error.issues.some(
      (issue) => issue.path.includes("choose") || issue.path.includes("subjects"),
    );

    if (hasEmptyName) {
      return "비어 있는 과목명 또는 선택 그룹명이 있습니다. 모두 입력한 뒤 다시 시도해 주세요.";
    }
    if (hasBadCredits) {
      return "학점은 0보다 큰 숫자여야 합니다. 학점이 비어 있거나 0인 과목을 확인해 주세요.";
    }
    if (hasBadChoose) {
      return "선택 그룹의 선택 수나 과목 구성을 확인해 주세요. (선택 수는 1 이상, 과목 수 이하)";
    }
    return "교육과정 구조에 올바르지 않은 값이 있습니다. 입력 내용을 확인해 주세요.";
  }

  async function saveDraft(successMessage?: string) {
    const validationError = validateBeforeSave();
    if (validationError) {
      setMessageType("error");
      setMessage(validationError);
      return false;
    }

    try {
      const response = await fetch(`/api/curricula/${draftId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-edit-token": editToken,
        },
        body: JSON.stringify({ curriculum }),
      });
      const payload = await readApiPayload(response);

      if (!response.ok) {
        setMessageType("error");
        setMessage(payload.error || fallbackSaveError);
        return false;
      }

      if (successMessage) {
        setMessageType("success");
        setMessage(successMessage);
      }

      return true;
    } catch {
      setMessageType("error");
      setMessage(fallbackSaveError);
      return false;
    }
  }

  async function save() {
    if (isSaving || isPublishing) {
      return;
    }

    setMessage("");
    setIsSaving(true);

    try {
      await saveDraft("교육과정 초안을 저장했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function publish() {
    if (isSaving || isPublishing) {
      return;
    }

    setMessage("");
    setIsPublishing(true);

    try {
      const didSave = await saveDraft();

      if (!didSave) {
        return;
      }

      const response = await fetch(`/api/curricula/${draftId}/publish`, {
        method: "POST",
        headers: {
          "x-edit-token": editToken,
        },
      });
      const payload = await readApiPayload(response);

      if (!response.ok || !payload.manageUrl) {
        setMessageType("error");
        setMessage(payload.error || fallbackPublishError);
        return;
      }

      router.push(payload.manageUrl);
    } catch {
      setMessageType("error");
      setMessage(fallbackPublishError);
    } finally {
      setIsPublishing(false);
    }
  }

  function renderSemesterPanel(
    cohortIndex: number,
    gradeIndex: number,
    semester: CurriculumSemester,
    semesterIndex: number,
  ) {
    const labelBase = `cohort-${cohortIndex}-grade-${gradeIndex}-semester-${semesterIndex}`;
    return (
      <section
        key={`${semester.semester}-${semesterIndex}`}
        className="space-y-4 rounded-lg border border-slate-300 bg-white p-4"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900">{semester.semester}학기</h4>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            학점 합계 약 {semesterCreditSum(semester)}학점
          </span>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-slate-700">지정 과목</h5>
          {semester.requiredSubjects.length === 0 ? (
            <p className="text-xs text-slate-400">지정 과목이 없습니다.</p>
          ) : null}
          {semester.requiredSubjects.map((subject, subjectIndex) => (
            <SubjectRow
              key={`required-${subjectIndex}`}
              subject={subject}
              semester={semester.semester}
              labelPrefix={`${labelBase}-required-${subjectIndex}`}
              onChange={(updated) =>
                updateRequiredSubject(cohortIndex, gradeIndex, semesterIndex, subjectIndex, updated)
              }
              onDelete={() =>
                removeRequiredSubject(cohortIndex, gradeIndex, semesterIndex, subjectIndex)
              }
              onReplace={(replacements) =>
                replaceRequiredSubject(
                  cohortIndex,
                  gradeIndex,
                  semesterIndex,
                  subjectIndex,
                  replacements,
                )
              }
            />
          ))}
          <button
            type="button"
            onClick={() => addRequiredSubject(cohortIndex, gradeIndex, semesterIndex)}
            className={secondaryButtonClass}
          >
            + 지정 과목 추가
          </button>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-slate-700">선택 그룹</h5>
          {semester.choiceGroups.length === 0 ? (
            <p className="text-xs text-slate-400">선택 그룹이 없습니다.</p>
          ) : null}
          {semester.choiceGroups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-2">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    convertGroupToRequired(cohortIndex, gradeIndex, semesterIndex, groupIndex)
                  }
                  className={secondaryButtonClass}
                  title="이 선택군을 지정(필수) 과목으로 옮깁니다. 집중이수 교정에 사용하세요."
                >
                  지정과목으로 전환
                </button>
                <button
                  type="button"
                  onClick={() =>
                    removeChoiceGroup(cohortIndex, gradeIndex, semesterIndex, groupIndex)
                  }
                  className={secondaryButtonClass}
                >
                  선택군 삭제
                </button>
              </div>
              <ChoiceGroupEditor
                group={group}
                semester={semester.semester}
                labelPrefix={`${labelBase}-group-${groupIndex}`}
                onChange={(updatedGroup) =>
                  updateChoiceGroup(
                    cohortIndex,
                    gradeIndex,
                    semesterIndex,
                    groupIndex,
                    updatedGroup,
                  )
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => addChoiceGroup(cohortIndex, gradeIndex, semesterIndex)}
            className={secondaryButtonClass}
          >
            + 선택군 추가
          </button>
        </div>
      </section>
    );
  }

  const reviewCount = countReviewFlags();

  return (
    <form className="mt-10 space-y-8" onSubmit={(event) => event.preventDefault()}>
      {reviewCount > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ 확인이 필요한 항목이 {reviewCount}개 있어요
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
            AI가 편제표를 자동으로 읽었지만 완벽하지 않을 수 있어요. 아래에서
            <span className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-medium">⚠️ 노란색 표시</span>
            가 붙은 과목을 원본 편제표와 비교해 확인해 주세요. 틀렸으면 과목명을 직접
            고치거나, <b>과목 나누기</b>(여러 과목이 붙었을 때)·<b>집중이수 배정</b>(↔ 표시)·
            <b>삭제</b> 버튼으로 바로잡을 수 있어요.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="school-name" className="block text-sm font-semibold text-slate-800">
          학교명
        </label>
        <input
          id="school-name"
          type="text"
          value={curriculum.schoolName}
          onChange={(event) =>
            updateCurriculum((draft) => {
              draft.schoolName = event.target.value;
            })
          }
          className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm"
        />
      </div>

      {curriculum.cohorts.map((cohort, cohortIndex) => {
        const fallbackGrade = cohort.grades[0]?.grade ?? 1;
        const active = activeGradeFor(cohortIndex, fallbackGrade);
        const activeGradeIndex = Math.max(
          0,
          cohort.grades.findIndex((grade) => grade.grade === active),
        );
        const activeGrade = cohort.grades[activeGradeIndex];

        return (
          <section
            key={`${cohort.entranceYear}-${cohortIndex}`}
            className="space-y-5 border-t border-slate-300 pt-8"
          >
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-slate-950">
                {cohort.label}
              </h2>
              <p className="mt-1 text-sm text-slate-600">입학 연도: {cohort.entranceYear}</p>
            </div>

            {/* 학년 탭 */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200">
              {cohort.grades.map((grade) => {
                const isActive = grade.grade === active;
                return (
                  <button
                    key={grade.grade}
                    type="button"
                    onClick={() => setActiveGrade(cohortIndex, grade.grade)}
                    className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {grade.grade}학년
                  </button>
                );
              })}
            </div>

            {/* 활성 학년의 학기 2열 */}
            {activeGrade ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {activeGrade.semesters.map((semester, semesterIndex) =>
                  renderSemesterPanel(cohortIndex, activeGradeIndex, semester, semesterIndex),
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {message ? (
        <p
          role="alert"
          aria-live="polite"
          className={`rounded-md border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-slate-200 bg-[var(--background)] py-4">
        <button
          type="button"
          onClick={save}
          disabled={isSaving || isPublishing}
          aria-busy={isSaving}
          className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "저장 중" : "저장"}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={isSaving || isPublishing}
          aria-busy={isPublishing}
          className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isPublishing ? "게시 중" : "게시"}
        </button>
      </div>
    </form>
  );
}
