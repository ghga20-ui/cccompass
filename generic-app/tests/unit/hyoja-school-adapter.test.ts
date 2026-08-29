import { describe, expect, it } from "vitest";
import {
  adaptCurriculumForStudentAssistant,
  getAllAvailableSubjectNames,
  getCohortData,
  getDesignatedSubjects,
  getSelectionGroups,
  getStudentCohortOptions,
  getStudentSemesterConfigs,
} from "@/lib/hyoja/school-adapter";
import type { SchoolCurriculum } from "@/lib/curriculum/schema";

const curriculum: SchoolCurriculum = {
  schoolName: "Sample High School",
  sourceYear: "2026",
  cohorts: [
    {
      entranceYear: "2024",
      label: "2024 entrance",
      grades: [
        {
          grade: 1,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [
                {
                  name: "Hidden Grade 1 Required",
                  area: "Common",
                  category: "공통",
                  credits: 4,
                },
              ],
              choiceGroups: [
                {
                  id: "hidden-choice",
                  label: "Hidden Choice",
                  choose: 1,
                  subjects: [
                    {
                      name: "Hidden Grade 1 Choice",
                      area: "Common",
                      credits: 2,
                    },
                  ],
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
              requiredSubjects: [
                { name: "Literature", area: "Korean", credits: 4 },
              ],
              choiceGroups: [
                {
                  id: "choice-a",
                  label: "Career Choice A",
                  choose: 2,
                  creditsEach: 3,
                  subjects: [
                    { name: "Economics", area: "Social", credits: 3 },
                    { name: "Economics", area: "Social", credits: 3 },
                    { name: "Physics I", area: "Science", credits: 3 },
                  ],
                },
              ],
            },
          ],
        },
        {
          grade: 3,
          semesters: [
            {
              semester: 2,
              requiredSubjects: [],
              choiceGroups: [
                {
                  id: "choice-b",
                  label: "Career Choice B",
                  choose: 1,
                  subjects: [
                    { name: "Advanced Math", area: "Math", credits: 4 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      entranceYear: "2027",
      label: "2027 entrance",
      grades: [
        {
          grade: 1,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [{ name: "Only Grade 1", credits: 3 }],
              choiceGroups: [],
            },
          ],
        },
      ],
    },
    {
      entranceYear: "2028-fall",
      label: "2028 fall entrance",
      grades: [
        {
          grade: 2,
          semesters: [
            {
              semester: 2,
              requiredSubjects: [{ name: "Media Reading", credits: 3 }],
              choiceGroups: [],
            },
          ],
        },
      ],
    },
  ],
};

describe("SchoolCurriculum to Hyoja student data adapter", () => {
  it("adapts published curriculum into Hyoja-compatible student data", () => {
    const data = adaptCurriculumForStudentAssistant(curriculum);

    expect(data.schoolName).toBe("Sample High School");
    // 새 정책: 편제에 데이터가 있는 모든 코호트를 노출(1학년만 있는 2027 코호트 포함).
    expect(Object.keys(data.cohorts)).toEqual(["2024", "2027", "2028-fall"]);
    expect(getStudentCohortOptions(data)).toEqual([
      {
        entranceYear: "2024",
        label: "2024 entrance",
        description: "Sample High School 2024 entrance",
      },
      {
        entranceYear: "2027",
        label: "2027 entrance",
        description: "Sample High School 2027 entrance",
      },
      {
        entranceYear: "2028-fall",
        label: "2028 fall entrance",
        description: "Sample High School 2028 fall entrance",
      },
    ]);

    expect(getCohortData(data, "2024")).toMatchObject({
      label: "2024 entrance",
      description: "Sample High School 2024 entrance",
    });
    expect(getDesignatedSubjects(data, "2024", 2, 1)).toEqual([
      {
        subject: "Literature",
        area: "Korean",
        category: "",
        credits: 4,
        grade: 2,
        semester: 1,
      },
    ]);
    expect(getSelectionGroups(data, "2024", 2, 1)).toEqual([
      {
        id: "2024-2-1-choice-a",
        label: "Career Choice A",
        grade: 2,
        semester: 1,
        choose: 2,
        minChoose: 2,
        maxChoose: 2,
        creditsEach: 3,
        totalCredits: 6,
        options: ["Economics", "Physics I"],
      },
    ]);
    expect(getSelectionGroups(data, "2024", 3, 2)[0]).toMatchObject({
      id: "2024-3-2-choice-b",
      creditsEach: 4,
      totalCredits: 4,
      options: ["Advanced Math"],
    });
    // 새 정책: 편제에 존재하는 모든 학년·학기를 노출(1학년 포함).
    expect(getStudentSemesterConfigs(getCohortData(data, "2024")!)).toEqual([
      { grade: 1, semester: 1, label: "1학년 1학기" },
      { grade: 2, semester: 1, label: "2학년 1학기" },
      { grade: 3, semester: 2, label: "3학년 2학기" },
    ]);
  });

  it("exposes grade 1 data through student availability helpers", () => {
    const data = adaptCurriculumForStudentAssistant(curriculum);

    // 새 정책: 1학년 데이터도 그대로 노출된다.
    expect(getDesignatedSubjects(data, "2024", 1, 1)).toEqual([
      {
        subject: "Hidden Grade 1 Required",
        area: "Common",
        category: "공통",
        credits: 4,
        grade: 1,
        semester: 1,
      },
    ]);
    expect(getSelectionGroups(data, "2024", 1, 1)).toEqual([
      {
        id: "2024-1-1-hidden-choice",
        label: "Hidden Choice",
        grade: 1,
        semester: 1,
        choose: 1,
        minChoose: 1,
        maxChoose: 1,
        creditsEach: 2,
        totalCredits: 2,
        options: ["Hidden Grade 1 Choice"],
      },
    ]);
    expect(getAllAvailableSubjectNames(data, "2024", 1, 1)).toEqual([
      "Hidden Grade 1 Required",
      "Hidden Grade 1 Choice",
    ]);
    // 1학년 과목은 1학년 학기에서만 노출되고, 2학년 학기 결과에는 섞이지 않는다.
    expect(
      getAllAvailableSubjectNames(data, "2024", 2, 1),
    ).not.toContain("Hidden Grade 1 Required");
    expect(
      getAllAvailableSubjectNames(data, "2024", 2, 1),
    ).not.toContain("Hidden Grade 1 Choice");
    // 새 정책: 1학년만 있는 코호트(2027)도 노출 대상에 포함된다.
    expect(getStudentCohortOptions(data).map((option) => option.entranceYear)).toContain(
      "2027",
    );
  });

  it("keeps arbitrary cohort string keys and stable group output", () => {
    const first = adaptCurriculumForStudentAssistant(curriculum);
    const second = adaptCurriculumForStudentAssistant(curriculum);

    expect(getCohortData(first, "2028-fall")).toBeDefined();
    expect(getCohortData(first, "2025")).toBeUndefined();
    expect(getSelectionGroups(first, "2024", 2, 1)).toEqual(
      getSelectionGroups(second, "2024", 2, 1),
    );
    expect(getAllAvailableSubjectNames(first, "2024", 2, 1)).toEqual([
      "Literature",
      "Economics",
      "Physics I",
    ]);
  });
});
