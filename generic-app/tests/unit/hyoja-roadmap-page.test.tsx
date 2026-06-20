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

// 새 정책: 편제에 존재하는 모든 학년을 노출하되, 로드맵 화면은
// "선택과목군(choiceGroups)이 있는 학기만" 보여준다.
// - 1학년 1학기: 선택군 있음 → 로드맵에 노출 (1학년도 더 이상 숨기지 않음)
// - 2학년 1학기: 선택군 있음 → 로드맵에 노출
// - 3학년 2학기: 지정과목만 있고 선택군 없음 → 로드맵에서 제외
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
        { subject: "Math", area: "Math", category: "공통", credits: 4, grade: 1, semester: 1 },
        { subject: "Literature", area: "Korean", category: "일반선택", credits: 4, grade: 2, semester: 1 },
        { subject: "Research", area: "Science", category: "진로선택", credits: 2, grade: 3, semester: 2 },
      ],
      selections: [
        {
          id: "2028-1-1-choice-a",
          label: "Grade 1 Choice",
          grade: 1,
          semester: 1,
          choose: 1,
          creditsEach: 2,
          totalCredits: 2,
          options: ["Intro Coding", "Intro Art"],
        },
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
  it("renders only semesters that have selection groups (grade 1 included, designated-only semester excluded)", () => {
    renderRoadmap();

    // 선택군이 있는 학기는 학년과 무관하게 노출 (1학년도 포함)
    expect(screen.getByText("1학년 1학기")).toBeInTheDocument();
    expect(screen.getByText("2학년 1학기")).toBeInTheDocument();
    // 지정과목만 있고 선택군이 없는 학기는 로드맵에서 제외
    expect(screen.queryByText("3학년 2학기")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Economics 선택" }));

    // 2학년 1학기: 지정 Literature(4) + 선택 Economics(3) = 7 / 기대 11학점
    expect(screen.getByText("7 / 11학점")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });

  it("drops stale selections whose group id no longer exists in the cohort", () => {
    mocks.searchParams = new URLSearchParams({
      s: encodeRoadmapSelectionState({
        cohort: "2028",
        selections: {
          "grade-1-stale": ["Grade 1 Hidden"],
          "2028-2-1-choice-a": ["Economics"],
        },
      }),
    });

    renderRoadmap();

    // 유효한 선택은 복원됨 (1/1 선택 ✓), 존재하지 않는 군의 항목은 무시됨
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(screen.getByText("1/1 선택 ✓")).toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    expect(mocks.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/s/student-share-token/roadmap?c=2028&s="),
    );
  });

  it("restores shared selections for the active cohort", () => {
    mocks.searchParams = new URLSearchParams({
      s: encodeRoadmapSelectionState({
        cohort: "2027",
        selections: {
          "2027-2-1-choice-a": ["Default Economics"],
        },
      }),
    });

    renderRoadmap("2027");

    // 활성 cohort(2027)의 데이터가 노출되고, 공유된 선택이 복원된다
    expect(screen.getByText("Default Economics")).toBeInTheDocument();
    expect(screen.getByText("Default Literature")).toBeInTheDocument();
    expect(screen.getByText("1/1 선택 ✓")).toBeInTheDocument();
    // 다른 cohort(2028)의 과목은 노출되지 않는다
    expect(screen.queryByText("Physics I")).not.toBeInTheDocument();
  });

  it("supports choosing multiple subjects from a multi-select group", () => {
    renderRoadmap();

    fireEvent.click(screen.getByRole("button", { name: "Chemistry I 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "Life Science I 선택" }));

    // 2학년 1학기: 지정 Literature(4) + 다중선택 2과목(2학점x2=4) = 8 / 기대 11학점
    expect(screen.getByText("8 / 11학점")).toBeInTheDocument();
    expect(screen.getByText("2/2 선택 ✓")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    const copied = String(mocks.writeText.mock.calls.at(-1)?.[0] ?? "");
    const encoded = new URL(copied).searchParams.get("s");

    expect(encoded).not.toBeNull();
    expect(copied).toContain("/s/student-share-token/roadmap?c=2028&s=");
  });
});
