"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceGroupEditor } from "@/components/curriculum/ChoiceGroupEditor";
import { SubjectEditor } from "@/components/curriculum/SubjectEditor";
import {
  createEmptyChoiceGroup,
  createEmptySubject,
} from "@/lib/curriculum/factory";
import { expandSubjectBySplit } from "@/lib/curriculum/split-subjects";
import type {
  ChoiceGroup,
  CurriculumSemester,
  CurriculumSubject,
  SchoolCurriculum,
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

  function updateCurriculum(mutator: (draft: SchoolCurriculum) => void) {
    setCurriculum((currentCurriculum) => {
      const nextCurriculum = structuredClone(currentCurriculum);
      mutator(nextCurriculum);
      return nextCurriculum;
    });
  }

  function updateRequiredSubject(
    cohortIndex: number,
    gradeIndex: number,
    semesterIndex: number,
    subjectIndex: number,
    subject: CurriculumSubject,
  ) {
    updateCurriculum((draft) => {
      draft.cohorts[cohortIndex].grades[gradeIndex].semesters[
        semesterIndex
      ].requiredSubjects[subjectIndex] = subject;
    });
  }

  function updateChoiceGroup(
    cohortIndex: number,
    gradeIndex: number,
    semesterIndex: number,
    groupIndex: number,
    group: ChoiceGroup,
  ) {
    updateCurriculum((draft) => {
      draft.cohorts[cohortIndex].grades[gradeIndex].semesters[
        semesterIndex
      ].choiceGroups[groupIndex] = group;
    });
  }

  function semesterOf(
    draft: SchoolCurriculum,
    cohortIndex: number,
    gradeIndex: number,
    semesterIndex: number,
  ): CurriculumSemester {
    return draft.cohorts[cohortIndex].grades[gradeIndex].semesters[semesterIndex];
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

  function splitRequiredSubject(c: number, g: number, s: number, subjectIndex: number) {
    updateCurriculum((draft) => {
      const required = semesterOf(draft, c, g, s).requiredSubjects;
      const expanded = expandSubjectBySplit(required[subjectIndex]);
      required.splice(subjectIndex, 1, ...expanded);
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
        semester.requiredSubjects.push({
          ...subject,
          // creditsEach만 있던 그룹은 옵션 credits가 비어있을 수 있어 보충(positive 보장).
          credits: subject.credits ?? group.creditsEach ?? 1,
        });
      });
      semester.choiceGroups.splice(groupIndex, 1);
    });
  }

  async function saveDraft(successMessage?: string) {
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

  return (
    <form className="mt-10 space-y-8" onSubmit={(event) => event.preventDefault()}>
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

      {curriculum.cohorts.map((cohort, cohortIndex) => (
        <section
          key={`${cohort.entranceYear}-${cohortIndex}`}
          className="space-y-6 border-t border-slate-300 pt-8"
        >
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-slate-950">
              {cohort.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">입학 연도: {cohort.entranceYear}</p>
          </div>

          {cohort.grades.map((grade, gradeIndex) => (
            <section key={`${grade.grade}-${gradeIndex}`} className="space-y-5">
              <h3 className="text-xl font-semibold text-slate-900">{grade.grade}학년</h3>

              {grade.semesters.map((semester, semesterIndex) => (
                <section
                  key={`${semester.semester}-${semesterIndex}`}
                  className="space-y-5 rounded-md border border-slate-300 bg-white p-5"
                >
                  <h4 className="text-lg font-semibold text-slate-900">
                    {semester.semester}학기
                  </h4>

                  <div className="space-y-3">
                    <h5 className="text-base font-semibold text-slate-800">필수 과목</h5>
                    {/* key는 인덱스 기반 — 과목 객체에 id가 없어 controlled로 동작 */}
                    {semester.requiredSubjects.map((subject, subjectIndex) => (
                      <div
                        key={`required-${subjectIndex}`}
                        className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
                      >
                        <SubjectEditor
                          subject={subject}
                          labelPrefix={`cohort-${cohortIndex}-grade-${gradeIndex}-semester-${semesterIndex}-required-${subjectIndex}`}
                          onChange={(updatedSubject) =>
                            updateRequiredSubject(
                              cohortIndex,
                              gradeIndex,
                              semesterIndex,
                              subjectIndex,
                              updatedSubject,
                            )
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              splitRequiredSubject(cohortIndex, gradeIndex, semesterIndex, subjectIndex)
                            }
                            className={secondaryButtonClass}
                          >
                            과목명 분리
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeRequiredSubject(cohortIndex, gradeIndex, semesterIndex, subjectIndex)
                            }
                            className={secondaryButtonClass}
                            aria-label={`${subject.name || "과목"} 삭제`}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRequiredSubject(cohortIndex, gradeIndex, semesterIndex)}
                      className={secondaryButtonClass}
                    >
                      + 과목 추가
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-base font-semibold text-slate-800">선택 그룹</h5>
                    {semester.choiceGroups.map((group, groupIndex) => (
                      <div key={group.id} className="space-y-2">
                        <div className="flex justify-end gap-2">
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
                          labelPrefix={`cohort-${cohortIndex}-grade-${gradeIndex}-semester-${semesterIndex}-group-${groupIndex}`}
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
              ))}
            </section>
          ))}
        </section>
      ))}

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

      <div className="flex flex-wrap gap-3">
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
