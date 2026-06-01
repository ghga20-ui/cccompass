import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecommendPage from "@/app/s/[shareToken]/recommend/page";
import { CohortProvider } from "@/contexts/CohortContext";
import { HyojaRuntimeProvider } from "@/contexts/HyojaRuntimeContext";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams("dept=간호학과"),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => "/s/student-share-token/recommend",
}));

const schoolData: StudentSchoolData = {
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
          options: ["Economics", "Grade 1 Hidden"],
        },
      ],
    },
  },
};

function renderRecommend() {
  return render(
    <HyojaRuntimeProvider shareToken="student-share-token" schoolData={schoolData}>
      <CohortProvider cohorts={[{ entranceYear: "2026", label: "2026 entrance" }]}>
        <RecommendPage />
      </CohortProvider>
    </HyojaRuntimeProvider>,
  );
}

afterEach(() => {
  cleanup();
  mocks.searchParams = new URLSearchParams("dept=간호학과");
});

describe("Hyoja recommendation page", () => {
  it("renders department recommendations from grade two and three availability", () => {
    renderRecommend();

    expect(screen.getByText("간호학과 추천 과목")).toBeInTheDocument();
    expect(screen.getByText("2학년 1학기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Economics/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/subjects/"),
    );
    expect(screen.getByRole("link", { name: /로드맵에 담기/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/roadmap"),
    );
  });

  it("does not recommend grade-one-only subjects", () => {
    renderRecommend();

    expect(screen.getByText("문학")).toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Only Recommendation")).not.toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Required")).not.toBeInTheDocument();
  });
});
