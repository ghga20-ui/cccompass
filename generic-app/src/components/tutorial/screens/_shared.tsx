import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MockScreenProps } from "../types";

/**
 * 모의 화면의 "강조/클릭 가능 요소"에 다는 공용 props.
 * - data-tut-target: 엔진이 위치를 측정하고 스포트라이트를 띄울 키
 * - onClick: interactive 스텝에서 이 키가 현재 타깃이면 다음으로 진행
 */
export function hot(key: string, p: MockScreenProps) {
  return {
    "data-tut-target": key,
    onClick: () => p.onTargetClick(key),
  } as const;
}

/** 강조된 타깃에 부드러운 손가락 커서를 주기 위한 클래스 헬퍼. */
export function hotClass(key: string, p: MockScreenProps) {
  return p.activeTarget === key ? "cursor-pointer" : "";
}

/** 작은 라벨 칩. */
export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "cta" | "green";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-[var(--secondary)] text-[var(--primary)]",
    cta: "bg-[var(--cta)]/12 text-[var(--cta)]",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 추천 배지(오렌지). */
export function RecBadge() {
  return <Chip tone="cta">추천</Chip>;
}
