import { createSystemPrompt, parseJsonResponse } from "./openai-structurer";
import type { StructurerProvider, StructuringFile, StructuringResult } from "./types";

const defaultModel = "gemini-3.5-flash";

// 출력 JSON 형태를 명시 (Gemini responseSchema 방언 이슈를 피하고, 다운스트림 zod로 검증).
const jsonShapeInstruction = [
  "Output ONLY a single minified JSON object. No markdown, no code fences, no commentary.",
  'Shape: {"curriculum":{"schoolName":string,"sourceYear"?:string,"cohorts":[{"entranceYear":string,"label":string,"grades":[{"grade":1|2|3,"semesters":[{"semester":1|2,"requiredSubjects":[{"name":string,"credits":number,"category"?:string,"rawText"?:string,"confidence"?:number}],"choiceGroups":[{"id":string,"label":string,"choose":number,"minChoose"?:number,"maxChoose"?:number,"creditsEach"?:number,"subjects":[{"name":string,"credits":number,"category"?:string}],"notes"?:string[],"confidence"?:number}]}]}]}]},"warnings":string[],"sourceSnippets":string[]}',
].join(" ");

// PDF를 비전으로 같이 줄 때, 이미지(레이아웃)를 표 구조의 1차 근거로 삼게 한다.
const visionInstruction = [
  "You are ALSO given the ORIGINAL document as a PDF attachment.",
  "Treat the PDF's visual table layout — cell boundaries, line breaks WITHIN a cell, and merged cells (rowspan/colspan) — as the PRIMARY source of truth for structure.",
  "Use the supplied kordoc text/tables for exact character accuracy of subject names and numbers.",
  "When the PDF layout and the text disagree about where a subject or cell boundary is, trust the PDF layout.",
].join(" ");

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is required when CURRICULUM_STRUCTURER_PROVIDER=gemini.");
  }

  return key;
}

function isPdf(file?: StructuringFile) {
  if (!file) return false;
  return (
    file.mimeType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf")
  );
}

function stripCodeFences(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  return trimmed;
}

// 모델이 JSON 뒤에 잡텍스트/중복 객체를 붙이는 경우가 있어, 첫 균형 JSON 객체만 추출.
function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return text.slice(start);
}

function extractResponseText(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const response = body as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: unknown }> };
    }>;
  };

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return extractFirstJsonObject(stripCodeFences(text));
}

export class GeminiStructurerProvider implements StructurerProvider {
  async structure(
    document: Parameters<StructurerProvider["structure"]>[0],
  ): Promise<StructuringResult> {
    const model = process.env.GEMINI_STRUCTURER_MODEL ?? defaultModel;
    const usePdf = isPdf(document.file);

    const systemText = [
      createSystemPrompt(),
      usePdf ? visionInstruction : "",
      jsonShapeInstruction,
    ]
      .filter(Boolean)
      .join("\n\n");

    const userParts: Array<Record<string, unknown>> = [
      {
        text: JSON.stringify({
          userHints: document.hints ?? { cohortMode: "auto", entranceYears: [] },
          text: document.text,
          tables: document.tables,
        }),
      },
    ];

    if (usePdf && document.file) {
      userParts.push({
        inlineData: { mimeType: "application/pdf", data: document.file.base64 },
      });
    }

    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      temperature: 0,
    };

    const thinkingBudget = process.env.GEMINI_THINKING_BUDGET;
    if (thinkingBudget !== undefined && thinkingBudget.trim() !== "") {
      const parsed = Number(thinkingBudget);
      if (Number.isFinite(parsed)) {
        generationConfig.thinkingConfig = { thinkingBudget: parsed };
      }
    }

    const startedAt = Date.now();
    console.log(`[gemini] request start model=${model} pdf=${usePdf}`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: [{ role: "user", parts: userParts }],
          generationConfig,
        }),
        // 서버리스에서 Gemini 호출이 매달리지 않도록 타임아웃(진단+하드닝).
        signal: AbortSignal.timeout(90000),
      },
    );
    console.log(`[gemini] responded in ${Date.now() - startedAt}ms status=${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Gemini structuring failed with ${response.status}${errorText ? `: ${errorText}` : ""}`,
      );
    }

    const body: unknown = await response.json();
    const text = extractResponseText(body);

    if (!text) {
      throw new Error("Gemini response did not include output text.");
    }

    return parseJsonResponse(text, document.hints);
  }
}
