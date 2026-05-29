import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[var(--primary)]">학교 편제표 업로드 도구</p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-6xl">
            우리 학교 선택과목 안내를 시작하세요
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              도우미 만들기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
