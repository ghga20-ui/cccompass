import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { CompassFilm } from "@/components/landing/CompassFilm";

vi.mock("@/components/landing/compass-film.module.css", () => ({ default: { section: "section", film: "film", srOnly: "srOnly" } }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("approved native landing film", () => {
  it("embeds the approved self-contained film with an accessible title", () => {
    render(<CompassFilm />);
    const frame = screen.getByTitle("커리컴퍼스 · 학교 과목 선택과 3년 계획 안내");
    expect(frame).toHaveAttribute("src", "/motion/cccompass-native-15s-v1.html");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(screen.getByText(/학교 편제표를 올리고/)).toBeInTheDocument();
  });
  it("sizes to its content and disconnects the resize observer on unmount", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = disconnect; });
    const view = render(<CompassFilm />);
    const frame = screen.getByTitle("커리컴퍼스 · 학교 과목 선택과 3년 계획 안내") as HTMLIFrameElement;
    frame.contentDocument!.appendChild(frame.contentDocument!.createElement("html")).appendChild(frame.contentDocument!.createElement("body"));
    Object.defineProperty(frame.contentDocument!.body, "getBoundingClientRect", { value: () => ({ height: 720 }) });
    fireEvent.load(frame);
    expect(frame.style.height).toBe("720px");
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it("ships native motion, embedded licensed fonts, and meaningful product copy without external runtime", () => {
    const html = readFileSync("public/motion/cccompass-native-15s-v1.html", "utf8");
    expect(html).toContain("const DURATION=15");
    expect(html).toContain("requestAnimationFrame");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("visibilitychange");
    expect(html).toContain("IntersectionObserver");
    expect(html).toContain("Embedded font licenses");
    expect(html).toContain("data:font/woff;base64,");
    expect(html).toContain("교사 검토 후 학생은 진로 관심에 맞는 과목을 추천받고");
    expect(html).not.toMatch(/<script[^>]+src=|https?:[^\s"']+\.(?:js|css)|\bgsap\b|\bTHREE\b/);
  });
});
