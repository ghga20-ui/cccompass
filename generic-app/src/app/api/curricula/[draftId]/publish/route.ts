import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";
import { createShareToken } from "@/lib/tokens";

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

const missingDraftResponse = () =>
  NextResponse.json({ error: "발행할 교육과정 초안을 찾을 수 없습니다." }, { status: 404 });

export async function POST(request: Request, context: RouteContext) {
  const { draftId } = await context.params;

  try {
    const draft = await prisma.curriculumDraft.findUnique({
      where: {
        id: draftId,
      },
      select: {
        id: true,
        editToken: true,
        curriculumJson: true,
      },
    });

    if (!draft || request.headers.get("x-edit-token") !== draft.editToken) {
      return missingDraftResponse();
    }

    const validation = schoolCurriculumSchema.safeParse(draft.curriculumJson);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "교육과정 구조를 확인한 뒤 다시 발행해 주세요.",
          issues: validation.error.issues,
        },
        { status: 422 },
      );
    }

    const [publication] = await prisma.$transaction([
      prisma.curriculumPublication.upsert({
        where: {
          draftId: draft.id,
        },
        create: {
          draftId: draft.id,
          schoolName: validation.data.schoolName,
          curriculumJson: validation.data,
          shareToken: createShareToken(),
          editToken: draft.editToken,
        },
        update: {
          schoolName: validation.data.schoolName,
          curriculumJson: validation.data,
        },
        select: {
          shareToken: true,
          editToken: true,
        },
      }),
      prisma.curriculumDraft.update({
        where: {
          id: draft.id,
        },
        data: {
          status: "published",
        },
        select: {
          status: true,
        },
      }),
    ]);

    // 재게시 시 라이브 공유 페이지(레이아웃 포함 하위 전부)의 캐시를 무효화한다.
    // 라우트 핸들러 밖(테스트 등)에서 호출되면 store가 없어 throw하므로 방어한다.
    try {
      revalidatePath(`/s/${publication.shareToken}`, "layout");
    } catch (revalidateError) {
      console.warn("revalidatePath skipped", revalidateError);
    }

    return NextResponse.json({
      shareUrl: `/s/${publication.shareToken}`,
      editUrl: `/edit/${publication.editToken}`,
      manageUrl: `/published/${draft.id}?editToken=${encodeURIComponent(publication.editToken)}`,
    });
  } catch (error) {
    console.error("Failed to publish curriculum draft", error);

    return NextResponse.json(
      { error: "교육과정 발행 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
