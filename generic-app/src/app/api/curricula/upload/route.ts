import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";
import { getStructurerProvider } from "@/lib/llm";
import { getParserProvider } from "@/lib/parser";
import { createShareToken } from "@/lib/tokens";

const maxUploadBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "편제표 파일을 업로드해주세요." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { error: "파일은 15MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await getParserProvider().parse({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
  });

  if (parsed.text.trim().length === 0 && parsed.tables.length === 0) {
    return NextResponse.json(
      { error: "문서에서 편제표 내용을 찾지 못했습니다." },
      { status: 422 },
    );
  }

  const structured = await getStructurerProvider().structure({
    text: parsed.text,
    tables: parsed.tables,
  });

  const validation = schoolCurriculumSchema.safeParse(structured.curriculum);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "편제표를 표준 구조로 변환하지 못했습니다.",
        issues: validation.error.issues,
      },
      { status: 422 },
    );
  }

  const draft = await prisma.curriculumDraft.create({
    data: {
      schoolName: validation.data.schoolName,
      curriculumJson: validation.data,
      parsedText: parsed.text,
      warnings: structured.warnings,
      sourceSnippets: structured.sourceSnippets,
      editToken: createShareToken(),
    },
  });

  return NextResponse.json({
    draftId: draft.id,
    reviewUrl: `/review/${draft.id}`,
    schoolName: validation.data.schoolName,
    warnings: structured.warnings,
  });
}
