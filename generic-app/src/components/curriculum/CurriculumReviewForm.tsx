"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ChoiceGroupEditor } from "@/components/curriculum/ChoiceGroupEditor";
import { SubjectRow } from "@/components/curriculum/SubjectRow";
import { AddSubjectControl } from "@/components/curriculum/AddSubjectControl";
import { Button } from "@/components/ui/button";
import { createEmptyChoiceGroup } from "@/lib/curriculum/factory";
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

  // 특정 코호트의 한 학년에 남은 '확인 필요' 개수 (학년 탭 배지용)
  function flagsForGrade(cohortIndex: number, gradeNumber: number): number {
    const grade = curriculum.cohorts[cohortIndex]?.grades.find(
      (g) => g.grade === gradeNumber,
    );
    if (!grade) return 0;
    let n = 0;
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

  function addRequiredSubject(
    c: number,
    g: number,
    s: number,
    input: { name: string; credits: number },
  ) {
    updateCurriculum((draft) => {
      semesterOf(draft, c, g, s).requiredSubjects.push({
        name: input.name,
        credits: input.credits,
      });
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
    gradeNumber: number,
    semester: CurriculumSemester,
    semesterIndex: number,
  ) {
    const labelBase = `cohort-${cohortIndex}-grade-${gradeIndex}-semester-${semesterIndex}`;
    return (
      <section
        key={`${semester.semester}-${semesterIndex}`}
        className="space-y-4 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <h4 className="text-base font-bold text-slate-900">
            {gradeNumber}학년{" "}
            <span className="text-[var(--primary)]">{semester.semester}학기</span>
          </h4>
          <span className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
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
            />
          ))}
          <AddSubjectControl
            label="지정 과목 추가"
            onAdd={(input) =>
              addRequiredSubject(cohortIndex, gradeIndex, semesterIndex, input)
            }
          />
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-slate-700">선택 그룹</h5>
          {semester.choiceGroups.length === 0 ? (
            <p className="text-xs text-slate-400">선택 그룹이 없습니다.</p>
          ) : null}
          {semester.choiceGroups.map((group, groupIndex) => (
            <ChoiceGroupEditor
              key={group.id}
              group={group}
              semester={semester.semester}
              groupNumber={groupIndex + 1}
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
              onConvertToRequired={() =>
                convertGroupToRequired(cohortIndex, gradeIndex, semesterIndex, groupIndex)
              }
              onRemove={() =>
                removeChoiceGroup(cohortIndex, gradeIndex, semesterIndex, groupIndex)
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addChoiceGroup(cohortIndex, gradeIndex, semesterIndex)}
          >
            <Plus className="h-4 w-4" />
            선택군 추가
          </Button>
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
            가 붙은 과목을 원본 편제표와 비교해 확인해 주세요. 과목명을 직접 고치거나,
            <b>집중이수 배정</b>(↔ 표시)·<b>삭제</b>로 바로잡을 수 있어요. <b>미확인 과목</b>은
            표준 과목명으로 고쳐야 학생 화면의 관심분야·학과 추천에 반영돼요.
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

            {/* 학년 탭 (잔여 확인 항목 배지) */}
            <div className="flex flex-wrap gap-2 border-b border-[var(--border)]">
              {cohort.grades.map((grade) => {
                const isActive = grade.grade === active;
                const gradeFlags = flagsForGrade(cohortIndex, grade.grade);
                return (
                  <button
                    key={grade.grade}
                    type="button"
                    onClick={() => setActiveGrade(cohortIndex, grade.grade)}
                    className={`-mb-px inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {grade.grade}학년
                    {gradeFlags > 0 ? (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
                        {gradeFlags}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-500" aria-label="확인할 항목 없음">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 활성 학년: 1학기 위 · 2학기 아래 (2행) */}
            {activeGrade ? (
              <div className="space-y-4">
                {activeGrade.semesters.map((semester, semesterIndex) =>
                  renderSemesterPanel(
                    cohortIndex,
                    activeGradeIndex,
                    activeGrade.grade,
                    semester,
                    semesterIndex,
                  ),
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

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button
          type="button"
          variant="outline"
          onClick={save}
          disabled={isSaving || isPublishing}
          aria-busy={isSaving}
          className="h-11 px-5 text-sm"
        >
          {isSaving ? "저장 중…" : "저장"}
        </Button>
        <Button
          type="button"
          variant="cta"
          onClick={publish}
          disabled={isSaving || isPublishing}
          aria-busy={isPublishing}
          className="h-11 px-6 text-sm"
        >
          {isPublishing ? "게시 중…" : "학생에게 게시"}
        </Button>
        {reviewCount > 0 ? (
          <span className="text-xs text-amber-700">
            아직 확인할 항목이 {reviewCount}개 있어요
          </span>
        ) : null}
      </div>
    </form>
  );
}
