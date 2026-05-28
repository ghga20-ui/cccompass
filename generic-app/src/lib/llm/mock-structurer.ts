import type { StructurerProvider, StructuringResult } from "./types";

export class MockStructurerProvider implements StructurerProvider {
  async structure(
    document: Parameters<StructurerProvider["structure"]>[0],
  ): Promise<StructuringResult> {
    return {
      curriculum: {
        schoolName: "테스트고등학교",
        sourceYear: "2026",
        cohorts: [
          {
            entranceYear: "2026",
            label: "2026학년도 입학생",
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
                        credits: 4,
                        rawText: "2학년 1학기 문학 4학점 필수",
                        confidence: 1,
                      },
                    ],
                    choiceGroups: [
                      {
                        id: "grade-2-semester-1-choice-a",
                        label: "선택A",
                        choose: 1,
                        minChoose: 1,
                        maxChoose: 1,
                        creditsEach: 3,
                        subjects: [
                          {
                            name: "물리학",
                            area: "과학",
                            credits: 3,
                          },
                          {
                            name: "생명과학",
                            area: "과학",
                            credits: 3,
                          },
                        ],
                        notes: ["택1"],
                        confidence: 1,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      warnings: [],
      sourceSnippets: [document.text],
    };
  }
}
