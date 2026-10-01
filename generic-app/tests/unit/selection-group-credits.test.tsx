import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SelectionGroup from "@/components/SelectionGroup";

afterEach(cleanup);

describe("selection group credit labels", () => {
  const group = {
    id: "2026-2-1-choice",
    label: "선택",
    grade: 2,
    semester: 1,
    choose: 1,
    creditsEach: 2,
    totalCredits: 2,
    options: ["문학", "경제"],
  };

  it("shows differing option credits instead of a misleading uniform label", () => {
    render(<SelectionGroup
      group={{ ...group, optionCredits: { 문학: 2, 경제: 4 } }}
      selected={[]}
      onToggle={() => {}}
      getSubjectByName={() => undefined}
      basePath="/s/test"
    />);
    expect(screen.getByText("택1 / 과목별 2~4학점")).toBeInTheDocument();
    expect(screen.getByText("2학점")).toBeInTheDocument();
    expect(screen.getByText("4학점")).toBeInTheDocument();
    expect(screen.queryByText("택1 / 과목당 2학점")).not.toBeInTheDocument();
  });

  it("preserves the existing label for uniform groups", () => {
    render(<SelectionGroup
      group={group}
      selected={[]}
      onToggle={() => {}}
      getSubjectByName={() => undefined}
      basePath="/s/test"
    />);
    expect(screen.getByText("택1 / 과목당 2학점")).toBeInTheDocument();
  });
});
