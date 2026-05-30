import { describe, expect, it } from "vitest";
import {
  buildSubjectAvailability,
  choiceLocations,
  getGroupRecords,
  selectableGrades,
} from "@/components/student/StudentCurriculumAssistant";
import type { CurriculumCohort } from "@/lib/curriculum/schema";

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
});
