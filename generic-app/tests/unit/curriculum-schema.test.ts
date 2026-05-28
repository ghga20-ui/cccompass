import { describe, expect, it } from "vitest";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { normalizeSubjectName, resolveChooseCount } from "@/lib/curriculum/normalize";

const validCurriculum = {
  schoolName: "서울고등학교",
  sourceYear: "2026",
  cohorts: [
    {
      entranceYear: "2026",
      label: "2026 입학생",
      grades: [
        {
          grade: 2,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [
                {
                  name: "문학",
                  area: "국어",
                  category: "일반선택",
                  credits: 4,
                  rawText: "문학 4단위",
                  confidence: 0.95,
                },
              ],
              choiceGroups: [
                {
                  id: "g2-s1-choice-a",
                  label: "탐구 선택",
                  choose: 2,
                  minChoose: 1,
                  maxChoose: 2,
                  creditsEach: 3,
                  subjects: [
                    {
                      name: "세계사",
                      category: "일반선택",
                      credits: 3,
                    },
                    {
                      name: "경제",
                      category: "일반선택",
                      credits: 3,
                    },
                  ],
                  notes: ["2과목 선택"],
                  confidence: 0.9,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("curriculum schema", () => {
  it("accepts a valid curriculum with required subjects, choice groups, and notes", () => {
    expect(schoolCurriculumSchema.safeParse(validCurriculum).success).toBe(true);
  });

  it("rejects an empty school name", () => {
    expect(
      schoolCurriculumSchema.safeParse({
        ...validCurriculum,
        schoolName: "",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid credits", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].requiredSubjects[0].credits = 0;

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });

  it("rejects an empty choice group", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].subjects = [];

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });

  it("rejects a numeric source year", () => {
    expect(
      schoolCurriculumSchema.safeParse({
        ...validCurriculum,
        sourceYear: 2026,
      }).success,
    ).toBe(false);
  });

  it("rejects a numeric entrance year", () => {
    expect(
      schoolCurriculumSchema.safeParse({
        ...validCurriculum,
        cohorts: [
          {
            ...validCurriculum.cohorts[0],
            entranceYear: 2026,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects a choice count greater than the subject count", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].choose = 3;

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });

  it("rejects a min choice greater than the choice count", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].minChoose = 3;

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });

  it("rejects a choice count greater than the max choice", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].maxChoose = 1;

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });

  it("rejects a max choice greater than the subject count", () => {
    const invalidCurriculum = structuredClone(validCurriculum);
    invalidCurriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].maxChoose = 3;

    expect(schoolCurriculumSchema.safeParse(invalidCurriculum).success).toBe(false);
  });
});

describe("curriculum normalization", () => {
  it("trims and collapses subject name whitespace", () => {
    expect(normalizeSubjectName("  고전   읽기\t\n ")).toBe("고전 읽기");
  });

  it("resolves compact choose counts", () => {
    expect(resolveChooseCount("택1")).toBe(1);
  });

  it("resolves compact choose counts embedded in labels", () => {
    expect(resolveChooseCount("선택A 택1")).toBe(1);
  });

  it("resolves choose counts from descriptive Korean text", () => {
    expect(resolveChooseCount("3과목 중 2과목 선택")).toBe(2);
  });

  it("returns null when the choose count is ambiguous", () => {
    expect(resolveChooseCount("선택")).toBeNull();
  });
});
