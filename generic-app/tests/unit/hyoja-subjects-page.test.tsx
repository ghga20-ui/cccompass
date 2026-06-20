import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
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

// 새 정책: 편제에 존재하는 모든 학년·학기를 노출한다(1학년도 데이터가 있으면 보여준다).
// 옛 효자고 정책(grade>=2)에서는 숨겼을 1학년 데이터를 fixture에 넣어,
// 1학년 과목/선택군이 과목 탐색·상세에서 정상 노출되는지 검증한다.
const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2026": {
      label: "2026 entrance",
      description: "Sample High School 2026 entrance",
      designated: [
        // 1학년 지정 과목 — 새 정책에서는 1학년도 그대로 노출되어야 한다.
        { subject: "통합사회", area: "사회", category: "공통", credits: 4, grade: 1, semester: 1 },
        { subject: "문학", area: "국어", category: "일반선택", credits: 4, grade: 2, semester: 1 },
      ],
      selections: [
        {
          id: "2026-1-1-choice-a",
          label: "Grade 1 Choice",
          grade: 1,
          semester: 1,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          // 1학년 선택군 과목 — Robotics Lab은 1·2학년 모두에서 열린다.
          options: ["Robotics Lab"],
        },
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
  it("lists subjects from every grade in the edition with fallback metadata", () => {
    renderWithRuntime(<SubjectsPage />);

    // 일반선택 과목은 그대로 보인다.
    expect(screen.getByText("문학")).toBeInTheDocument();
    // 편제 선택군에서 온 업로드 과목도 fallback 메타데이터로 카탈로그에 노출된다.
    expect(screen.getByText("Robotics Lab")).toBeInTheDocument();

    // 새 정책: 1학년 데이터도 숨기지 않고 노출한다.
    // (옛 정책이라면 1학년 선택군 과목인 Robotics Lab도 1학년 지정 과목도 빠졌을 것)
    // Robotics Lab 카드는 업로드 fallback 과목 상세 페이지로 연결되어야 한다.
    // getByRole("link", …)은 전체 카탈로그의 접근성 이름 계산으로 매우 느리므로,
    // 과목명 노드에서 가장 가까운 <a>를 직접 집어 href를 검증한다.
    const roboticsLink = screen.getByText("Robotics Lab").closest("a");
    expect(roboticsLink).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/subjects/uploaded-robotics-lab-"),
    );

    // 학년 안내 문구도 1·2학년을 모두 포함해야 한다(모든 학년 노출).
    expect(screen.getByText(/1·2학년에 열리는/)).toBeInTheDocument();
  });

  it("shows every grade a subject is offered in the detail page and keeps the back link internal", () => {
    // 외부 URL을 from으로 넘겨도 목록 복귀 링크는 내부 경로로 강제되어야 한다(보안).
    mocks.searchParams = new URLSearchParams({ from: "https://evil.test" });
    mocks.pathname = "/s/student-share-token/subjects/uploaded-robotics-lab";

    const fallbackId = createSubjectCatalog(schoolData).getSubjectByName(
      "Robotics Lab",
    )!.id;
    renderWithRuntime(<SubjectDetailPage params={{ id: fallbackId }} />);

    expect(screen.getByText("Robotics Lab")).toBeInTheDocument();

    // 새 정책: Robotics Lab은 1·2학년 모두에서 열리므로 두 학기가 모두 안내되어야 한다.
    // (옛 정책에서는 1학년 개설 정보를 숨겼다)
    expect(screen.getByText(/1\s*학년\s*1\s*학기/)).toBeInTheDocument();
    expect(screen.getByText(/2\s*학년\s*1\s*학기/)).toBeInTheDocument();

    // 헤더(목록 복귀 링크)는 외부 from URL을 거부하고 내부 과목 목록으로 향해야 한다.
    const banner = screen.getByRole("banner");
    const backLink = within(banner).getByRole("link");
    expect(backLink).toHaveAttribute(
      "href",
      "/s/student-share-token/subjects",
    );
  });
});
