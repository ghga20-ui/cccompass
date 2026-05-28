import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

type EditPageProps = {
  params: Promise<{
    editToken: string;
  }>;
};

export default async function EditPage({ params }: EditPageProps) {
  const { editToken } = await params;
  const draft = await prisma.curriculumDraft.findUnique({
    where: {
      editToken,
    },
    select: {
      id: true,
    },
  });

  if (!draft) {
    redirect("/");
  }

  redirect(`/review/${draft.id}?editToken=${encodeURIComponent(editToken)}`);
}
