import { cn } from "@/lib/utils";

/**
 * 과목나침반 심볼 — 나침반 바늘(N=진한 색, S=옅은 색) + 외곽 링.
 * currentColor를 쓰므로 부모 text 색을 따라간다(기본 사용처는 primary 블루).
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
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="0.5 4.2" strokeLinecap="round" opacity="0.55" />
      {/* 바늘 북쪽(진한 색) */}
      <path d="M16 4.5 L19.2 16 L16 14.3 L12.8 16 Z" fill="currentColor" />
      {/* 바늘 남쪽(옅은 색) */}
      <path d="M16 27.5 L12.8 16 L16 17.7 L19.2 16 Z" fill="currentColor" opacity="0.3" />
      {/* 중심 허브 */}
      <circle cx="16" cy="16" r="2" fill="white" stroke="currentColor" strokeWidth="1.6" />
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
  const wordSize = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CompassMark className={cn(markSize, "text-[var(--primary)]", markClassName)} />
      <span className={cn(wordSize, "font-bold tracking-tight text-foreground", wordClassName)}>
        과목나침반
      </span>
    </span>
  );
}
