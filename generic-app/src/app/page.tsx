import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  Map,
  Share2,
  Target,
  Upload,
} from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import Footer from "@/components/Footer";

const stats = [
  { value: "6종", label: "편제표 형식 지원" },
  { value: "약 1분", label: "AI가 과목·선택군 자동 정리" },
  { value: "3년", label: "학기별 수강 로드맵" },
];

const flow = [
  {
    icon: Upload,
    title: "편제표 업로드",
    desc: "한글·PDF 편제표를 그대로 올립니다.",
  },
  {
    icon: ListChecks,
    title: "과목·선택군 검토·수정",
    desc: "약 1분이면 AI가 과목을 정리합니다. 택N·집중이수만 확인하면 됩니다.",
  },
  {
    icon: Share2,
    title: "학생 공유 링크 발행",
    desc: "학생이 바로 쓰는 안내 페이지 링크가 만들어집니다.",
  },
];

const benefits = [
  {
    icon: Target,
    title: "진로별 맞춤 추천",
    desc: "학생이 관심 분야·학과를 고르면 진로에 맞는 과목을 추천하고, 우리 학교 개설 여부를 함께 표시합니다.",
    tint: "bg-[var(--secondary)]",
    iconColor: "text-[var(--primary)]",
  },
  {
    icon: Map,
    title: "학기별 3년 수강 로드맵",
    desc: "추천 과목을 학기별 로드맵에 담아 실현 가능한 3년 계획을 학생이 직접 완성합니다.",
    tint: "bg-orange-50",
    iconColor: "text-[var(--cta)]",
  },
  {
    icon: Share2,
    title: "상담 자료 공유·저장",
    desc: "완성한 로드맵을 공유 링크와 이미지로 저장해 상담 자료로 바로 활용합니다.",
    tint: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
];

/** 배경 장식용 컴퍼스 로즈 + 방위 그리드 (currentColor로 색 상속). */
function CompassMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="1">
        <circle cx="200" cy="200" r="72" opacity="0.5" />
        <circle cx="200" cy="200" r="120" opacity="0.35" />
        <circle cx="200" cy="200" r="168" opacity="0.22" />
        <circle cx="200" cy="200" r="196" opacity="0.12" />
        <line x1="200" y1="6" x2="200" y2="394" opacity="0.22" />
        <line x1="6" y1="200" x2="394" y2="200" opacity="0.22" />
        <line x1="62" y1="62" x2="338" y2="338" opacity="0.1" />
        <line x1="338" y1="62" x2="62" y2="338" opacity="0.1" />
      </g>
      <path
        d="M200 42 L213 187 L262 200 L213 213 L200 358 L187 213 L138 200 L187 187 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M200 42 L213 187 L200 200 L187 187 Z"
        fill="currentColor"
        opacity="0.24"
      />
    </svg>
  );
}

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/create"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--cta)] px-6 py-3 text-sm font-semibold text-[var(--cta-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 ${className}`}
    >
      <Upload className="h-4 w-4" />
      편제표 올리고 시작하기
    </Link>
  );
}

function SecondaryCta({ tone = "primary" }: { tone?: "primary" | "onDark" }) {
  const color =
    tone === "onDark"
      ? "text-white/90 hover:text-white"
      : "text-[var(--primary)] hover:underline";
  return (
    <Link
      href="/guide"
      className={`inline-flex items-center gap-1 px-2 py-3 text-sm font-semibold transition ${color}`}
    >
      사용법 둘러보기
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* S0. 브랜드 바 */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
        <BrandLogo size="lg" markClassName="compass-settle" />
        <Link
          href="/guide"
          className="whitespace-nowrap text-sm font-medium text-[var(--primary)] transition hover:underline"
        >
          사용법 둘러보기
        </Link>
      </header>

      {/* S1. 히어로 */}
      <section className="relative overflow-hidden">
        <CompassMotif className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-[58%] text-[var(--primary)] opacity-[0.07]" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-16 text-center sm:pt-24">
          <Reveal>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--primary)] backdrop-blur">
              학교 편제표 업로드 기반
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              편제표 <span className="text-[var(--cta)]">한 장</span>으로,
              <br />
              진로 맞춤 추천과
              <br />
              <span className="text-[var(--primary)]">3년 로드맵</span>을 제공합니다
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-700 sm:text-lg">
              우리 학교가 실제로 개설한 과목으로, 학생 한 명 한 명에게 진로에 맞는
              과목을 추천하고 3년 수강 로드맵을 그려줍니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PrimaryCta />
              <SecondaryCta />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              PDF · HWP · HWPX · 엑셀 · 워드 · 5MB
            </p>
          </Reveal>
        </div>
      </section>

      {/* S2. 숫자 스탯 밴드 */}
      <section className="border-y border-[var(--primary)]/10 bg-[var(--secondary)]">
        <Reveal className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-2 px-6 py-7 sm:py-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-2xl text-[var(--primary)] sm:text-4xl"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">
                {s.label}
              </p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* S3. 3단계 흐름 */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <Reveal className="text-center">
          <h2 className="text-sm font-semibold text-[var(--primary)]">
            이렇게 만들어집니다
          </h2>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            업로드 한 번이면 끝
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {flow.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="group h-full rounded-2xl border border-[var(--border)] bg-white p-6 transition hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--secondary)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                  <s.icon className="h-5 w-5" />
                </span>
                <p
                  className="mt-4 text-sm text-[var(--primary)]"
                  style={{ fontFamily: "var(--font-brand)" }}
                >
                  STEP {i + 1}
                </p>
                <h3 className="mt-0.5 text-base font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* S4. 차별점 — 딥블루 풀블리드 블록 */}
      <section className="relative overflow-hidden bg-[var(--primary)] text-white">
        <CompassMotif className="pointer-events-none absolute -right-20 top-1/2 h-[420px] w-[420px] -translate-y-1/2 text-white opacity-10" />
        <Reveal className="relative mx-auto w-full max-w-3xl px-6 py-16 text-center sm:py-20">
          <p className="text-2xl font-bold leading-snug sm:text-3xl">
            일반 진로검사가 아닙니다.
            <br />
            <span className="text-[var(--cta)]">우리 학교가 실제 개설한 과목</span>
            으로 짜는 로드맵입니다.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
            어디서나 보는 과목 백과가 아니라, 업로드한 편제표 그대로의 개설
            과목만으로 학생이 실현 가능한 로드맵을 완성합니다.
          </p>
        </Reveal>
      </section>

      {/* S5. 학생이 받는 것 — 틴트 카드 */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <Reveal className="text-center">
          <h2 className="text-sm font-semibold text-[var(--primary)]">
            학생이 받는 것
          </h2>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            탐색부터 상담 자료까지 한 번에
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 90}>
              <article
                className={`h-full rounded-2xl border border-black/[0.04] ${b.tint} p-6 transition hover:-translate-y-1 hover:shadow-md`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ${b.iconColor}`}
                >
                  <b.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-950">
                  {b.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{b.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* S6. 마무리 CTA */}
      <section className="relative overflow-hidden border-t border-[var(--primary)]/10 bg-[var(--secondary)]">
        <CompassMotif className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 text-[var(--primary)] opacity-[0.06]" />
        <Reveal className="relative mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">
            편제표 한 번 올려두면,
            <br className="sm:hidden" /> 나머지는 학생이 합니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCta />
            <SecondaryCta />
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
