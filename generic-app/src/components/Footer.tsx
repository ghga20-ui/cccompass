import Link from "next/link";
import { Mail } from "lucide-react";
import { CompassMark } from "@/components/Logo";

// 개발자(박세준) 문의: 메일 앱으로 ghga20@gmail.com 수신 + 제목·본문 템플릿 프리필
const CONTACT_HREF =
  "mailto:ghga20@gmail.com?subject=" +
  encodeURIComponent("[커리컴퍼스 문의]") +
  "&body=" +
  encodeURIComponent("학교명: \n문의 내용: \n");

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-border px-5 pb-28 pt-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2.5 text-center text-sm leading-relaxed text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CompassMark className="h-8 w-8 text-[var(--primary)]" />
          <span className="inline-flex items-baseline gap-1.5">
            <span
              className="text-2xl text-foreground/85"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              커리컴퍼스
            </span>
            <span
              className="text-sm font-semibold tracking-wide text-foreground/40"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              CurriCompass
            </span>
          </span>
        </span>
        <p className="-mt-1 text-xs text-foreground/45">과목나침반</p>
        <p className="text-base">학교 편제표 기반으로 선택과목 안내 화면을 제공합니다.</p>
        <p className="mt-1 text-base text-foreground/65">만든 이 · 효자고등학교 박세준</p>
        <a
          href={CONTACT_HREF}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-white px-3.5 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
        >
          <Mail className="h-4 w-4" />
          개발자에게 문의하기
        </a>
        <p className="text-xs text-foreground/45">문의·제안은 ghga20@gmail.com</p>
        <p className="mt-1 text-xs text-foreground/45">
          대입 반영과목 · 한국대학교육협의회 「2028학년도 권역별 대학별 권장과목」(2026.2.) — 필수 이수 기준이 아닌 참고자료
        </p>
        <p className="text-xs text-foreground/45">
          <Link href="/faq" className="underline underline-offset-2 hover:text-foreground/70">
            자주 묻는 질문 · 자료 출처 안내
          </Link>
        </p>
      </div>
    </footer>
  );
}
