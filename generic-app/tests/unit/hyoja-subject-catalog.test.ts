import { describe, expect, it } from "vitest";
import { createSubjectCatalog } from "@/lib/hyoja/subject-catalog";
import { adaptCurriculumForStudentAssistant, type StudentSchoolData } from "@/lib/hyoja/school-adapter";
import { getAssessmentBadge } from "@/data/assessment";

const studentSchoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2026": {
      label: "2026 entrance",
      description: "Sample High School 2026 entrance",
      designated: [
        {
          subject: "문학",
          area: "국어",
          category: "일반선택",
          credits: 4,
          grade: 2,
          semester: 1,
        },
        {
          subject: "Robotics Lab",
          area: "Engineering",
          category: "학교자율",
          credits: 2,
          grade: 2,
          semester: 1,
        },
      ],
      selections: [
        {
          id: "2026-2-1-choice-a",
          label: "Choice A",
          grade: 2,
          semester: 1,
          choose: 1,
          creditsEach: 2,
          totalCredits: 2,
          options: ["Robotics Lab", "문학", "Robotics Lab"],
        },
      ],
    },
    "2028-fall": {
      label: "2028 fall",
      description: "Sample High School 2028 fall",
      designated: [],
      selections: [
        {
          id: "2028-2-2-choice-a",
          label: "Choice A",
          grade: 2,
          semester: 2,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          options: ["Robotics Lab"],
        },
      ],
    },
  },
};

describe("Hyoja subject catalog fallback", () => {
  it("preserves uploaded elective area, category and individual credits through the adapter", () => {
    const data = adaptCurriculumForStudentAssistant({
      schoolName: "테스트고",
      cohorts: [{ entranceYear: "2026", label: "2026", grades: [{ grade: 2, semesters: [{
        semester: 1,
        requiredSubjects: [],
        choiceGroups: [{
          id: "custom", label: "맞춤 선택", choose: 1,
          subjects: [
            { name: "학교 예술 창작", area: "예술", category: "진로선택", credits: 2 },
            { name: "학교 사회 탐구", area: "사회", category: "융합선택", credits: 4 },
          ],
        }],
      }] }] }],
    });
    const catalog = createSubjectCatalog(data);
    const arts = catalog.getSubjectByName("학교 예술 창작")!;
    const social = catalog.getSubjectByName("학교 사회 탐구")!;
    expect(arts).toMatchObject({ area: "예술", category: "진로선택", credits: "2" });
    expect(getAssessmentBadge(arts).label).toBe("A·B·C");
    expect(social).toMatchObject({ area: "사회", category: "융합선택", credits: "4" });
    expect(getAssessmentBadge(social).label).toBe("A·B·C·D·E");
  });

  it("merges static and uploaded subject metadata", () => {
    const catalog = createSubjectCatalog(studentSchoolData);

    const staticSubject = catalog.getSubjectByName("문학");
    expect(staticSubject).toMatchObject({
      id: "korean_literature",
      name: "문학",
      area: "국어",
      category: "일반선택",
    });
    expect(staticSubject?.description).toContain("문학의 가치");

    const uploaded = catalog.getSubjectByName("Robotics Lab");
    expect(uploaded).toMatchObject({
      id: expect.stringMatching(/^uploaded-robotics-lab-[a-f0-9]{8}$/),
      name: "Robotics Lab",
      area: "Engineering",
      credits: "2",
      category: "일반선택",
    });
    expect(uploaded?.description).toContain("Sample High School");
    expect(uploaded?.description).toContain("Engineering");
    expect(catalog.getSubjectById(uploaded!.id)).toBe(uploaded);
  });

  it("deduplicates uploaded subjects and maps unknown categories safely", () => {
    const first = createSubjectCatalog(studentSchoolData);
    const second = createSubjectCatalog(studentSchoolData);

    const uploadedSubjects = first.subjects.filter(
      (subject) => subject.name === "Robotics Lab",
    );
    expect(uploadedSubjects).toHaveLength(1);
    expect(first.getSubjectByName("Robotics Lab")?.id).toBe(
      second.getSubjectByName("Robotics Lab")?.id,
    );
    expect(first.getSubjectByName("Robotics Lab")?.category).toBe("일반선택");
    expect(first.subjectAreaMatches("Engineering", "Engineering")).toBe(true);
    expect(first.subjectAreas).toContain("Engineering");
  });
});
