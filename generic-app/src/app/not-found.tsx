import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
      <p className="text-sm font-semibold text-[var(--primary)]">404</p>
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        주소가 바뀌었거나, 아직 준비 중인 페이지일 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-[var(--cta)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
      >
        처음으로
      </Link>
    </main>
  );
}
