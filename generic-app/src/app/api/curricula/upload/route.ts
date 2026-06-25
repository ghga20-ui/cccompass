import { NextResponse } from "next/server";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";
import {
  MAX_PDF_PAGES,
  countPdfPages,
  isPdfUpload,
  pdfPageLimitMessage,
} from "@/lib/curriculum/pdf-limit";
import { postProcessCurriculum } from "@/lib/curriculum/post-process";
import { prisma } from "@/lib/db";
import { getStructurerProvider } from "@/lib/llm";
import { getParserProvider } from "@/lib/parser";
import { createShareToken } from "@/lib/tokens";
import type { CohortMode, StructuringHints } from "@/lib/llm";

// 파서(Render cold start 가능) + LLM 구조화(gpt-5.5 reasoning)를 한 요청에서
// 처리하므로 60초로는 부족하다. Pro 플랜 상한(300초)까지 늘린다.
export const maxDuration = 300;

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

  // PDF는 편제표만(최대 MAX_PDF_PAGES쪽) 받는다. 도움자료집·총론이 통째로 섞인
  // 대용량 PDF는 파싱 전에 막아 비용/지연/정확도 저하를 차단한다.
  if (isPdfUpload(file.name, file.type)) {
    try {
      const pageCount = await countPdfPages(buffer);

      if (pageCount > MAX_PDF_PAGES) {
        console.log(`[upload] PDF ${pageCount}p > ${MAX_PDF_PAGES}p 한도 초과 → 거부`);

        return NextResponse.json(
          { error: pdfPageLimitMessage(pageCount) },
          { status: 400 },
        );
      }
    } catch (error) {
      // 페이지 수를 못 세면(암호화·손상 등) 막지 않고 통과시킨다.
      console.warn("[upload] PDF page count failed; skipping page-limit check", error);
    }
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

  console.log(
    `[upload] parse ok: text=${parsed.text.length} tables=${parsed.tables.length} → structuring 시작`,
  );

  let structured;

  // structurer(OpenAI) 호출은 일시적으로 실패할 수 있어 지수 백오프로 재시도한다.
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      structured = await getStructurerProvider().structure({
        text: parsed.text,
        tables: parsed.tables,
        hints,
        // 원본 파일 동봉: PDF는 비전(네이티브) 입력으로 직접 읽게 한다.
        file: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64: buffer.toString("base64"),
        },
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      console.error(`Curriculum structurer attempt ${attempt}/${maxAttempts} failed`, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  if (!structured) {
    console.error("Curriculum structurer provider failed after retries", lastError);
    return NextResponse.json(
      { error: "편제표 구조화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  console.log("[upload] structuring ok → 후처리/저장");

  // 결정론적 후처리: 뭉친 과목명 분해 + 공백 정규화 + 중복 선택군 제거
  const processedCurriculum = postProcessCurriculum(structured.curriculum);
  const validation = schoolCurriculumSchema.safeParse(processedCurriculum);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "편제표를 표준 구조로 변환하지 못했습니다.",
        issues: validation.error.issues,
      },
      { status: 422 },
    );
  }

  let draft;

  try {
    draft = await prisma.curriculumDraft.create({
      data: {
        schoolName: validation.data.schoolName,
        curriculumJson: validation.data,
        parsedText: parsed.text,
        warnings: structured.warnings,
        sourceSnippets: structured.sourceSnippets,
        editToken: createShareToken(),
      },
    });
  } catch (error) {
    console.error("Curriculum draft DB save failed", error);

    return NextResponse.json(
      { error: "편제표 저장 중 오류가 발생했습니다. (DB 연결을 확인해주세요)" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    draftId: draft.id,
    reviewUrl: `/edit/${draft.editToken}`,
    schoolName: validation.data.schoolName,
    warnings: structured.warnings,
  });
}
