import { CompassMark } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-border px-5 pb-28 pt-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2.5 text-center text-sm leading-relaxed text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CompassMark className="h-8 w-8 text-[var(--primary)]" />
          <span
            className="text-2xl text-foreground/85"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            과목나침반
          </span>
        </span>
        <p className="text-base">학교 편제표 기반으로 선택과목 안내 화면을 제공합니다.</p>
        <p className="mt-1 text-base text-foreground/65">만든 이 · 효자고등학교 박세준</p>
      </div>
    </footer>
  );
}
