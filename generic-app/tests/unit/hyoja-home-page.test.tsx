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
  },
};

function renderHome() {
  return render(
    <HyojaRuntimeProvider shareToken="student-share-token" schoolData={schoolData}>
      <CohortProvider
        cohorts={[
          { entranceYear: "2026", label: "2026 entrance" },
          { entranceYear: "2024", label: "2024 entrance" },
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

    fireEvent.click(screen.getByRole("button", { name: "보건·의료" }));
    fireEvent.click(screen.getByRole("button", { name: /맞춤 과목 추천받기/ }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/s/student-share-token/recommend?interests=health-medical",
    );
  });

  it("does not offer grade-one-only cohorts", () => {
    renderHome();

    expect(screen.getByText("2026 entrance")).toBeInTheDocument();
    expect(screen.getByText("2024 entrance")).toBeInTheDocument();
    expect(screen.queryByText("2025 grade-one-only")).not.toBeInTheDocument();
    expect(screen.queryByText("Grade 1 Hidden")).not.toBeInTheDocument();
  });
});
