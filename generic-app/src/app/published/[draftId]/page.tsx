import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type PublishedPageProps = {
  params: Promise<{
    draftId: string;
  }>;
};

export default async function PublishedPage({ params }: PublishedPageProps) {
  const { draftId } = await params;
  const publication = await prisma.curriculumPublication.findUnique({
    where: {
      draftId,
    },
    select: {
      schoolName: true,
      shareToken: true,
      editToken: true,
      updatedAt: true,
    },
  });

  if (!publication) {
    notFound();
  }

  const studentUrl = `/s/${publication.shareToken}`;
  const editUrl = `/edit/${publication.editToken}`;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
        <p className="text-sm font-semibold text-[var(--primary)]">발행 완료</p>
        <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
          {publication.schoolName} 교육과정 안내가 발행되었습니다.
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-700">
          학생에게는 공개 안내 링크를 공유하고, 교사는 수정 링크로 돌아와 교육과정을 다시
          검토할 수 있습니다.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href={studentUrl}
            className="rounded-md border border-[var(--border)] bg-white p-5 transition hover:border-[var(--primary)]"
          >
            <span className="text-sm font-semibold text-slate-600">학생 안내 링크</span>
            <span className="mt-3 block break-all text-lg font-bold text-slate-950">
              {studentUrl}
            </span>
          </Link>
          <Link
            href={editUrl}
            className="rounded-md border border-[var(--border)] bg-white p-5 transition hover:border-[var(--primary)]"
          >
            <span className="text-sm font-semibold text-slate-600">교사용 수정 링크</span>
            <span className="mt-3 block break-all text-lg font-bold text-slate-950">
              {editUrl}
            </span>
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          마지막 발행 시각: {publication.updatedAt.toLocaleString("ko-KR")}
        </p>
      </section>
    </main>
  );
}
