import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

const draftReviewSelect = {
  id: true,
  schoolName: true,
  status: true,
  curriculumJson: true,
  warnings: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CurriculumDraftSelect;

const notFoundResponse = () =>
  NextResponse.json({ error: "검토할 교육과정 초안을 찾을 수 없습니다." }, { status: 404 });

function hasMatchingEditToken(request: Request, editToken: string) {
  return request.headers.get("x-edit-token") === editToken;
}

export async function GET(request: Request, context: RouteContext) {
  const { draftId } = await context.params;
  const draft = await prisma.curriculumDraft.findUnique({
    where: {
      id: draftId,
    },
    select: {
      ...draftReviewSelect,
      editToken: true,
    },
  });

  if (!draft || !hasMatchingEditToken(request, draft.editToken)) {
    return notFoundResponse();
  }

  return NextResponse.json({
    id: draft.id,
    schoolName: draft.schoolName,
    status: draft.status,
    curriculumJson: draft.curriculumJson,
    warnings: draft.warnings,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { draftId } = await context.params;
  const existingDraft = await prisma.curriculumDraft.findUnique({
    where: {
      id: draftId,
    },
    select: {
      id: true,
      editToken: true,
    },
  });

  if (!existingDraft || !hasMatchingEditToken(request, existingDraft.editToken)) {
    return notFoundResponse();
  }

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

  try {
    const draft = await prisma.curriculumDraft.update({
      where: {
        id: draftId,
      },
      data: {
        schoolName: validation.data.schoolName,
        curriculumJson: validation.data,
      },
      select: draftReviewSelect,
    });

    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFoundResponse();
    }

    throw error;
  }
}
