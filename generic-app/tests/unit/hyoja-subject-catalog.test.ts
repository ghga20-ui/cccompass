import { describe, expect, it } from "vitest";
import { createSubjectCatalog } from "@/lib/hyoja/subject-catalog";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";

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
