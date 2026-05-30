import Link from "next/link";

const featureCards = [
  {
    title: "2·3학년 선택과목만 안내",
    description: "1학년 공통 과정은 학생 선택 흐름에서 제외하고, 실제 신청 대상인 2·3학년 편제만 사용합니다.",
  },
  {
    title: "학교별 맞춤 추천",
    description: "편제표에 있는 과목, 선택 묶음, 학점 조건을 바탕으로 진로·관심 분야별 추천 화면을 만듭니다.",
  },
  {
    title: "로드맵 공유와 저장",
    description: "학생은 추천 과목을 로드맵에 담고, 상담 자료로 공유 링크나 이미지 저장을 사용할 수 있습니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">학교 편제표 업로드 기반</p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-6xl">
              우리 학교용
              <br />
              선택과목 도우미를 만드세요
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
              편제표를 올리면 효자고 선택과목 도우미처럼 학생이 과목을 탐색하고, 진로별 추천을 보고,
              2·3학년 선택 로드맵을 완성할 수 있는 공개 링크를 만들 수 있습니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                도우미 만들기
              </Link>
              <span className="text-sm font-medium text-slate-500">PDF, HWPX, XLSX 편제표 업로드</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">학생 공개 화면</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">
                나에게 맞는
                <br />
                <span className="text-blue-600">선택과목</span>을 찾아보자
              </h2>
              <p className="mt-3 text-sm leading-6 text-blue-900/70">
                업로드된 학교 편제표에서 2·3학년 선택과목만 사용합니다.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["추천", "로드맵", "과목"].map((label) => (
                <div key={label} className="rounded-lg bg-slate-50 px-3 py-3 text-center text-sm font-bold text-slate-700">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-700">로드맵 완성</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                2·3학년 선택 조건을 모두 채우고 상담 자료로 공유
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <h2 className="text-sm font-bold text-slate-950">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
            <div>1. 편제표 업로드</div>
            <div>2. 과목·선택 묶음 검토</div>
            <div>3. 학생 안내 링크 발행</div>
          </div>
        </div>

        <div className="mt-8 flex justify-center lg:hidden">
          <div className="flex flex-wrap items-center gap-4">
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
