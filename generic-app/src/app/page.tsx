import Link from "next/link";
import { ArrowRight, ListChecks, Share2, Upload } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import Footer from "@/components/Footer";

const flow = [
  {
    icon: Upload,
    title: "편제표 업로드",
    desc: "한글·PDF 편제표를 그대로 올립니다.",
  },
  {
    icon: ListChecks,
    title: "과목·선택군 검토·수정",
    desc: "약 55초면 AI가 과목을 정리합니다. 택N·집중이수만 확인하면 됩니다.",
  },
  {
    icon: Share2,
    title: "학생 공유 링크 발행",
    desc: "학생이 바로 쓰는 안내 페이지 링크가 만들어집니다.",
  },
];

const benefits = [
  {
    title: "진로별 맞춤 추천",
    desc: "학생이 관심 분야·학과를 고르면 진로에 맞는 과목을 추천하고, 우리 학교 개설 여부를 함께 표시합니다.",
  },
  {
    title: "학기별 3년 수강 로드맵",
    desc: "추천 과목을 학기별 로드맵에 담아 실현 가능한 3년 계획을 학생이 직접 완성합니다.",
  },
  {
    title: "상담 자료 공유·저장",
    desc: "완성한 로드맵을 공유 링크와 이미지로 저장해 상담 자료로 바로 활용합니다.",
  },
];

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/create"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--cta)] px-6 py-3 text-sm font-semibold text-[var(--cta-foreground)] shadow-sm transition hover:brightness-95 ${className}`}
    >
      <Upload className="h-4 w-4" />
      편제표 올리고 시작하기
    </Link>
  );
}

function SecondaryCta() {
  return (
    <Link
      href="/guide"
      className="inline-flex items-center gap-1 px-2 py-3 text-sm font-semibold text-[var(--primary)] transition hover:underline"
    >
      사용법 둘러보기
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* S0. 브랜드 바 */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
        <BrandLogo size="lg" />
        <Link
          href="/guide"
          className="text-sm font-medium text-[var(--primary)] transition hover:underline"
        >
          사용법 둘러보기
        </Link>
      </header>

      {/* S1. 히어로 */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-14 pt-16 text-center sm:pt-24">
        <p className="text-sm font-semibold text-[var(--primary)]">
          학교 편제표 업로드 기반
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
          편제표 한 장으로,
          <br />
          진로 맞춤 추천과
          <br />
          3년 로드맵을 제공합니다
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-700">
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
      </section>

      {/* S2. 3단계 흐름 */}
      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <ol className="grid gap-4 sm:grid-cols-3">
          {flow.map((s, i) => (
            <li
              key={s.title}
              className="rounded-xl border border-[var(--border)] bg-white p-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-xs font-semibold text-slate-400">
                STEP {i + 1}
              </p>
              <h3 className="mt-0.5 text-sm font-bold">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* S3. 차별점 한 줄 띠 */}
      <section className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
        <p className="text-lg font-bold leading-8 sm:text-xl">
          일반 진로검사가 아니라,{" "}
          <span className="text-[var(--primary)]">
            우리 학교가 실제 개설한 과목
          </span>
          으로 짜는 로드맵입니다.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          어디서나 보는 과목 백과가 아니라, 업로드한 편제표 그대로의 개설 과목만으로
          학생이 로드맵을 완성합니다.
        </p>
      </section>

      {/* S4. 학생이 받는 것 */}
      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        <h2 className="text-center text-sm font-semibold text-[var(--primary)]">
          학생이 받는 것
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {benefits.map((b) => (
            <article
              key={b.title}
              className="rounded-xl border border-[var(--border)] bg-white p-5"
            >
              <h3 className="text-sm font-bold text-slate-950">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* S5. 마무리 CTA */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <p className="text-xl font-bold sm:text-2xl">
          편제표 한 번 올려두면, 나머지는 학생이 합니다.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <PrimaryCta />
          <SecondaryCta />
        </div>
      </section>

      <Footer />
    </main>
  );
}
