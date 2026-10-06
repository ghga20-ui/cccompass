import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreatePage from "@/app/create/page";

function filledForm() {
  const view = render(<CreatePage />);
  fireEvent.change(screen.getByLabelText(/학교명/), { target: { value: "공개 테스트 학교" } });
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["sample"], "test.xlsx")] } });
  return view.container.querySelector("form")!;
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

describe("upload readiness", () => {
  it("waits for preparation and submits once even if submit is repeated", async () => {
    let ready!: (response: Response) => void;
    const waiting = new Promise<Response>((resolve) => { ready = resolve; });
    const fetchMock = vi.fn((url: string) => url === "/api/warm" ? waiting : Promise.resolve(reply({ error: "분석 테스트 중단" }, 502)));
    vi.stubGlobal("fetch", fetchMock);
    const form = filledForm();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/curricula/upload")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "문서를 읽을 서버를 준비하고 있어요" })).toBeInTheDocument();
    await act(async () => { ready(reply({ ok: true, ready: true })); });
    await waitFor(() => expect(screen.getByText("분석 테스트 중단")).toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/curricula/upload")).toHaveLength(1);
  });

  it("keeps the selected file and does not upload after readiness fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ ok: false, ready: false }, 503)));
    const form = filledForm();
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText(/서버 준비를 확인하지 못했어요/)).toBeInTheDocument());
    expect(screen.getByText("test.xlsx")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => url === "/api/curricula/upload")).toBe(false);
    expect(screen.getByRole("button", { name: "업로드하고 분석하기" })).toBeEnabled();
  });
  it("does not send the document if the page closes while warming", async () => {
    let ready!: (response: Response) => void;
    const waiting = new Promise<Response>((resolve) => { ready = resolve; });
    const fetchMock = vi.fn((url: string) => url === "/api/warm" ? waiting : Promise.resolve(reply({ error: "unexpected" }, 502)));
    vi.stubGlobal("fetch", fetchMock);
    const form = filledForm();
    fireEvent.submit(form);
    cleanup();
    await act(async () => { ready(reply({ ok: true, ready: true })); });
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/curricula/upload")).toHaveLength(0);
  });

  it("keeps the upload locked after success while navigation is pending", async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(url === "/api/warm"
      ? reply({ ok: true, ready: true }) : reply({ reviewUrl: "#review" })));
    vi.stubGlobal("fetch", fetchMock);
    const form = filledForm();
    fireEvent.submit(form);
    await waitFor(() => expect(window.location.hash).toBe("#review"));
    expect(screen.getByRole("button", { name: "분석 중" })).toBeDisabled();
    fireEvent.submit(form);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/curricula/upload")).toHaveLength(1);
  });

  it("prepares on browsers without AbortSignal.any or timeout helpers", async () => {
    vi.stubGlobal("AbortSignal", {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ ok: true, ready: true })));
    expect(() => filledForm()).not.toThrow();
  });

});
