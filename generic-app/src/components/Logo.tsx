import { cn } from "@/lib/utils";

/**
 * 과목나침반 심볼 — 슬림한 4방위 컴퍼스 로즈. 북침만 오렌지(--cta)로 포인트,
 * 나머지는 currentColor(기본 사용처 primary 블루) + 가는 외곽 링 + 중심 허브.
 */
export function CompassMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="과목나침반"
      className={className}
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      {/* 4방위 별(컴퍼스 로즈) */}
      <path d="M16 3 L17.84 14.16 L24.5 16 L17.84 17.84 L16 29 L14.16 17.84 L7.5 16 L14.16 14.16 Z" fill="currentColor" />
      {/* 북침 — 오렌지 포인트 */}
      <path d="M16 3 L17.84 14.16 L16 16 L14.16 14.16 Z" fill="#F97316" />
      {/* 중심 허브 */}
      <circle cx="16" cy="16" r="1.9" fill="white" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** 심볼 + 워드마크("과목나침반") */
export function BrandLogo({
  size = "md",
  className,
  markClassName,
  wordClassName,
}: {
  size?: "md" | "lg";
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  const markSize = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const wordSize = size === "lg" ? "text-[1.7rem]" : "text-[1.35rem]";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CompassMark className={cn(markSize, "text-[var(--primary)]", markClassName)} />
      <span
        className={cn(wordSize, "leading-none tracking-tight text-foreground", wordClassName)}
        style={{ fontFamily: "var(--font-brand)" }}
      >
        과목나침반
      </span>
    </span>
  );
}
