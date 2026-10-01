import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurriculumReviewForm } from "@/components/curriculum/CurriculumReviewForm";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

function renderReview() {
  render(<CurriculumReviewForm draftId="draft-test" editToken="edit-test" initialCurriculum={{
    schoolName: "테스트고등학교",
    cohorts: [{ entranceYear: "2027", label: "2027 입학생", grades: [{
      grade: 1, semesters: [{ semester: 1, requiredSubjects: [{ name: "공통국어1", credits: 3 }], choiceGroups: [] }],
    }] }],
  }} />);
}

function challenge(status = 403) {
  return new Response("<html>Vercel Security Checkpoint</html>", {
    status, headers: { "x-vercel-mitigated": "challenge", "Content-Type": "text/html" },
  });
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("curriculum review browser challenge recovery", () => {
  it("locks editing while a save is in flight so the saved notice cannot cover unsent edits", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    renderReview();
    fireEvent.change(screen.getByLabelText("학교명"), { target: { value: "저장할 학교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByLabelText("학교명")).toBeDisabled();
    expect(screen.getByLabelText("공통국어1 학점")).toBeDisabled();
    finish(Response.json({ id: "draft-test" }));
    await screen.findByText("교육과정 초안을 저장했습니다.");
    expect(screen.getByLabelText("학교명")).toBeEnabled();
    expect(screen.getByLabelText("학교명")).toHaveValue("저장할 학교");
  });

  it("keeps edits locked through both saving and publishing responses", async () => {
    let finishSave!: (response: Response) => void;
    let finishPublish!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishSave = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishPublish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "학생에게 게시" }));
    expect(screen.getByLabelText("학교명")).toBeDisabled();
    finishSave(Response.json({ id: "draft-test" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("학교명")).toBeDisabled();
    finishPublish(Response.json({ manageUrl: "/published/draft-test?editToken=edit-test" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/published/draft-test?editToken=edit-test"));
    expect(screen.getByLabelText("학교명")).toBeEnabled();
  });

  it.each([403, 429])("preserves edits and retries saving after a %s challenge", async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(challenge(status)).mockResolvedValueOnce(Response.json({ id: "draft-test" }));
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.change(screen.getByLabelText("학교명"), { target: { value: "수정한고등학교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const link = await screen.findByRole("link", { name: "브라우저 확인하기 (새 탭)" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("alert")).toHaveTextContent("입력 내용은 이 화면에 유지됩니다");
    expect(screen.getByLabelText("학교명")).toHaveValue("수정한고등학교");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("교육과정 초안을 저장했습니다.");
    expect(screen.queryByRole("link", { name: "브라우저 확인하기 (새 탭)" })).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).curriculum.schoolName).toBe("수정한고등학교");
    expect(fetchMock.mock.calls[1][1].headers["x-edit-token"]).toBe("edit-test");
  });

  it("does not publish when the preceding save is challenged", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(challenge());
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "학생에게 게시" }));
    await screen.findByRole("link", { name: "브라우저 확인하기 (새 탭)" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("also offers recovery when publishing is challenged after saving", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(challenge());
    vi.stubGlobal("fetch", fetchMock);
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "학생에게 게시" }));
    await screen.findByRole("link", { name: "브라우저 확인하기 (새 탭)" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "학생에게 게시" })).toBeEnabled());
  });

  it("keeps ordinary API errors distinct from browser challenges", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 })));
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("초안을 찾을 수 없습니다.");
    expect(screen.queryByRole("link", { name: "브라우저 확인하기 (새 탭)" })).not.toBeInTheDocument();
  });
});
