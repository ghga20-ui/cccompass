import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareLayout from "@/app/s/[shareToken]/layout";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";

const mocks = vi.hoisted(() => ({
  findPublication: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  pathname: "/s/student-share-token",
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
  usePathname: () => mocks.pathname,
}));

const validCurriculum = {
  schoolName: "Sample High School",
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
                  id: "grade-1-choice",
                  label: "Grade 1 Choice",
                  choose: 1,
                  subjects: [{ name: "Grade 1 Hidden", credits: 2 }],
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
              requiredSubjects: [{ name: "Literature", credits: 4 }],
              choiceGroups: [
                {
                  id: "grade-2-choice",
                  label: "Grade 2 Choice",
                  choose: 1,
                  subjects: [{ name: "Economics", credits: 3 }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const gradeOneOnlyCurriculum = {
  schoolName: "Grade One School",
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
              requiredSubjects: [{ name: "Grade 1 Required", credits: 4 }],
              choiceGroups: [
                {
                  id: "grade-1-choice",
                  label: "Grade 1 Choice",
                  choose: 1,
                  subjects: [{ name: "Grade 1 Hidden", credits: 2 }],
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
  mocks.pathname = "/s/student-share-token";
});

function RuntimeProbe() {
  const runtime = useHyojaRuntime();
  return (
    <output>
      {runtime.shareToken}:{runtime.basePath}:{runtime.schoolData.schoolName}
    </output>
  );
}

describe("public Hyoja share layout", () => {
  it("renders public Hyoja shell for a valid share token", async () => {
    mocks.findPublication.mockResolvedValueOnce({
      schoolName: "Sample High School",
      curriculumJson: validCurriculum,
    });

    render(
      await ShareLayout({
        params: Promise.resolve({ shareToken: "student-share-token" }),
        children: <RuntimeProbe />,
      }),
    );

    expect(mocks.findPublication).toHaveBeenCalledWith({
      where: { shareToken: "student-share-token" },
      select: {
        curriculumJson: true,
        schoolName: true,
      },
    });
    expect(
      screen.getByText(
        "student-share-token:/s/student-share-token:Sample High School",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "학생 공개 하단 메뉴" })).toBeInTheDocument();
    expect(screen.getByText("선택과목 도우미")).toBeInTheDocument();
    expect(screen.queryByText(/ChatBot/i)).not.toBeInTheDocument();
  });

  it("handles missing and grade-one-only publications", async () => {
    mocks.findPublication.mockResolvedValueOnce(null);

    await expect(
      ShareLayout({
        params: Promise.resolve({ shareToken: "missing-token" }),
        children: <RuntimeProbe />,
      }),
    ).rejects.toThrow("notFound");
    expect(mocks.notFound).toHaveBeenCalled();

    mocks.findPublication.mockResolvedValueOnce({
      schoolName: "Grade One School",
      curriculumJson: gradeOneOnlyCurriculum,
    });

    render(
      await ShareLayout({
        params: Promise.resolve({ shareToken: "student-share-token" }),
        children: <RuntimeProbe />,
      }),
    );

    expect(screen.getByText("공개할 2·3학년 선택과목 데이터가 없어요")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });
});
