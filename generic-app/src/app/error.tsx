"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
      <p className="text-sm font-semibold text-[var(--cta)]">문제가 발생했어요</p>
      <h1 className="text-2xl font-bold">잠시 후 다시 시도해 주세요</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        일시적인 오류일 수 있어요. 다시 시도하거나 처음 화면으로 돌아가 주세요.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--cta)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground"
        >
          처음으로
        </Link>
      </div>
    </main>
  );
}
