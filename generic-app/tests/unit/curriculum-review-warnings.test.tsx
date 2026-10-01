import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findDraft: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { curriculumDraft: { findUnique: mocks.findDraft } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => { throw new Error("not found"); } }));
import ReviewPage from "@/app/review/[draftId]/page";
const draft = {
  editToken: "synthetic-review-token", warnings: ["원문에서 학기 구분이 모호합니다."], parsedText: "원문 표",
  curriculumJson: { schoolName: "테스트 학교", cohorts: [{ entranceYear: "2025", label: "2025 입학생", grades: [{
    grade: 2, semesters: [{ semester: 1, requiredSubjects: [{ name: "문학", credits: 3 }], choiceGroups: [] }],
  }] }] },
};
async function renderPage() {
  render(await ReviewPage({ params: Promise.resolve({ draftId: "synthetic-draft" }), searchParams: Promise.resolve({ editToken: draft.editToken }) }));
}
beforeEach(() => { mocks.findDraft.mockResolvedValue(structuredClone(draft)); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("curriculum teacher review warnings", () => {
  it("shows stored AI warnings instead of silently discarding them", async () => {
    await renderPage();
    expect(screen.getByRole("note", { name: "원문 및 분석 검토 사항" })).toHaveTextContent(draft.warnings[0]);
  });
  it("flags source non-offered annotations even when the AI returned no warnings", async () => {
    mocks.findDraft.mockResolvedValue({ ...draft, warnings: [], parsedText: '<table><tr><td>중국어</td><td>미개설</td></tr></table>' });
    await renderPage();
    expect(screen.getByRole("note", { name: "원문 및 분석 검토 사항" })).toHaveTextContent("미개설");
    expect(screen.getByRole("note", { name: "원문 및 분석 검토 사항" })).toHaveTextContent("학기별로 확인");
    // Caution only: no subject is deleted, reclassified or assigned to a guessed semester.
    expect(screen.getByDisplayValue("문학")).toBeInTheDocument();
  });
  it("handles a large malformed source without quadratic tag scanning", async () => {
    mocks.findDraft.mockResolvedValue({ ...draft, warnings: [], parsedText: "<".repeat(80000) + "미개설" });
    const started = performance.now();
    await renderPage();
    expect(screen.getByRole("note", { name: "원문 및 분석 검토 사항" })).toHaveTextContent("미개설");
    // Wide budget compared with normal render time; the former tag regex took several seconds.
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("does not introduce a warning for clean source without stored warnings", async () => {
    mocks.findDraft.mockResolvedValue({ ...draft, warnings: [], parsedText: "문학 3학점" });
    await renderPage();
    expect(screen.queryByRole("note", { name: "원문 및 분석 검토 사항" })).not.toBeInTheDocument();
  });
});
