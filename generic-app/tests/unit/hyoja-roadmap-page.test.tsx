import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RoadmapPage from "@/app/s/[shareToken]/roadmap/page";
import { CohortProvider } from "@/contexts/CohortContext";
import { HyojaRuntimeProvider } from "@/contexts/HyojaRuntimeContext";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";
import { encodeRoadmapSelectionState } from "@/lib/roadmap-selection-state";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  writeText: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => "/s/student-share-token/roadmap",
}));

const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2027": {
      label: "2027 entrance",
      description: "Sample High School 2027 entrance",
      designated: [
        { subject: "Default Literature", area: "Korean", category: "General", credits: 4, grade: 2, semester: 1 },
      ],
      selections: [
        {
          id: "2027-2-1-choice-a",
          label: "Default Choice",
          grade: 2,
          semester: 1,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          options: ["Default Economics"],
        },
      ],
    },
    "2028": {
      label: "2028 entrance",
      description: "Sample High School 2028 entrance",
      designated: [
        { subject: "Literature", area: "Korean", category: "일반선택", credits: 4, grade: 2, semester: 1 },
        { subject: "Research", area: "Science", category: "진로선택", credits: 2, grade: 3, semester: 2 },
      ],
      selections: [
        {
          id: "2028-2-1-choice-a",
          label: "Grade 2 Choice",
          grade: 2,
          semester: 1,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          options: ["Economics", "Physics I"],
        },
        {
          id: "2028-2-1-choice-b",
          label: "Grade 2 Multi Choice",
          grade: 2,
          semester: 1,
          choose: 2,
          creditsEach: 2,
          totalCredits: 4,
          options: ["Chemistry I", "Life Science I", "Earth Science I"],
        },
      ],
    },
  },
};

function renderRoadmap(initialCohort = "2028") {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.writeText },
  });

  return render(
    <HyojaRuntimeProvider shareToken="student-share-token" schoolData={schoolData}>
      <CohortProvider
        cohorts={[
          { entranceYear: "2027", label: "2027 entrance" },
          { entranceYear: "2028", label: "2028 entrance" },
        ]}
        initialCohort={initialCohort}
      >
        <RoadmapPage />
      </CohortProvider>
    </HyojaRuntimeProvider>,
  );
}

afterEach(() => {
  cleanup();
  mocks.searchParams = new URLSearchParams();
  vi.clearAllMocks();
});

describe("Hyoja roadmap page", () => {
  it("renders grade two and three roadmap groups only", () => {
    renderRoadmap();

    expect(screen.getByText("2학년 1학기")).toBeInTheDocument();
    expect(screen.getByText("3학년 2학기")).toBeInTheDocument();
    expect(screen.queryByText("1학년 1학기")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Economics 선택" }));

    expect(screen.getByText("선택 학점 9")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });

  it("drops stale grade one shared selections", () => {
    mocks.searchParams = new URLSearchParams({
      state: encodeRoadmapSelectionState({
        cohort: "2028",
        selections: {
          "grade-1-stale": ["Grade 1 Hidden"],
          "2028-2-1-choice-a": ["Economics"],
        },
      }),
    });

    renderRoadmap();

    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공유 링크 복사" }));
    expect(mocks.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/s/student-share-token/roadmap?state="),
    );
  });

  it("restores shared selections for a non-default cohort", () => {
    mocks.searchParams = new URLSearchParams({
      state: encodeRoadmapSelectionState({
        cohort: "2028",
        selections: {
          "2028-2-1-choice-a": ["Physics I"],
        },
      }),
    });

    renderRoadmap("2027");

    expect(screen.getByText("Physics I")).toBeInTheDocument();
    expect(screen.queryByText("Default Literature")).not.toBeInTheDocument();
  });

  it("supports choosing multiple subjects from a multi-select group", () => {
    renderRoadmap();

    fireEvent.click(screen.getByRole("button", { name: "Chemistry I 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "Life Science I 선택" }));

    expect(screen.getByText("선택 학점 10")).toBeInTheDocument();
    expect(screen.getByText("Chemistry I, Life Science I")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공유 링크 복사" }));
    const copied = String(mocks.writeText.mock.calls.at(-1)?.[0] ?? "");
    const encoded = new URL(copied).searchParams.get("state");

    expect(encoded).not.toBeNull();
    expect(decodeURIComponent(copied)).toContain("/s/student-share-token/roadmap?state=");
  });
});
