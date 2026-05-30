import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSubjectAvailability,
  choiceLocations,
  getGroupRecords,
  roadmapExportFileName,
  roadmapShareText,
  roadmapShareTitle,
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
  it("labels shared roadmap artifacts as grade 2 and 3 selection outputs", () => {
    expect(roadmapShareTitle("Test High School")).toBe("Test High School 2·3학년 선택과목 로드맵");
    expect(roadmapShareText(cohort)).toBe("2026학년도 입학생 · 2·3학년 선택과목 로드맵");
    expect(roadmapExportFileName("Test High School")).toBe(
      "Test High School-2-3학년-선택과목-로드맵.png",
    );
  });

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

    expect(screen.queryAllByText("Grade 2 Option").length).toBeGreaterThan(0);
    expect(screen.queryByText("Grade 3 Option")).not.toBeNull();
    expect(screen.queryByText("Grade 1 Hidden Option")).toBeNull();
  });

  it("shows a sticky grade 2 and 3 credit summary on the roadmap", () => {
    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "roadmap" })}`);

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    const summaryRegion = screen.getByRole("region", { name: "학년별 학점 요약" });

    expect(summaryRegion.textContent).toContain("2학년");
    expect(summaryRegion.textContent).toContain("3학년");
    expect(summaryRegion.textContent).toContain("4/7학점");
    expect(summaryRegion.textContent).not.toContain("1학년");
  });

  it("shows home cohort cards and switches the active entrance year", () => {
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
                      id: "grade-2-2026",
                      label: "2026 Choice",
                      choose: 1,
                      subjects: [{ name: "2026 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          entranceYear: "2025",
          label: "2025 entrance",
          grades: [
            {
              grade: 3,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-3-2025",
                      label: "2025 Choice",
                      choose: 1,
                      subjects: [{ name: "2025 Option", credits: 3 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    const currentCard = screen.getByRole("button", { name: /고1.*2026.*편제 선택/ });
    const nextCard = screen.getByRole("button", { name: /고2.*2025.*편제 선택/ });

    expect(currentCard.className).toContain("bg-blue-600");
    expect(nextCard.className).not.toContain("bg-blue-600");
    expect(screen.getByText("고1")).not.toBeNull();
    expect(screen.getByText("고2")).not.toBeNull();

    fireEvent.click(nextCard);

    expect(nextCard.className).toContain("bg-blue-600");
  });

  it("starts from the first cohort with grade 2 or 3 choice groups", () => {
    const curriculum: SchoolCurriculum = {
      schoolName: "Test High School",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2027",
          label: "2027 entrance",
          grades: [
            {
              grade: 1,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "Common Korean", credits: 4 }],
                  choiceGroups: [
                    {
                      id: "grade-1-only",
                      label: "Grade 1 Only",
                      choose: 1,
                      subjects: [{ name: "Hidden Grade 1 Option", credits: 2 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
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
          ],
        },
      ],
    };

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("학생 선택과목 신청 대상인 2·3학년 편제 데이터가 없습니다.")).toBeNull();
    expect(screen.queryByRole("button", { name: /2027.*편제 선택/ })).toBeNull();
    expect(screen.getByRole("button", { name: /2026.*편제 선택/ }).className).toContain("bg-blue-600");
  });

  it("ignores a shared cohort state when that cohort only has grade 1 data", () => {
    const curriculum: SchoolCurriculum = {
      schoolName: "Test High School",
      sourceYear: "2026",
      cohorts: [
        {
          entranceYear: "2027",
          label: "2027 entrance",
          grades: [
            {
              grade: 1,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [
                    {
                      id: "grade-1-only",
                      label: "Grade 1 Only",
                      choose: 1,
                      subjects: [{ name: "Hidden Grade 1 Option", credits: 2 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
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
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ cohortYear: "2027", mode: "roadmap" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("Hidden Grade 1 Option")).toBeNull();
    expect(screen.queryByText("Grade 2 Option")).not.toBeNull();
  });

  it("shows the active recommendation-filter count in the bottom nav", () => {
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
                      subjects: [{ name: "Physics Option", credits: 3, area: "Science" }],
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
      `/?state=${encodeState({ mode: "subjects", selectedTagIds: ["science"] })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByLabelText("추천 조건 1개")).not.toBeNull();
  });

  it("summarizes subject explorer results with selected and recommended counts", () => {
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
                      id: "explorer-summary-choice",
                      label: "Explorer Summary Choice",
                      choose: 2,
                      subjects: [
                        { name: "Physics Option", credits: 3, area: "Science" },
                        { name: "Biology Option", credits: 3, area: "Science" },
                        { name: "History Option", credits: 3, area: "Social" },
                      ],
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
        selectedTagIds: ["area:Science"],
        selection: {
          "2026:2:1:explorer-summary-choice": ["Physics Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByLabelText("탐색 결과 표시 과목 2개")).not.toBeNull();
    expect(screen.queryByLabelText("탐색 결과 선택 과목 1개")).not.toBeNull();
    expect(screen.queryByLabelText("탐색 결과 추천 과목 2개")).not.toBeNull();
  });

  it("marks the current bottom-nav tab for app navigation", () => {
    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "학생 선택과목 도우미 하단 메뉴" });
    const homeTab = screen.getByRole("button", { name: "홈 탭, 현재 화면" });
    const roadmapTab = screen.getByRole("button", { name: "로드맵 탭으로 이동" });

    expect(nav).not.toBeNull();
    expect(homeTab.getAttribute("aria-current")).toBe("page");

    fireEvent.click(roadmapTab);

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: "홈 탭으로 이동" }).getAttribute("aria-current")).toBeNull();
  });

  it("shows roadmap progress on the student home screen", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selection: {
          "2026:2:1:g2-choice": ["경제"],
        },
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.getByText("나의 선택 진행")).not.toBeNull();
    expect(screen.getByText("선택 1개 · 완료 1/2묶음")).not.toBeNull();
    expect(screen.getByText("50%")).not.toBeNull();
    expect(screen.getByRole("button", { name: "경제 홈 선택 과목 상세 보기" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "경제 홈에서 선택 해제" })).not.toBeNull();
    expect(screen.getByRole("button", { name: /다음 선택: 3학년 1학기 · 3학년 선택/ })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "로드맵 이어하기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("opens and removes selected subjects from the home progress summary", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selection: {
          "2026:2:1:g2-choice": ["경제"],
        },
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "경제 홈 선택 과목 상세 보기" }));
    expect(screen.getByRole("dialog", { name: "경제" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "과목 상세 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "경제 홈에서 선택 해제" }));

    expect(screen.queryByRole("button", { name: "경제 홈에서 선택 해제" })).toBeNull();
    expect(screen.queryByText("경제를 로드맵에서 해제했습니다.")).not.toBeNull();
  });

  it("shows share and export actions on the home screen when the roadmap is complete", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selection: {
          "2026:2:1:g2-choice": ["경제"],
          "2026:3:1:g3-choice": ["심화 경제"],
        },
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.getByText("선택 2개 · 완료 2/2묶음")).not.toBeNull();
    expect(screen.getByText("2·3학년 선택 조건을 모두 채웠습니다.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "홈에서 링크 공유" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "홈에서 이미지 저장" })).not.toBeNull();
  });

  it("jumps from home progress to the next incomplete roadmap group", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selection: {
          "2026:2:1:g2-choice": ["경제"],
        },
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /다음 선택: 3학년 1학기 · 3학년 선택/ }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.queryByText("심화 경제")).not.toBeNull();
  });

  it("previews the grade 2 and 3 semester choice structure on the home screen", () => {
    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    const overview = screen.getByRole("region", { name: "2·3학년 선택 구조" });

    expect(overview.textContent).toContain("2학년 1학기");
    expect(overview.textContent).toContain("3학년 1학기");
    expect(overview.textContent).toContain("선택 묶음 1개 · 후보 1개");
    expect(overview.textContent).not.toContain("1학년");

    fireEvent.click(screen.getByRole("button", { name: "로드맵 보기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("summarizes and clears recommendation criteria on the home screen", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selectedTagIds: ["area:Social"],
        selectedProfileIds: ["career:business"],
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.queryByText("추천 조건 준비 완료")).not.toBeNull();
    expect(screen.queryByText(/개 조건으로 맞춤 과목을 볼 수 있습니다/)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "이 조건으로 추천 보기" }));

    expect(screen.getByRole("button", { name: "추천 탭, 현재 화면" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "홈 탭으로 이동" }));
    fireEvent.click(screen.getByRole("button", { name: "조건 초기화" }));

    expect(screen.queryByText("추천 조건 준비 완료")).toBeNull();
    expect(screen.queryByLabelText("추천 조건 2개")).toBeNull();
  });

  it("previews recommended subjects on the home screen after criteria are selected", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        selectedProfileIds: ["career:business"],
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    const preview = screen.getByRole("region", { name: "홈 추천 과목 미리보기" });

    expect(preview.textContent).toContain("바로 담을 추천 과목");
    expect(preview.textContent).toContain("경제");
    expect(preview.textContent).toContain("경영학과");

    fireEvent.click(screen.getByRole("button", { name: "경제 추천 과목 로드맵에 담기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.queryByLabelText("경제 선택 해제")).not.toBeNull();
  });

  it("removes profile-linked interest criteria when a selected profile chip is removed", () => {
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
                      id: "profile-linked-choice",
                      label: "Profile Linked Choice",
                      choose: 1,
                      subjects: [{ name: "경제", credits: 3, area: "Social" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: /경영학과/ }));
    expect(screen.queryByText("추천 조건 준비 완료")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "경영학과 추천 조건 해제" }));

    expect(screen.queryByText("추천 조건 준비 완료")).toBeNull();
    expect(screen.queryByLabelText("추천 조건 1개")).toBeNull();
  });

  it("asks for a recommendation condition before showing the recommendation list", () => {
    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "recommend" })}`);

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.getByText("관심 분야를 먼저 선택해주세요")).not.toBeNull();
    expect(screen.queryByText(/추천 후보/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "홈에서 조건 고르기" }));

    expect(screen.getByRole("button", { name: "홈 탭, 현재 화면" }).getAttribute("aria-current")).toBe("page");
  });

  it("combines selected interest and career recommendation conditions", () => {
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
                      id: "combined-choice",
                      label: "Combined Choice",
                      choose: 2,
                      subjects: [
                        { name: "Physics Option", credits: 3, area: "Science" },
                        { name: "경제", credits: 3, area: "Social" },
                      ],
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
        mode: "recommend",
        selectedTagIds: ["area:Science"],
        selectedProfileIds: ["career:business"],
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByText("Physics Option")).not.toBeNull();
    expect(screen.getByText("경제")).not.toBeNull();
    expect(screen.getByText("추천 결과 요약")).not.toBeNull();
    expect(screen.getByText("2개 과목을 로드맵에서 비교할 수 있습니다.")).not.toBeNull();
    expect(screen.queryByText(/담은 과목/)).toBeNull();
    expect(screen.getByRole("button", { name: /권장 역량/ })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /권장 역량/ }));

    expect(screen.getByText(/경영학과: 경영 · 경제 · 사회 분야에 필요한 과목/)).not.toBeNull();
    expect(screen.getByLabelText("Physics Option 추천 연결 조건").textContent).toContain("Science");
    expect(screen.getByLabelText("경제 추천 연결 조건").textContent).toContain("경영학과");

    fireEvent.click(screen.getByRole("button", { name: "이 추천으로 로드맵 만들기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("summarizes selected recommendation subjects in each semester section", () => {
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
                      id: "recommended-selected-choice",
                      label: "Recommended Selected Choice",
                      choose: 2,
                      subjects: [
                        { name: "경제", credits: 3, area: "Social" },
                        { name: "금융 경제", credits: 3, area: "Social" },
                      ],
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
        mode: "recommend",
        selectedProfileIds: ["career:business"],
        selection: {
          "2026:2:1:recommended-selected-choice": ["경제"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByText(/추천 후보 2개 · 맞춤 2개 · 담은 과목 1개/)).not.toBeNull();
    expect(screen.getByText("1/2")).not.toBeNull();
  });

  it("lets students add a common recommendation from multi-profile comparison", () => {
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
                      id: "business-choice",
                      label: "Business Choice",
                      choose: 1,
                      subjects: [{ name: "경제", credits: 3, area: "Social" }],
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
        mode: "recommend",
        selectedProfileIds: ["career:business", "profile:business"],
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByText("공통 추천 과목")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "경제 공통 추천 과목 로드맵에 담기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.queryByLabelText("경제 선택 해제")).not.toBeNull();
  });

  it("summarizes active recommendation criteria on the roadmap", () => {
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
                      id: "science-choice",
                      label: "Science Choice",
                      choose: 1,
                      subjects: [
                        { name: "Physics Option", credits: 3, area: "Science" },
                        { name: "History Option", credits: 3, area: "Social" },
                      ],
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
        selectedTagIds: ["area:Science"],
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByText("추천 조건 반영")).not.toBeNull();
    expect(screen.getByText("로드맵에서 추천 후보 1개를 표시하고 있습니다.")).not.toBeNull();
    expect(screen.getAllByText("Science").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Physics Option 선택" }).textContent).toContain("Science");
    expect(screen.getByRole("button", { name: "History Option 선택" }).textContent).not.toContain("Science");

    fireEvent.click(screen.getByRole("button", { name: "추천 보기" }));

    expect(screen.getByRole("button", { name: "추천 탭, 현재 화면" }).getAttribute("aria-current")).toBe("page");
  });

  it("shows an empty state for unmatched career search on the home screen", () => {
    window.history.replaceState({}, "", `/?state=${encodeState({ profileQuery: "없는학과" })}`);

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.getByText("검색 결과가 없습니다.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "추천 후보 다시 보기" }));

    expect(screen.queryByText("검색 결과가 없습니다.")).toBeNull();
    expect((screen.getByPlaceholderText("예: 공학, 의생명, 사회, 경제, 예술") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("closes subject details with Escape and backdrop clicks", () => {
    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "subjects" })}`);

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "경제 과목 상세 보기" }));
    expect(screen.getByRole("dialog", { name: "경제" })).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "과목 상세 닫기" }));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "경제" })).toBeNull();
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "경제 과목 상세 보기" }));
    const dialog = screen.getByRole("dialog", { name: "경제" });
    const backdrop = dialog.parentElement;
    if (!backdrop) throw new Error("Expected subject detail backdrop");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.mouseDown(backdrop);
    expect(screen.queryByRole("dialog", { name: "경제" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows selected recommendation criteria inside subject details", () => {
    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "subjects",
        selectedProfileIds: ["career:business"],
      })}`,
    );

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "경제 과목 상세 보기" }));

    const dialog = screen.getByRole("dialog", { name: "경제" });
    expect(dialog.textContent).toContain("내 추천 조건과 연결");
    expect(dialog.textContent).toContain("경영학과");
    expect(dialog.textContent).toContain("주요 학습 내용");
    expect(dialog.textContent).toContain("주제 탐구 활동");
    expect(dialog.textContent).toContain("경제와 관심 진로를 연결한 탐구 질문 만들기");
  });

  it("lets students recover from an empty subject result", () => {
    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "subjects", search: "없는과목" })}`);

    render(
      <StudentCurriculumAssistant
        curriculum={{ schoolName: "Test High School", sourceYear: "2026", cohorts: [cohort] }}
      />,
    );

    expect(screen.getByText("조건에 맞는 2·3학년 선택과목이 없습니다.")).not.toBeNull();

    const resetButtons = screen.getAllByRole("button", { name: "조건 초기화" });
    fireEvent.click(resetButtons[resetButtons.length - 1]);

    expect(screen.queryByText("조건에 맞는 2·3학년 선택과목이 없습니다.")).toBeNull();
    expect(screen.getByText("경제")).not.toBeNull();
  });

  it("filters the subject explorer to exam-related subjects", () => {
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
                      id: "exam-filter-choice",
                      label: "Exam Filter Choice",
                      choose: 1,
                      subjects: [
                        { name: "경제", credits: 3, area: "Social" },
                        { name: "창의 디자인", credits: 3, area: "Arts" },
                      ],
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
      `/?state=${encodeState({ mode: "subjects", onlyExamSubjects: true })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByRole("button", { name: "수능 관련" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("경제")).not.toBeNull();
    expect(screen.queryByText("창의 디자인")).toBeNull();
    expect(screen.getAllByText("수능 관련").length).toBeGreaterThan(1);
  });

  it("marks exam-related subjects with a visible badge", () => {
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
                      id: "exam-badge-choice",
                      label: "Exam Badge Choice",
                      choose: 1,
                      subjects: [
                        { name: "경제", credits: 3, area: "Social" },
                        { name: "창의 디자인", credits: 3, area: "Arts" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "subjects" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("경제")).not.toBeNull();
    expect(screen.queryByText("창의 디자인")).not.toBeNull();
    expect(screen.getAllByText("수능 관련").length).toBeGreaterThan(1);
  });

  it("explains blocked roadmap additions inside subject details", () => {
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
                      id: "full-choice",
                      label: "Full Choice",
                      choose: 2,
                      subjects: [
                        { name: "First Option", credits: 3 },
                        { name: "Second Option", credits: 3 },
                        { name: "Third Option", credits: 3 },
                      ],
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
        selection: {
          "2026:2:1:full-choice": ["First Option", "Second Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByText("선택 불가")).not.toBeNull();
    expect(screen.getByText("이 선택 묶음의 선택 조건이 가득 찼습니다.")).not.toBeNull();
    expect(screen.getByRole("button", { name: /로드맵에서 조정/ })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Third Option 과목 상세 보기" }));

    expect(screen.getByText("선택 불가: 이 선택 묶음의 선택 조건이 가득 찼습니다.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "로드맵에서 조정하기" }));

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
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

    expect(screen.queryAllByText("Grade 2 Option").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("로드맵 선택됨").length).toBeGreaterThan(1);
    expect(screen.queryAllByText("선택됨").length).toBeGreaterThan(0);
    expect(screen.queryByText("로드맵에서 보기")).not.toBeNull();
    expect(screen.queryByLabelText("로드맵 선택 과목 1개")).not.toBeNull();
    expect(screen.queryByText("Grade 3 Option")).toBeNull();
  });

  it("restores an autosaved roadmap selection from local storage", () => {
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
          ],
        },
      ],
    };

    window.localStorage.setItem(
      "student-curriculum-assistant:/",
      encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      }),
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.getByRole("button", { name: "로드맵 탭, 현재 화면" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.queryByLabelText("Grade 2 Option 선택 해제")).not.toBeNull();
    expect(screen.queryByLabelText("로드맵 선택 과목 1개")).not.toBeNull();
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

    expect(screen.queryByText("선택 진행률")).not.toBeNull();
    expect(screen.queryByText("1개 묶음이 남았습니다.")).not.toBeNull();
    expect(screen.queryAllByText("1개 더 선택").length).toBeGreaterThan(1);
    expect(screen.queryAllByRole("button", { name: /Remaining Option/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Complete Choice")).toBeNull();
    expect(screen.queryByText("Required Korean")).toBeNull();
  });

  it("moves directly to the next incomplete roadmap group", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
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
        selection: {
          "2026:2:1:grade-2-complete": ["Completed Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: /다음 미완료: .*Incomplete Choice/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("counts every incomplete roadmap group even when the preview list is capped", () => {
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
                  choiceGroups: Array.from({ length: 4 }, (_, index) => ({
                    id: `incomplete-${index + 1}`,
                    label: `Incomplete Choice ${index + 1}`,
                    choose: 1,
                    subjects: [{ name: `Option ${index + 1}`, credits: 3 }],
                  })),
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "roadmap" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("4개 묶음이 남았습니다.")).not.toBeNull();
    expect(screen.queryByText("4개 남음")).not.toBeNull();
    expect(screen.queryByText("외 1개 선택 묶음이 더 남았습니다.")).not.toBeNull();
  });

  it("opens subject details from roadmap choice options", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "roadmap" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: /Grade 2 Option 과목 상세 보기/ }));

    expect(screen.queryByText(/Grade 2 Option은/)).not.toBeNull();
    expect(screen.queryByText("선택 묶음 현황")).not.toBeNull();
    expect(screen.queryByText("1개 더 선택해야 합니다.")).not.toBeNull();
  });

  it("shows peer subjects as comparison cards in subject details", () => {
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
                      id: "compare-choice",
                      label: "Compare Choice",
                      choose: 1,
                      subjects: [
                        { name: "경제", credits: 3, area: "Social" },
                        { name: "창의 디자인", credits: 3, area: "Arts" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "subjects" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: "경제 과목 상세 보기" }));

    expect(screen.queryByText("같은 묶음의 비교 과목")).not.toBeNull();
    expect(screen.queryByText("같은 선택 묶음 안에서 대체 선택할 수 있는 과목입니다.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "창의 디자인 비교 과목 상세 보기" }));

    expect(screen.getByRole("dialog", { name: "창의 디자인" })).not.toBeNull();
  });

  it("shows feedback when a subject is added to the roadmap from a card", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "subjects" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: /로드맵에 담기/ }));

    expect(screen.queryByText("Grade 2 Option을 로드맵에 담았습니다.")).not.toBeNull();
  });

  it("shows feedback when a subject is added directly on the roadmap", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState({}, "", `/?state=${encodeState({ mode: "roadmap" })}`);

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: "Grade 2 Option 선택" }));

    expect(screen.queryByText("Grade 2 Option을 로드맵에 담았습니다.")).not.toBeNull();
  });

  it("shows feedback when a selected roadmap subject is removed directly", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: "Grade 2 Option 선택" }));

    expect(screen.queryByText("Grade 2 Option을 로드맵에서 해제했습니다.")).not.toBeNull();
    expect(screen.queryByLabelText("로드맵 선택 과목 1개")).toBeNull();
  });

  it("lets students remove selected subjects from the explorer roadmap summary", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "subjects",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("담은 과목")).not.toBeNull();
    expect(screen.queryByText("1개")).not.toBeNull();

    fireEvent.click(screen.getByLabelText("Grade 2 Option 선택 해제"));

    expect(screen.queryByLabelText("Grade 2 Option 선택 해제")).toBeNull();
    expect(screen.queryByText("담은 과목")).toBeNull();
  });

  it("explains why a full roadmap choice option is disabled", () => {
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
                      choose: 2,
                      subjects: [
                        { name: "First Option", credits: 3 },
                        { name: "Second Option", credits: 3 },
                        { name: "Third Option", credits: 3 },
                      ],
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
        selection: {
          "2026:2:1:grade-2-choice": ["First Option", "Second Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByLabelText("Third Option 선택 불가: 택2 완료")).not.toBeNull();
    expect(screen.queryByText("선택 불가: 택2 완료")).not.toBeNull();
  });

  it("opens subject details from selected roadmap chips", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByLabelText("Grade 2 Option 선택 과목 상세 보기"));

    expect(screen.queryByText(/Grade 2 Option은/)).not.toBeNull();
    expect(screen.queryByText("이 묶음의 선택 조건을 채웠습니다.")).not.toBeNull();
  });

  it("removes a selected subject directly from subject details", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByLabelText("Grade 2 Option 선택 과목 상세 보기"));
    fireEvent.click(screen.getByRole("button", { name: "Grade 2 Option 상세에서 선택 해제" }));

    expect(screen.queryByText("로드맵에 선택한 과목")).toBeNull();
    expect(screen.queryByLabelText("로드맵 선택 과목 1개")).toBeNull();
    expect(screen.queryByText("Grade 2 Option을 로드맵에서 해제했습니다.")).not.toBeNull();
  });

  it("shows a completion panel when every roadmap choice is filled", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    expect(screen.queryByText("로드맵 완성")).not.toBeNull();
    expect(screen.queryByText(/2·3학년 선택 조건을 모두 채웠습니다/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "링크 공유" })).not.toBeNull();
  });

  it("removes a selected subject from the roadmap summary", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByLabelText("Grade 2 Option 선택 해제"));

    expect(screen.queryByLabelText("Grade 2 Option 선택 해제")).toBeNull();
    expect(screen.getByText("아직 선택한 과목이 없습니다.")).not.toBeNull();
  });

  it("confirms before clearing every roadmap subject", () => {
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
          ],
        },
      ],
    };

    window.history.replaceState(
      {},
      "",
      `/?state=${encodeState({
        mode: "roadmap",
        selection: {
          "2026:2:1:grade-2-choice": ["Grade 2 Option"],
        },
      })}`,
    );

    render(<StudentCurriculumAssistant curriculum={curriculum} />);

    fireEvent.click(screen.getByRole("button", { name: "전체 초기화" }));

    expect(screen.getByText("선택한 과목을 모두 지웁니다. 한 번 더 누르면 초기화됩니다.")).not.toBeNull();
    expect(screen.getByLabelText("Grade 2 Option 선택 해제")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다시 누르면 초기화" }));

    expect(screen.queryByLabelText("Grade 2 Option 선택 해제")).toBeNull();
    expect(screen.getByText("아직 선택한 과목이 없습니다.")).not.toBeNull();
  });
});
