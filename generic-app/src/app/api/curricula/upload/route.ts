import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";
import { getStructurerProvider } from "@/lib/llm";
import { getParserProvider } from "@/lib/parser";
import { createShareToken } from "@/lib/tokens";
import type { CohortMode, StructuringHints } from "@/lib/llm";

const maxUploadBytes = 5 * 1024 * 1024;

const allowedExtensions = new Set([".pdf", ".hwp", ".hwpx", ".xlsx", ".xlsm", ".docx"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.hancom.hwp",
  "application/x-hwp",
  "application/haansofthwp",
  "application/vnd.hancom.hwpx",
  "application/hwp+zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");

  if (extensionStart === -1) {
    return "";
  }

  return fileName.slice(extensionStart).toLowerCase();
}

function isSupportedUpload(file: File) {
  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  return allowedExtensions.has(extension) || allowedMimeTypes.has(mimeType);
}

function getOptionalFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function getCohortMode(formData: FormData): CohortMode {
  const value = getOptionalFormString(formData, "cohortMode");

  if (value === "single" || value === "multiple") {
    return value;
  }

  return "auto";
}

function getEntranceYears(formData: FormData) {
  const raw = getOptionalFormString(formData, "entranceYears");

  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(/[\s,，、/]+/)
        .map((value) => value.trim())
        .filter((value) => /^\d{4}$/.test(value)),
    ),
  );
}

function getStructuringHints(formData: FormData): StructuringHints {
  return {
    schoolName: getOptionalFormString(formData, "schoolName"),
    cohortMode: getCohortMode(formData),
    entranceYears: getEntranceYears(formData),
  };
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to read curriculum upload form data", error);

    return NextResponse.json({ error: "업로드 요청을 읽지 못했습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  const hints = getStructuringHints(formData);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "편제표 파일을 업로드해주세요." }, { status: 400 });
  }

  if (!isSupportedUpload(file)) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { error: "파일은 5MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  let buffer: Buffer;

  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("Failed to read curriculum upload file", error);

    return NextResponse.json({ error: "업로드한 파일을 읽지 못했습니다." }, { status: 400 });
  }

  let parsed;

  try {
    parsed = await getParserProvider().parse({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
  } catch (error) {
    console.error("Curriculum parser provider failed", error);

    return NextResponse.json({ error: "문서 분석 중 오류가 발생했습니다." }, { status: 502 });
  }

  if (parsed.text.trim().length === 0 && parsed.tables.length === 0) {
    return NextResponse.json(
      { error: "문서에서 편제표 내용을 찾지 못했습니다." },
      { status: 422 },
    );
  }

  let structured;

  try {
    structured = await getStructurerProvider().structure({
      text: parsed.text,
      tables: parsed.tables,
      hints,
    });
  } catch (error) {
    console.error("Curriculum structurer provider failed", error);

    return NextResponse.json({ error: "편제표 구조화 중 오류가 발생했습니다." }, { status: 502 });
  }

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
    reviewUrl: `/edit/${draft.editToken}`,
    schoolName: validation.data.schoolName,
    warnings: structured.warnings,
  });
}
