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

// 새 정책: 편제에 존재하는 모든 학년·학기를 노출한다(1학년도 데이터가 있으면 보여준다).
// 간호학과가 실제로 추천하는 과목들을 1학년/2학년 선택군에 배치해
// "모든 학년이 노출되고, 학교지정 과목만 추천에서 제외"되는지 검증한다.
const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2026": {
      label: "2026 entrance",
      description: "Sample High School 2026 entrance",
      designated: [
        // 학교지정(필수) 과목은 추천 목록에서 제외되어야 한다.
        {
          subject: "현대사회와 윤리",
          area: "사회",
          category: "일반선택",
          credits: 4,
          grade: 2,
          semester: 1,
        },
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
          // 1학년 선택군 — 새 정책에서는 1학년 데이터도 정상 노출되어야 한다.
          options: ["생명과학", "화학"],
        },
        {
          id: "2026-2-1-choice-a",
          label: "Grade 2 Choice",
          grade: 2,
          semester: 1,
          choose: 1,
          creditsEach: 3,
          totalCredits: 3,
          options: ["보건", "미적분Ⅱ"],
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
  it("renders department recommendations across every grade present in the curriculum", () => {
    renderRecommend();

    expect(screen.getByText("간호학과 추천 과목")).toBeInTheDocument();

    // 새 정책: 편제에 존재하는 모든 학년·학기를 노출한다.
    // 1학년 1학기 섹션도 데이터가 있으면 정상 노출되어야 한다.
    expect(
      screen.getByRole("heading", { name: "1학년 1학기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2학년 1학기" }),
    ).toBeInTheDocument();

    // 추천 과목 카드는 과목 상세 페이지로 연결되는 링크여야 한다.
    expect(screen.getByRole("link", { name: /생명과학/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/subjects/"),
    );
    // 추천 결과로 로드맵을 만드는 진입 링크가 존재해야 한다.
    expect(
      screen.getByRole("link", { name: /이 추천으로 로드맵 만들기/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/s/student-share-token/roadmap"),
    );
  });

  it("exposes grade-one subjects and excludes only school-designated subjects", () => {
    renderRecommend();

    // 1학년 선택군 과목(생명과학·화학)은 이제 정상 노출된다.
    expect(screen.getByText("생명과학")).toBeInTheDocument();
    expect(screen.getByText("화학")).toBeInTheDocument();
    // 2학년 선택군 과목도 노출된다.
    expect(screen.getByText("보건")).toBeInTheDocument();
    expect(screen.getByText("미적분Ⅱ")).toBeInTheDocument();

    // 새 정책: 추천에서 제외되는 것은 학교지정 과목뿐이다.
    // 현대사회와 윤리는 간호학과 추천 과목이지만 학교지정으로 등록되어 추천에서 빠져야 한다.
    expect(screen.queryByText("현대사회와 윤리")).not.toBeInTheDocument();
  });
});
