"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 스크롤 진입 시 페이드+업으로 나타나는 래퍼.
 * 견고성: SSR/초기 렌더는 '보이는' 상태(idle)라 JS 없거나 관찰자 미동작 시에도
 * 콘텐츠가 숨겨지지 않는다. 클라이언트 마운트 시 '화면 밖' 요소만 잠깐 숨겼다가
 * 스크롤로 등장시킨다(화면 안 요소는 애니메이션 없이 즉시 표시).
 * reduced-motion이면 globals.css `.reveal` 오버라이드 + 여기서 idle 유지로 즉시 표시.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || typeof IntersectionObserver === "undefined") return; // 보이는 채로 유지

    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.85;
    if (!belowFold) return; // 이미 화면 안 → 애니메이션 없이 즉시 표시

    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: state === "shown" ? `${delay}ms` : "0ms" }}
      className={cn(
        "reveal transition-all duration-500 ease-out",
        state === "hidden"
          ? "translate-y-5 opacity-0"
          : "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
