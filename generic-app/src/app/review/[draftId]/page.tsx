import Link from "next/link";
import { notFound } from "next/navigation";
import { CurriculumReviewForm } from "@/components/curriculum/CurriculumReviewForm";
import { BrandLogo } from "@/components/Logo";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

type ReviewPageProps = {
  params: Promise<{
    draftId: string;
  }>;
  searchParams: Promise<{
    editToken?: string | string[];
  }>;
};

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { draftId } = await params;
  const { editToken } = await searchParams;

  if (typeof editToken !== "string") {
    notFound();
  }

  const draft = await prisma.curriculumDraft.findUnique({
    where: {
      id: draftId,
    },
    select: {
      editToken: true,
      curriculumJson: true,
    },
  });

  if (!draft || draft.editToken !== editToken) {
    notFound();
  }

  const initialCurriculum = schoolCurriculumSchema.parse(draft.curriculumJson);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-12">
        <Link href="/" className="inline-flex">
          <BrandLogo size="lg" />
        </Link>
        <div className="mt-7 max-w-3xl">
          <p className="text-sm font-semibold text-[var(--primary)]">교육과정 검토</p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
            업로드한 교육과정을 확인해 주세요
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-700">
            추출된 학교명, 필수 과목, 선택 그룹을 검토하고 필요한 부분을 바로 수정할 수
            있습니다. 저장 후 게시하면 학생 안내 화면에서 사용할 수 있습니다.
          </p>
        </div>

        <CurriculumReviewForm
          draftId={draftId}
          editToken={editToken}
          initialCurriculum={initialCurriculum}
        />
      </section>
    </main>
  );
}
