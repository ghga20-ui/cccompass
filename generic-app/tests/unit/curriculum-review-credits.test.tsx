import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurriculumReviewForm } from "@/components/curriculum/CurriculumReviewForm";
import type { SchoolCurriculum } from "@/lib/curriculum/schema";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const curriculum: SchoolCurriculum = {
  schoolName: "학점 검토 테스트", cohorts: [{ entranceYear: "2028", label: "2028 입학생", grades: [{
    grade: 2, semesters: [{ semester: 1, requiredSubjects: [{ name: "정보", credits: 4 }], choiceGroups: [{
      id: "choice", label: "가변 선택", choose: 1, minChoose: 1, maxChoose: 2,
      subjects: [{ name: "문학", credits: 2 }, { name: "경제", credits: 4 }],
    }] }],
  }] }],
};
function renderReview(data = curriculum) {
  return render(<CurriculumReviewForm draftId="credit-audit" editToken="synthetic-edit" initialCurriculum={data} />);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("teacher review option credits", () => {
  it("shows the attainable semester range rather than the first option's minimum only", () => {
    renderReview();
    expect(screen.getByText("학점 합계 약 6~10학점")).toBeInTheDocument();
    expect(screen.getByText("과목별 2~4학점")).toBeInTheDocument();
  });

  it("allows editing one option's credit without overwriting its siblings and saves it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "credit-audit" }));
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.change(screen.getByLabelText("경제 학점"), { target: { value: "5" } });
    expect(screen.getByLabelText("문학 학점")).toHaveValue(2);
    expect(screen.getByText("학점 합계 약 6~11학점")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("교육과정 초안을 저장했습니다.");
    const saved = JSON.parse(fetchMock.mock.calls[0][1].body).curriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0];
    expect(saved.subjects.map((s: { credits: number }) => s.credits)).toEqual([2, 5]);
    expect(saved).not.toHaveProperty("creditsEach");
  });

  it("can correct a uniform parsed group to per-option credits without silently changing effective credits", () => {
    const data = structuredClone(curriculum);
    data.cohorts[0].grades[0].semesters[0].choiceGroups[0].creditsEach = 3;
    renderReview(data);
    fireEvent.click(screen.getByRole("button", { name: "과목별로 수정" }));
    expect(screen.getByLabelText("문학 학점")).toHaveValue(3);
    expect(screen.getByLabelText("경제 학점")).toHaveValue(3);
    fireEvent.change(screen.getByLabelText("경제 학점"), { target: { value: "4" } });
    expect(screen.getByText("학점 합계 약 7~11학점")).toBeInTheDocument();
  });

  it("persists a deliberate bulk override consistently across mixed option credits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "credit-audit" }));
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.change(screen.getByLabelText("가변 선택 과목당 학점"), { target: { value: "3" } });
    expect(screen.getByText("학점 합계 약 7~10학점")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("교육과정 초안을 저장했습니다.");
    const saved = JSON.parse(fetchMock.mock.calls[0][1].body).curriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0];
    expect(saved.creditsEach).toBe(3);
    expect(saved.subjects.map((s: { credits: number }) => s.credits)).toEqual([3, 3]);
  });

  it("keeps an explicit group credit override authoritative and applies bulk changes", () => {
    const data = structuredClone(curriculum);
    data.cohorts[0].grades[0].semesters[0].choiceGroups[0].creditsEach = 3;
    renderReview(data);
    expect(screen.getByText("학점 합계 약 7~10학점")).toBeInTheDocument();
    expect(screen.queryByLabelText("경제 학점")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("가변 선택 과목당 학점"), { target: { value: "4" } });
    expect(screen.getByText("학점 합계 약 8~12학점")).toBeInTheDocument();
  });
});
