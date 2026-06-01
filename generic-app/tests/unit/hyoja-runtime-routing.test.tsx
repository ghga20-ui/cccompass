import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CohortProvider,
  useCohort,
} from "@/contexts/CohortContext";
import {
  HyojaRuntimeProvider,
  useHyojaRuntime,
} from "@/contexts/HyojaRuntimeContext";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";
import { createSubjectCatalog } from "@/lib/hyoja/subject-catalog";
import {
  buildCurrentPath,
  buildShareHref,
  buildSubjectDetailHref,
  getInternalReturnPath,
} from "@/lib/hyoja/share-routes";

const schoolData: StudentSchoolData = {
  schoolName: "Sample High School",
  cohorts: {
    "2024": {
      label: "2024 entrance",
      description: "Sample High School 2024 entrance",
      designated: [],
      selections: [],
    },
    "2028-fall": {
      label: "2028 fall",
      description: "Sample High School 2028 fall",
      designated: [],
      selections: [],
    },
  },
};

afterEach(() => {
  cleanup();
});

function CohortProbe() {
  const { cohort, cohortLabel } = useCohort();
  return (
    <output>
      {cohort}:{cohortLabel}
    </output>
  );
}

function RuntimeProbe() {
  const runtime = useHyojaRuntime();
  return (
    <output>
      {runtime.shareToken}:{runtime.basePath}:{runtime.schoolData.schoolName}
    </output>
  );
}

describe("Hyoja runtime routing", () => {
  it("builds share-token-prefixed Hyoja routes", () => {
    const basePath = "/s/student-share-token";

    expect(buildShareHref(basePath, "/")).toBe("/s/student-share-token");
    expect(buildShareHref(basePath, "/recommend", { dept: "간호학과" })).toBe(
      "/s/student-share-token/recommend?dept=%EA%B0%84%ED%98%B8%ED%95%99%EA%B3%BC",
    );
    expect(buildShareHref(basePath, "/roadmap")).toBe(
      "/s/student-share-token/roadmap",
    );
    expect(buildShareHref(basePath, "/subjects")).toBe(
      "/s/student-share-token/subjects",
    );
    expect(
      buildSubjectDetailHref(
        "korean_literature",
        "/s/student-share-token/roadmap?grade=2",
        basePath,
      ),
    ).toBe(
      "/s/student-share-token/subjects/korean_literature?from=%2Fs%2Fstudent-share-token%2Froadmap%3Fgrade%3D2",
    );
    expect(buildCurrentPath("/s/student-share-token/subjects", "q=문학")).toBe(
      "/s/student-share-token/subjects?q=문학",
    );
  });

  it("rejects unsafe subject return paths", () => {
    const basePath = "/s/student-share-token";

    expect(getInternalReturnPath("https://evil.test", basePath)).toBe(
      "/s/student-share-token/subjects",
    );
    expect(getInternalReturnPath("//evil.test/path", basePath)).toBe(
      "/s/student-share-token/subjects",
    );
    expect(getInternalReturnPath("/s/other-token/subjects", basePath)).toBe(
      "/s/student-share-token/subjects",
    );
    expect(getInternalReturnPath("/admin", basePath)).toBe(
      "/s/student-share-token/subjects",
    );
    expect(
      getInternalReturnPath("/s/student-share-token/roadmap?grade=2", basePath),
    ).toBe("/s/student-share-token/roadmap?grade=2");
  });

  it("provides dynamic runtime and initializes cohort from public data", () => {
    render(
      <HyojaRuntimeProvider
        shareToken="student-share-token"
        schoolData={schoolData}
        subjectCatalog={createSubjectCatalog(schoolData)}
      >
        <CohortProvider
          cohorts={[
            { entranceYear: "2024", label: "2024 entrance" },
            { entranceYear: "2028-fall", label: "2028 fall" },
          ]}
        >
          <RuntimeProbe />
          <CohortProbe />
        </CohortProvider>
      </HyojaRuntimeProvider>,
    );

    expect(
      screen.getByText(
        "student-share-token:/s/student-share-token:Sample High School",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2024:2024 entrance")).toBeInTheDocument();
  });
});
