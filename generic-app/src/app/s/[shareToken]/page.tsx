import { notFound } from "next/navigation";
import { StudentCurriculumAssistant } from "@/components/student/StudentCurriculumAssistant";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

type SharePageProps = {
  params: Promise<{
    shareToken: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { shareToken } = await params;
  const publication = await prisma.curriculumPublication.findUnique({
    where: {
      shareToken,
    },
    select: {
      curriculumJson: true,
    },
  });

  if (!publication) {
    notFound();
  }

  const validation = schoolCurriculumSchema.safeParse(publication.curriculumJson);

  if (!validation.success) {
    notFound();
  }

  return <StudentCurriculumAssistant curriculum={validation.data} />;
}
