import test from "node:test";
import assert from "node:assert/strict";

const { retrieveChatContext } = await import(
  new URL("./chat-retrieval.ts", import.meta.url).href
);

const careerData = {
  fields: [
    {
      name: "공학 분야",
      tracks: [
        {
          name: "컴퓨터·정보 계열",
          recommendedSubjects: {
            일반선택: ["정보", "확률과 통계"],
            진로선택: ["인공지능 수학"],
            융합선택: ["소프트웨어와 생활"],
          },
          departments: [
            {
              name: "컴퓨터공학과",
              description: "소프트웨어와 인공지능 시스템을 설계하는 학과",
              recommendedStudents: ["코딩과 AI에 관심 있는 학생"],
              recommendedSubjects: {
                일반선택: ["정보", "확률과 통계"],
                진로선택: ["인공지능 수학"],
                융합선택: ["소프트웨어와 생활"],
              },
              similarDepartments: ["AI·컴퓨터공학과"],
            },
          ],
        },
      ],
    },
    {
      name: "보건·의약학 분야",
      tracks: [
        {
          name: "의약학 계열",
          recommendedSubjects: {
            일반선택: ["생명과학", "화학"],
            진로선택: ["세포와 물질대사", "미적분II", "기하"],
            융합선택: ["보건"],
          },
          departments: [
            {
              name: "의예과",
              description: "의학 인재를 양성하는 학과",
              recommendedStudents: ["의학에 진지한 관심이 있는 학생"],
              recommendedSubjects: {
                일반선택: ["생명과학", "화학"],
                진로선택: ["세포와 물질대사", "미적분II", "기하"],
                융합선택: ["보건"],
              },
              similarDepartments: ["의학과"],
            },
          ],
        },
      ],
    },
  ],
};

const schoolData = {
  cohorts: {
    "2025": {
      label: "2025학년도 입학생",
      description: "고3 선택과목 대상",
      designated: [],
      selections: [
        {
          id: "g2",
          label: "고2 선택",
          grade: 2,
          semester: 2,
          choose: 2,
          creditsEach: 3,
          totalCredits: 6,
          options: ["생명과학"],
        },
        {
          id: "g3",
          label: "고3 선택",
          grade: 3,
          semester: 1,
          choose: 3,
          creditsEach: 3,
          totalCredits: 9,
          options: ["화학", "세포와 물질대사"],
        },
      ],
    },
    "2026": {
      label: "2026학년도 입학생",
      description: "고2+고3 선택과목 대상",
      designated: [
        {
          subject: "미적분Ⅰ",
          area: "수학",
          category: "일반",
          credits: 4,
          grade: 2,
          semester: 2,
        },
      ],
      selections: [
        {
          id: "g2",
          label: "고2 선택",
          grade: 2,
          semester: 1,
          choose: 2,
          creditsEach: 3,
          totalCredits: 6,
          options: ["생명과학", "화학", "정보"],
        },
        {
          id: "g3",
          label: "고3 선택",
          grade: 3,
          semester: 2,
          choose: 2,
          creditsEach: 3,
          totalCredits: 6,
          options: ["세포와 물질대사", "미적분Ⅱ", "인공지능 수학"],
        },
      ],
    },
  },
};

test("retrieves medical department context from an 의대 alias", () => {
  const context = retrieveChatContext({
    question: "의대 가려면 어떤 과목 들어야 해?",
    cohortYear: "2026",
    careerData,
    schoolData,
  });

  assert.equal(context.matches[0].departmentName, "의예과");
  assert.ok(context.availableRecommendedSubjects.includes("생명과학"));
  assert.ok(context.availableRecommendedSubjects.includes("미적분II"));
  assert.ok(context.unavailableRecommendedSubjects.includes("기하"));
  assert.match(context.promptText, /의예과/);
  assert.doesNotMatch(context.promptText, /컴퓨터공학과/);
});

test("retrieves exact department context without unrelated departments", () => {
  const context = retrieveChatContext({
    question: "컴퓨터공학과 희망하면 뭐 들어?",
    cohortYear: "2026",
    careerData,
    schoolData,
  });

  assert.equal(context.matches[0].departmentName, "컴퓨터공학과");
  assert.ok(context.availableRecommendedSubjects.includes("정보"));
  assert.ok(context.availableRecommendedSubjects.includes("인공지능 수학"));
  assert.match(context.promptText, /컴퓨터공학과/);
  assert.doesNotMatch(context.promptText, /의예과/);
});

test("uses only future selectable grades for the selected cohort", () => {
  const context = retrieveChatContext({
    question: "의대 가려면?",
    cohortYear: "2025",
    careerData,
    schoolData,
  });

  assert.ok(context.availableRecommendedSubjects.includes("화학"));
  assert.ok(context.availableRecommendedSubjects.includes("세포와 물질대사"));
  assert.ok(!context.availableRecommendedSubjects.includes("생명과학"));
  assert.match(context.promptText, /3학년 1학기/);
  assert.doesNotMatch(context.promptText, /2학년 2학기/);
});
