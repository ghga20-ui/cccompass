import { describe, expect, it, vi } from "vitest";
import { postProcessCurriculum } from "@/lib/curriculum/post-process";
import { getReviewFlag } from "@/lib/curriculum/review-flags";
import type { CurriculumSubject, SchoolCurriculum } from "@/lib/curriculum/schema";

function curriculumWith(subjects: CurriculumSubject[]): SchoolCurriculum {
  return {
    schoolName: "테스트고",
    cohorts: [{
      entranceYear: "2026",
      label: "2026",
      grades: [{ grade: 3, semesters: [{
        semester: 1,
        requiredSubjects: subjects,
        choiceGroups: [{ id: "choice", label: "과학 선택", choose: 1, subjects }],
      }] }],
    }],
  };
}

describe("verified subject recognition aliases", () => {
  it.each([
    ["세포의 물질대사", "세포와 물질대사"],
    ["행성과 우주과학", "행성우주과학"],
  ])("corrects only the verified alias %s and keeps it visible for teacher review", (name, canonical) => {
    const subject: CurriculumSubject = { name, credits: 3, area: "과학", category: "진로선택", confidence: 0.95 };
    const input = curriculumWith([subject]);
    const output = postProcessCurriculum(input);
    const semester = output.cohorts[0].grades[0].semesters[0];
    const expected = { ...subject, name: canonical, rawText: name, confidence: 0.49 };
    expect(semester.requiredSubjects).toEqual([expected]);
    expect(semester.choiceGroups).toEqual([{ ...input.cohorts[0].grades[0].semesters[0].choiceGroups[0], subjects: [expected] }]);
    expect(getReviewFlag(semester.choiceGroups[0].subjects[0])?.label).toBe("확인 필요");
    expect(input.cohorts[0].grades[0].semesters[0].requiredSubjects).toEqual([subject]);
  });

  it("preserves existing source text and never raises a lower confidence", () => {
    const subject = { name: "세포의 물질대사", credits: 3, rawText: "추출 원문: 세포의 물질대사 (3)", confidence: 0.2 };
    const output = postProcessCurriculum(curriculumWith([subject]));
    expect(output.cohorts[0].grades[0].semesters[0].requiredSubjects[0]).toEqual({
      ...subject, name: "세포와 물질대사",
    });
  });

  it("adds low-confidence provenance when extraction supplied neither field", () => {
    const output = postProcessCurriculum(curriculumWith([{ name: "행성과 우주과학", credits: 3 }]));
    expect(output.cohorts[0].grades[0].semesters[0].requiredSubjects[0]).toEqual({
      name: "행성우주과학", credits: 3, rawText: "행성과 우주과학", confidence: 0.49,
    });
    expect(postProcessCurriculum(output)).toEqual(output);
  });

  it("leaves canonical names and unrelated or longer custom names unchanged", () => {
    const subjects = [
      "세포와 물질대사", "행성우주과학", "학교 세포의 물질대사", "행성과 우주과학 프로젝트", "세포 및 물질대사", "학교 융합 탐구",
    ].map((name) => ({ name, credits: 3, confidence: 0.95 }));
    const input = curriculumWith(subjects);
    expect(postProcessCurriculum(input)).toEqual(input);
  });

  it("prefers a genuine canonical catalog entry over the alias table", async () => {
    vi.resetModules();
    vi.doMock("@/data/subjects", () => ({
      subjects: [{ name: "세포의 물질대사" }, { name: "세포와 물질대사" }],
    }));
    try {
      const isolated = await import("@/lib/curriculum/post-process");
      const input = curriculumWith([{ name: "세포의 물질대사", credits: 3, confidence: 0.95 }]);
      expect(isolated.postProcessCurriculum(input)).toEqual(input);
    } finally {
      vi.doUnmock("@/data/subjects");
      vi.resetModules();
    }
  });
});
