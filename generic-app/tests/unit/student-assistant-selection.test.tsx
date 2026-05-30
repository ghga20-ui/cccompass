import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSubjectAvailability,
  choiceLocations,
  getGroupRecords,
  selectableGrades,
  StudentCurriculumAssistant,
} from "@/components/student/StudentCurriculumAssistant";
import type { CurriculumCohort, SchoolCurriculum } from "@/lib/curriculum/schema";

const cohort: CurriculumCohort = {
  entranceYear: "2026",
  label: "2026학년도 입학생",
  grades: [
    {
      grade: 1,
      semesters: [
        {
          semester: 1,
          requiredSubjects: [{ name: "공통국어", credits: 4 }],
          choiceGroups: [
            {
              id: "g1-choice",
              label: "1학년 선택",
              choose: 1,
              subjects: [{ name: "1학년 선택 과목", credits: 2 }],
            },
          ],
        },
      ],
    },
    {
      grade: 2,
      semesters: [
        {
          semester: 1,
          requiredSubjects: [{ name: "문학", credits: 4 }],
          choiceGroups: [
            {
              id: "g2-choice",
              label: "2학년 선택",
              choose: 1,
              subjects: [{ name: "경제", credits: 3 }],
            },
          ],
        },
      ],
    },
    {
      grade: 3,
      semesters: [
        {
          semester: 1,
          requiredSubjects: [{ name: "독서와 작문", credits: 4 }],
          choiceGroups: [
            {
              id: "g3-choice",
              label: "3학년 선택",
              choose: 1,
              subjects: [{ name: "심화 경제", credits: 3 }],
            },
          ],
        },
      ],
    },
  ],
};

function encodeState(state: Record<string, unknown>) {
  return btoa(encodeURIComponent(JSON.stringify(state)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("student assistant selectable grade calculations", () => {
  it("uses only grade 2 and 3 curriculum for student selection flows", () => {
    expect(selectableGrades(cohort).map((grade) => grade.grade)).toEqual([2, 3]);
    expect(choiceLocations(cohort).map((location) => location.subject.name)).toEqual([
      "경제",
      "심화 경제",
    ]);
    expect(getGroupRecords(cohort).map((record) => record.group.id)).toEqual([
      "g2-choice",
      "g3-choice",
    ]);
  });

  it("does not report grade 1 subjects as available in student subject details", () => {
    expect(buildSubjectAvailability(cohort, "1학년 선택 과목")).toEqual([]);
    expect(buildSubjectAvailability(cohort, "경제")).toMatchObject([
      {
        grade: 2,
        semester: 1,
        label: "2학년 선택",
        type: "choice",
        choose: 1,
        credits: 3,
      },
    ]);
  });

  it("shows the full grade 2 and 3 roadmap even when the explorer grade filter is active", () => {
    const curriculum: SchoolCurriculum = {
      schoolName: "Test High School",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026 entrance",
          grades: [
            {
              grade: 1,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-1-hidden",
                      label: "Grade 1 Hidden",
                      choose: 1,
                      subjects: [{ name: "Grade 1 Hidden Option", credits: 2 }],
                    },
                  ],
                },
              ],
            },
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-2-choice",
                      label: "Grade 2 Choice",
                      choose: 1,
                      subjects: [{ name: "Grade 2 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
            {
              grade: 3,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-3-choice",
                      label: "Grade 3 Choice",
                      choose: 1,
                      subjects: [{ name: "Grade 3 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "roadmap", activeGrade: 2 })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("Grade 2 Option")).not.toBeNull();
    expect(screen.queryByText("Grade 3 Option")).not.toBeNull();
    expect(screen.queryByText("Grade 1 Hidden Option")).toBeNull();
  });

  it("restores the shared roadmap-selection subject filter", () => {
    const curriculum: SchoolCurriculum = {
      schoolName: "Test High School",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026 entrance",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-2-choice",
                      label: "Grade 2 Choice",
                      choose: 1,
                      subjects: [{ name: "Grade 2 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
            {
              grade: 3,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-3-choice",
                      label: "Grade 3 Choice",
                      choose: 1,
                      subjects: [{ name: "Grade 3 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "subjects",
        subjectSelectionFilter: "selected",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("Grade 2 Option")).not.toBeNull();
    expect(screen.queryByText("Grade 3 Option")).toBeNull();
  });

  it("restores the shared incomplete-roadmap filter", () => {
    const curriculum: SchoolCurriculum = {
      schoolName: "Test High School",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026 entrance",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "Required Korean", credits: 4 }],
                  choiceGroups: [
                    {
                      id: "grade-2-complete",
                      label: "Complete Choice",
                      choose: 1,
                      subjects: [{ name: "Completed Option", credits: 3 }],
                    },
                    {
                      id: "grade-2-incomplete",
                      label: "Incomplete Choice",
                      choose: 1,
                      subjects: [{ name: "Remaining Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        showOnlyIncompleteGroups: true,
        selection: {
          "2026:2:1:grade-2-complete": ["Completed Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByRole("button", { name: /Remaining Option/ })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Completed Option/ })).toBeNull();
    expect(screen.queryByText("Required Korean")).toBeNull();
  });
});
