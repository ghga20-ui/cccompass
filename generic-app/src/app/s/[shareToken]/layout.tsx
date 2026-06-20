import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { CohortProvider } from "@/contexts/CohortContext";
import { HyojaRuntimeProvider } from "@/contexts/HyojaRuntimeContext";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import {
  adaptCurriculumForStudentAssistant,
  getStudentCohortOptions,
} from "@/lib/hyoja/school-adapter";
import { prisma } from "@/lib/db";

// 재게시 시 학생 공개 화면이 항상 최신 publication을 반영하도록 매 요청 동적 렌더.
export const dynamic = "force-dynamic";

type ShareLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    shareToken: string;
  }>;
};

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <main className="pb-safe">
        {children}
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
}

function NoStudentDataEmptyState({ schoolName }: { schoolName: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-10">
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-foreground/10">
        <p className="text-sm font-medium text-primary">{schoolName}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-normal text-foreground">
          공개할 선택과목 데이터가 없어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          업로드된 편제표에서 학생 공개 화면에 사용할 과목 정보를 찾지
          못했습니다.
        </p>
      </div>
    </div>
  );
}

export default async function ShareLayout({
  children,
  params,
}: ShareLayoutProps) {
  const { shareToken } = await params;
  const publication = await prisma.curriculumPublication.findUnique({
    where: { shareToken },
    select: {
      curriculumJson: true,
      schoolName: true,
    },
  });

  if (!publication) {
    notFound();
  }

  const validation = schoolCurriculumSchema.safeParse(publication.curriculumJson);
  if (!validation.success) {
    notFound();
  }

  const schoolData = adaptCurriculumForStudentAssistant(validation.data);
  const cohortOptions = getStudentCohortOptions(schoolData);

  if (cohortOptions.length === 0) {
    return <NoStudentDataEmptyState schoolName={publication.schoolName} />;
  }

  return (
    <HyojaRuntimeProvider shareToken={shareToken} schoolData={schoolData}>
      <CohortProvider cohorts={cohortOptions}>
        <PublicShell>{children}</PublicShell>
      </CohortProvider>
    </HyojaRuntimeProvider>
  );
}
