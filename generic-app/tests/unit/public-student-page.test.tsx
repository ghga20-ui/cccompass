import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareLayout from "@/app/s/[shareToken]/layout";
import ShareHomePage from "@/app/s/[shareToken]/page";

const mocks = vi.hoisted(() => ({
  findPublication: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  push: vi.fn(),
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
  useRouter: () => ({
    push: mocks.push,
  }),
}));

const publishedCurriculum = {
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.pathname = "/s/student-share-token";
});

describe("public Hyoja share page", () => {
  it("renders the published curriculum through the Hyoja shell", async () => {
    mocks.findPublication.mockResolvedValueOnce({
      schoolName: "Sample High School",
      curriculumJson: publishedCurriculum,
    });

    render(
      await ShareLayout({
        params: Promise.resolve({ shareToken: "student-share-token" }),
        children: <ShareHomePage />,
      }),
    );

    expect(screen.getByText("Sample High School")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /나에게 맞는\s*선택과목을 찾아보자/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "학생 공개 하단 메뉴" })).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });

  it("returns not found when the share token is unknown", async () => {
    mocks.findPublication.mockResolvedValueOnce(null);

    await expect(
      ShareLayout({
        params: Promise.resolve({ shareToken: "missing-token" }),
        children: <ShareHomePage />,
      }),
    ).rejects.toThrow("notFound");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
