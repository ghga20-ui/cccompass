import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareLayout from "@/app/s/[shareToken]/layout";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  getStudentCohortOptions,
  getAllAvailableSubjectNames,
} from "@/lib/hyoja/school-adapter";

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
  const firstCohortYear =
    getStudentCohortOptions(runtime.schoolData)[0]?.entranceYear ?? "";
  // 새 정책: 1학년도 편제에 있으면 노출된다. 1학년 1학기 개설 과목을 그대로 노출해 검증.
  const gradeOneSubjects = firstCohortYear
    ? getAllAvailableSubjectNames(runtime.schoolData, firstCohortYear, 1, 1)
    : [];
  return (
    <>
      <output>
        {runtime.shareToken}:{runtime.basePath}:{runtime.schoolData.schoolName}
      </output>
      <ul data-testid="grade-one-subjects">
        {gradeOneSubjects.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </>
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
    expect(screen.getByText("과목나침반")).toBeInTheDocument();
    expect(screen.queryByText(/ChatBot/i)).not.toBeInTheDocument();
  });

  it("notFound for missing publications and exposes grade-one-only data", async () => {
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

    // 새 정책: 1학년만 있어도 편제에 데이터가 있으면 공개 화면을 그대로 노출한다.
    // (옛 정책처럼 EmptyState로 떨어지지 않는다.)
    expect(
      screen.queryByText("공개할 선택과목 데이터가 없어요"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "학생 공개 하단 메뉴" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "student-share-token:/s/student-share-token:Grade One School",
      ),
    ).toBeInTheDocument();

    // 1학년 지정/선택 과목이 모두 학생 공개 데이터로 노출된다.
    expect(screen.getByText("Grade 1 Required")).toBeInTheDocument();
    expect(screen.getByText("Grade 1 Hidden")).toBeInTheDocument();
  });
});
