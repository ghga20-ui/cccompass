import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareHomePage from "@/app/s/[shareToken]/page";
import { CohortProvider } from "@/contexts/CohortContext";
import { HyojaRuntimeProvider } from "@/contexts/HyojaRuntimeContext";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2026": {
      label: "2026 entrance",
      description: "Sample High School 2026 entrance",
      designated: [],
      selections: [],
    },
    "2024": {
      label: "2024 entrance",
      description: "Sample High School 2024 entrance",
      designated: [],
      selections: [],
    },
    // 새 정책: 1학년 데이터만 있는 입학연도도 그대로 노출된다.
    // (옛 효자고 grade>=2 정책에서는 숨겼던 cohort)
    "2025": {
      label: "2025 entrance",
      description: "Sample High School 2025 entrance",
      designated: [
        {
          subject: "통합과학",
          area: "과학",
          category: "공통",
          credits: 4,
          grade: 1,
          semester: 1,
        },
      ],
      selections: [],
    },
  },
};

function renderHome() {
  return render(
    <HyojaRuntimeProvider shareToken="student-share-token" schoolData={schoolData}>
      <CohortProvider
        cohorts={[
          { entranceYear: "2026", label: "2026 entrance" },
          { entranceYear: "2024", label: "2024 entrance" },
          { entranceYear: "2025", label: "2025 entrance" },
        ]}
      >
        <ShareHomePage />
      </CohortProvider>
    </HyojaRuntimeProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Hyoja share home page", () => {
  it("pushes Hyoja home CTA to share-token recommend route", () => {
    renderHome();

    fireEvent.change(screen.getByPlaceholderText(/학과를 검색/), {
      target: { value: "간호" },
    });
    fireEvent.click(screen.getByRole("button", { name: /간호학과/ }));
    fireEvent.click(screen.getByRole("button", { name: /맞춤 과목 추천받기/ }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/s/student-share-token/recommend?dept=%EA%B0%84%ED%98%B8%ED%95%99%EA%B3%BC",
    );
  });

  it("pushes interest CTA to share-token recommend route", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "간호/보건" }));
    fireEvent.click(screen.getByRole("button", { name: /맞춤 과목 추천받기/ }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/s/student-share-token/recommend?interests=nursing-health",
    );
  });

  it("offers every cohort present in the edition, including grade-one-only ones", () => {
    renderHome();

    // 입학연도 토글: cohort가 여러 개이므로 노출된다.
    expect(screen.getByText("입학 연도를 선택해줘")).toBeInTheDocument();

    // 편제에 존재하는 모든 입학연도가 그대로 노출된다.
    expect(screen.getByText("2026 entrance")).toBeInTheDocument();
    expect(screen.getByText("2024 entrance")).toBeInTheDocument();
    // 새 정책: 1학년 데이터만 있는 cohort도 숨기지 않고 노출한다.
    expect(screen.getByText("2025 entrance")).toBeInTheDocument();

    // 각 cohort의 입학연도 라벨도 함께 렌더링된다.
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });
});
