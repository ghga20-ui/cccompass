"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTutorial } from "./useTutorial";
import type { ArrowDir, TutorialDef } from "./types";

type Rect = { left: number; top: number; width: number; height: number };

const ARROW_ICON: Record<Exclude<ArrowDir, "none">, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
};

export function TutorialPlayer({ def }: { def: TutorialDef }) {
  const t = useTutorial(def);
  const { step, ui, setUi, handleTargetClick } = t;
  const casual = def.voice === "casual";

  const stageRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!step.target || step.target === "none") {
      setRect(null);
      return;
    }
    const el = stage.querySelector<HTMLElement>(
      `[data-tut-target="${step.target}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setRect({
      left: r.left - s.left,
      top: r.top - s.top,
      width: r.width,
      height: r.height,
    });
  }, [step.target]);

  // 스텝/화면 전환과 리사이즈 시 타깃 위치 재측정(렌더 후 DOM 측정 → 의도된 setState).
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    const id = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(id);
  }, [measure, step.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // 키보드 내비게이션(설명형 스텝 한정 진행, 항상 이전 가능).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") t.goPrev();
    if ((e.key === "ArrowRight" || e.key === "Enter") && !step.interactive)
      t.goNext();
  };

  const Screen = def.screenComponents[step.screen];
  const ringColor = step.interactive
    ? "ring-[var(--cta)]"
    : "ring-[var(--primary)]";

  return (
    <div
      className="mx-auto w-full max-w-3xl outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="인터랙티브 튜토리얼"
    >
      {/* 진행 점 + 카운터 */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          {def.steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${i + 1}단계: ${s.title}`}
              onClick={() => t.goTo(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === t.stepIndex
                  ? "w-6 bg-[var(--cta)]"
                  : i < t.stepIndex
                    ? "w-2 bg-[var(--primary)]/60"
                    : "w-2 bg-border",
              )}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {t.stepIndex + 1} / {t.total}
        </span>
      </div>

      {/* 스테이지: 모의 프레임 + 스포트라이트 오버레이 */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--background)] shadow-sm">
        {/* 브라우저/디바이스 크롬 */}
        <div className="flex items-center gap-1.5 border-b border-border bg-white px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 truncate text-xs text-muted-foreground">
            {casual ? "학생 안내 페이지 (예시)" : "커리컴퍼스"}
          </span>
        </div>

        <div
          ref={stageRef}
          className="relative min-h-[400px] p-4 sm:min-h-[440px] sm:p-6"
        >
          {Screen ? (
            <Screen
              screen={step.screen}
              ui={ui}
              setUi={setUi}
              onTargetClick={handleTargetClick}
              activeTarget={step.target}
              interactive={step.interactive}
            />
          ) : null}

          {/* 스포트라이트 + 화살표 (오버레이, 클릭은 통과) */}
          {rect ? (
            <div className="pointer-events-none absolute inset-0 z-20">
              <div
                className={cn("absolute rounded-xl ring-2", ringColor)}
                style={{
                  left: rect.left - 4,
                  top: rect.top - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                  boxShadow: "0 0 0 2000px rgba(15, 23, 42, 0.42)",
                }}
              />
              <SpotArrow dir={step.arrow} rect={rect} />
            </div>
          ) : null}
        </div>
      </div>

      {/* 코치 패널 */}
      <div className="mt-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
              step.interactive ? "bg-[var(--cta)]" : "bg-[var(--primary)]",
            )}
          >
            {t.stepIndex + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              {step.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {step.coachTip}
            </p>
            {step.interactive && !t.isLast ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--cta)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--cta)]">
                <MousePointerClick className="h-3.5 w-3.5" />
                {casual
                  ? "강조된 곳을 직접 눌러도 넘어가"
                  : "강조된 곳을 직접 눌러도 다음으로 넘어가요"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={t.goPrev}
            disabled={t.isFirst}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>

          {t.isLast ? (
            <Button type="button" variant="cta" size="sm" onClick={t.restart}>
              <RotateCcw className="h-4 w-4" />
              처음부터
            </Button>
          ) : (
            <Button type="button" variant="cta" size="sm" onClick={t.goNext}>
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SpotArrow({ dir, rect }: { dir: ArrowDir; rect: Rect }) {
  if (dir === "none") return null;
  const Icon = ARROW_ICON[dir];
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const pos: Record<Exclude<ArrowDir, "none">, { left: number; top: number }> = {
    down: { left: cx, top: rect.top - 30 },
    up: { left: cx, top: rect.top + rect.height + 8 },
    left: { left: rect.left + rect.width + 8, top: cy },
    right: { left: rect.left - 30, top: cy },
  };
  const p = pos[dir];
  return (
    <span
      className="absolute z-30 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-bounce items-center justify-center rounded-full bg-[var(--cta)] text-white shadow-md"
      style={{ left: p.left, top: p.top }}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
