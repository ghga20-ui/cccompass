import { CompassMark } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-border px-5 pb-28 pt-6">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CompassMark className="h-5 w-5 text-[var(--primary)]" />
          <span
            className="text-base text-foreground/80"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            과목나침반
          </span>
        </span>
        <p>학교 편제표 기반으로 선택과목 안내 화면을 제공합니다.</p>
        <p className="mt-1 text-foreground/60">만든 이 · 효자고등학교 박세준</p>
      </div>
    </footer>
  );
}
