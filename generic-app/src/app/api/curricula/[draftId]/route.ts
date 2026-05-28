import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

const notFoundResponse = () =>
  NextResponse.json({ error: "검토할 교육과정 초안을 찾을 수 없습니다." }, { status: 404 });

export async function GET(_request: Request, context: RouteContext) {
  const { draftId } = await context.params;
  const draft = await prisma.curriculumDraft.findUnique({
    where: {
      id: draftId,
    },
  });

  if (!draft) {
    return notFoundResponse();
  }

  return NextResponse.json(draft);
}

export async function PUT(request: Request, context: RouteContext) {
  const { draftId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 JSON으로 읽을 수 없습니다." },
      { status: 400 },
    );
  }

  const curriculum = body && typeof body === "object" && "curriculum" in body
    ? (body as { curriculum: unknown }).curriculum
    : undefined;
  const validation = schoolCurriculumSchema.safeParse(curriculum);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "교육과정 구조를 확인해 주세요.",
        issues: validation.error.issues,
      },
      { status: 422 },
    );
  }

  const existingDraft = await prisma.curriculumDraft.findUnique({
    where: {
      id: draftId,
    },
    select: {
      id: true,
    },
  });

  if (!existingDraft) {
    return notFoundResponse();
  }

  try {
    const draft = await prisma.curriculumDraft.update({
      where: {
        id: draftId,
      },
      data: {
        schoolName: validation.data.schoolName,
        curriculumJson: validation.data,
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFoundResponse();
    }

    throw error;
  }
}
