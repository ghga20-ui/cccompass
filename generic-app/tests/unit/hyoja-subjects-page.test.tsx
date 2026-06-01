import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SubjectsPage from "@/app/s/[shareToken]/subjects/page";
import SubjectDetailPage from "@/app/s/[shareToken]/subjects/[id]/page";
import { CohortProvider } from "@/contexts/CohortContext";
import { HyojaRuntimeProvider } from "@/contexts/HyojaRuntimeContext";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";
import { createSubjectCatalog } from "@/lib/hyoja/subject-catalog";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  pathname: "/s/student-share-token/subjects",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => mocks.pathname,
}));

const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2026": {
      label: "2026 entrance",
      description: "Sample High School 2026 entrance",
      designated: [
        { subject: "문학", area: "국어", category: "일반선택", credits: 4, grade: 2, semester: 1 },
      ],
      selections: [
        {
          id: "2026-2-1-choice-a",
          label: "Grade 2 Choice",
          grade: 2,
          semester: 1,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          options: ["Robotics Lab"],
        },
      ],
    },
  },
};

function renderWithRuntime(children: React.ReactNode) {
  return render(
    <HyojaRuntimeProvider shareToken="student-share-token" schoolData={schoolData}>
      <CohortProvider cohorts={[{ entranceYear: "2026", label: "2026 entrance" }]}>
        {children}
      </CohortProvider>
    </HyojaRuntimeProvider>,
  );
}

afterEach(() => {
  cleanup();
  mocks.searchParams = new URLSearchParams();
  mocks.pathname = "/s/student-share-token/subjects";
});

describe("Hyoja subject pages", () => {
  it("lists grade two and three available subjects with fallback metadata", () => {
    renderWithRuntime(<SubjectsPage />);

    expect(screen.getByText("문학")).toBeInTheDocument();
    expect(screen.getByText("Robotics Lab")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Robotics Lab/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/subjects/uploaded-robotics-lab-"),
    );
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });

  it("hides grade one availability in subject detail", () => {
    mocks.searchParams = new URLSearchParams({ from: "https://evil.test" });
    mocks.pathname = "/s/student-share-token/subjects/uploaded-robotics-lab";

    const fallbackId = createSubjectCatalog(schoolData).getSubjectByName(
      "Robotics Lab",
    )!.id;
    renderWithRuntime(<SubjectDetailPage params={{ id: fallbackId }} />);

    expect(screen.getByText("Robotics Lab")).toBeInTheDocument();
    expect(screen.getByText(/2\s*학년\s*1\s*학기/)).toBeInTheDocument();
    expect(screen.queryByText("1학년 1학기")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "목록으로" })).toHaveAttribute(
      "href",
      "/s/student-share-token/subjects",
    );
  });
});
