import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharePage from "@/app/s/[shareToken]/page";

const mocks = vi.hoisted(() => ({
  findPublication: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    curriculumPublication: {
      findUnique: mocks.findPublication,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

const publishedCurriculum = {
  schoolName: "테스트고등학교",
  sourceYear: "2026",
  cohorts: [
    {
      entranceYear: "2026",
      label: "2026학년도 입학생",
      grades: [
        {
          grade: 1,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [],
              choiceGroups: [
                {
                  id: "grade-1-choice",
                  label: "1학년 선택",
                  choose: 1,
                  subjects: [{ name: "1학년 숨김 과목", credits: 2 }],
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
                  id: "grade-2-choice",
                  label: "2학년 선택",
                  choose: 1,
                  subjects: [{ name: "경제", credits: 3 }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("public student assistant page", () => {
  it("renders the published curriculum as a student selection assistant", async () => {
    mocks.findPublication.mockResolvedValueOnce({
      curriculumJson: publishedCurriculum,
    });

    render(
      await SharePage({
        params: Promise.resolve({ shareToken: "student-share-token" }),
      }),
    );

    expect(mocks.findPublication).toHaveBeenCalledWith({
      where: {
        shareToken: "student-share-token",
      },
      select: {
        curriculumJson: true,
      },
    });
    expect(screen.getByText("테스트고등학교")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "학생 선택과목 도우미 하단 메뉴" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "과목 탭으로 이동" }));

    expect(screen.getByText("경제")).not.toBeNull();
    expect(screen.queryByText("1학년 숨김 과목")).toBeNull();
  });

  it("returns not found when the share token is unknown", async () => {
    mocks.findPublication.mockResolvedValueOnce(null);

    await expect(
      SharePage({
        params: Promise.resolve({ shareToken: "missing-token" }),
      }),
    ).rejects.toThrow("notFound");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
