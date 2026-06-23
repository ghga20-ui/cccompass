import { schoolCurriculumSchema, subjectCategorySchema } from "@/lib/curriculum/schema";
import type { StructurerProvider, StructuringHints, StructuringResult } from "./types";

const defaultModel = "gpt-5.5";

const curriculumJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["curriculum", "warnings", "sourceSnippets"],
  properties: {
    curriculum: {
      type: "object",
      additionalProperties: false,
      required: ["schoolName", "cohorts"],
      properties: {
        schoolName: { type: "string", minLength: 1 },
        sourceYear: { type: "string" },
        cohorts: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["entranceYear", "label", "grades"],
            properties: {
              entranceYear: { type: "string", minLength: 4 },
              label: { type: "string", minLength: 1 },
              grades: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["grade", "semesters"],
                  properties: {
                    grade: { type: "integer", enum: [1, 2, 3] },
                    semesters: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["semester", "requiredSubjects", "choiceGroups"],
                        properties: {
                          semester: { type: "integer", enum: [1, 2] },
                          requiredSubjects: {
                            type: "array",
                            items: { $ref: "#/$defs/subject" },
                          },
                          choiceGroups: {
                            type: "array",
                            items: { $ref: "#/$defs/choiceGroup" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    sourceSnippets: {
      type: "array",
      items: { type: "string" },
    },
  },
  $defs: {
    subject: {
      type: "object",
      additionalProperties: false,
      required: ["name", "credits"],
      properties: {
        name: { type: "string", minLength: 1 },
        area: { type: "string" },
        category: { type: "string" },
        credits: { type: "number", exclusiveMinimum: 0 },
        rawText: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    choiceGroup: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "choose", "subjects"],
      properties: {
        id: { type: "string", minLength: 1 },
        label: { type: "string", minLength: 1 },
        choose: { type: "integer", minimum: 1 },
        minChoose: { type: "integer", minimum: 1 },
        maxChoose: { type: "integer", minimum: 1 },
        creditsEach: { type: "number", exclusiveMinimum: 0 },
        subjects: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/subject" },
        },
        notes: {
          type: "array",
          items: { type: "string" },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  },
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when CURRICULUM_STRUCTURER_PROVIDER=openai.");
  }

  return apiKey;
}

function extractResponseText(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const response = body as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("\n")
      .trim() ?? ""
  );
}

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function cleanSubject(subject: unknown, fallbackCredits?: number) {
  if (!subject || typeof subject !== "object") {
    return subject;
  }

  const candidate = subject as Record<string, unknown>;
  const category = subjectCategorySchema.safeParse(candidate.category);
  const credits = cleanNumber(candidate.credits) ?? fallbackCredits ?? 1;
  const confidence = cleanNumber(candidate.confidence);

  return {
    ...candidate,
    credits,
    area: cleanOptionalString(candidate.area),
    category: category.success ? category.data : undefined,
    rawText: cleanOptionalString(candidate.rawText),
    confidence: confidence ?? (cleanNumber(candidate.credits) ? candidate.confidence : 0.3),
  };
}

function normalizeChoiceGroups(groups: unknown) {
  if (!Array.isArray(groups)) {
    return groups;
  }

  return groups.map((group) => {
    if (!group || typeof group !== "object") {
      return group;
    }

    const candidate = group as Record<string, unknown>;
    const creditsEach = cleanNumber(candidate.creditsEach);
    const subjects = Array.isArray(candidate.subjects)
      ? candidate.subjects.map((subject) => cleanSubject(subject, creditsEach))
      : candidate.subjects;

    return {
      ...candidate,
      choose: cleanNumber(candidate.choose) ?? 1,
      minChoose: cleanNumber(candidate.minChoose),
      maxChoose: cleanNumber(candidate.maxChoose),
      creditsEach,
      subjects,
      notes: Array.isArray(candidate.notes)
        ? candidate.notes.filter(
            (note): note is string => typeof note === "string" && note.trim().length > 0,
          )
        : candidate.notes,
    };
  });
}

function normalizeCurriculumCandidate(curriculum: unknown, hints?: StructuringHints) {
  if (!curriculum || typeof curriculum !== "object") {
    return curriculum;
  }

  const candidate = curriculum as Record<string, unknown>;

  return {
    ...candidate,
    schoolName:
      cleanOptionalString(hints?.schoolName) ??
      cleanOptionalString(candidate.schoolName) ??
      "학교명 미확인",
    sourceYear: cleanOptionalString(candidate.sourceYear),
    cohorts: Array.isArray(candidate.cohorts)
      ? candidate.cohorts.map((cohort) => {
          if (!cohort || typeof cohort !== "object") {
            return cohort;
          }

          const cohortCandidate = cohort as Record<string, unknown>;

          return {
            ...cohortCandidate,
            grades: Array.isArray(cohortCandidate.grades)
              ? cohortCandidate.grades.map((grade) => {
                  if (!grade || typeof grade !== "object") {
                    return grade;
                  }

                  const gradeCandidate = grade as Record<string, unknown>;

                  return {
                    ...gradeCandidate,
                    semesters: Array.isArray(gradeCandidate.semesters)
                      ? gradeCandidate.semesters.map((semester) => {
                          if (!semester || typeof semester !== "object") {
                            return semester;
                          }

                          const semesterCandidate = semester as Record<string, unknown>;

                          return {
                            ...semesterCandidate,
                            requiredSubjects: Array.isArray(semesterCandidate.requiredSubjects)
                              ? semesterCandidate.requiredSubjects.map((subject) =>
                                  cleanSubject(subject),
                                )
                              : semesterCandidate.requiredSubjects,
                            choiceGroups: normalizeChoiceGroups(semesterCandidate.choiceGroups),
                          };
                        })
                      : gradeCandidate.semesters,
                  };
                })
              : cohortCandidate.grades,
          };
        })
      : candidate.cohorts,
  };
}

export function parseJsonResponse(text: string, hints?: StructuringHints): StructuringResult {
  const parsed: unknown = JSON.parse(text);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned a non-object JSON response.");
  }

  const result = parsed as Partial<StructuringResult>;
  const curriculum = schoolCurriculumSchema.parse(
    normalizeCurriculumCandidate(result.curriculum, hints),
  );

  if (!Array.isArray(result.warnings) || !result.warnings.every((item) => typeof item === "string")) {
    throw new Error("OpenAI response is missing a valid warnings array.");
  }

  if (
    !Array.isArray(result.sourceSnippets) ||
    !result.sourceSnippets.every((item) => typeof item === "string")
  ) {
    throw new Error("OpenAI response is missing a valid sourceSnippets array.");
  }

  return {
    curriculum,
    warnings: result.warnings,
    sourceSnippets: result.sourceSnippets,
  };
}

export function createSystemPrompt() {
  return [
    "You convert Korean high-school curriculum tables into strict JSON.",
    "A school may upload one entrance-year cohort, multiple entrance-year cohorts in separate sections, or multiple cohorts in one table.",
    "First separate the document by entrance-year cohort, then structure each cohort independently.",
    "If userHints.entranceYears is not empty, prefer those entrance years and warn when document evidence conflicts.",
    "If userHints.cohortMode is single, return one cohort unless the document clearly contradicts it.",
    "If userHints.cohortMode is multiple, actively look for multiple entrance-year cohorts.",
    "If cohort boundaries are ambiguous, create the most likely cohorts and add explicit warnings.",
    // --- 분리/뭉침 방지 ---
    "SPLIT, NEVER MERGE SUBJECT NAMES. Each output subject MUST be a single official 2022-revised-curriculum subject name. If a source cell contains multiple subject names run together (with or without spaces or line breaks, e.g. '인공지능 기초세계지리세계사경제', '운동과 건강음악철학', '미적분경제수학'), split it into one subject object per real subject. Never emit a name that is two or more subjects glued together. When the boundary is unclear, still split using known subject names and set confidence <= 0.5.",
    "TREAT EVERY TABLE CELL AND EVERY LINE-BREAK AS A SUBJECT BOUNDARY. One cell normally holds one subject per text line; multiple lines mean multiple subjects, never one concatenated name.",
    // --- 집중이수 ↔ ---
    "RESOLVE '↔' AS TWO SEPARATE SUBJECTS, NOT ONE NAME. A name containing '↔' (e.g. '정보↔한문', '음악↔미술', '논술↔생태와 환경') denotes 집중이수/교차운영 (two subjects taught in alternating semesters/sections). Output the real subject name for that slot; do NOT keep 'A↔B' as a single name and do NOT model it as a 택1 choiceGroup.",
    // --- 지정 vs 선택군 ---
    "DISTINGUISH DESIGNATED SUBJECTS FROM CHOICE GROUPS BY EXPLICIT CREDIT. Within a selection column, a row with its OWN explicit credit value is a DESIGNATED subject and goes in requiredSubjects, NOT inside a following [택N] choiceGroup. A [택N] tag applies only to the rows below it whose individual credit cells are blank. Never absorb a credited designated subject as the first member of a choiceGroup.",
    "PRESERVE CHOICE-GROUP BOUNDARIES; DO NOT FLATTEN. When one semester has several independent selection blocks (e.g. a 제2외국어 [택1] block and a 과학 [택4] block), emit a SEPARATE choiceGroup per block with its own choose value copied from its [택N] tag. Never merge all selectable subjects of a semester into one catch-all group, and never omit choose when a [택N] tag is present.",
    "NEVER DUPLICATE A CHOICE GROUP ACROSS SEMESTERS. Assign each selection block only to the semester(s) whose credit cells are non-empty; do not copy a group into an empty-credit semester.",
    // --- 누락/허위 방지 ---
    "DO NOT DROP SCHOOL-DESIGNATED COMMON SUBJECTS. Glued cells like '국어수학영어한국사통합사회통합과학과학탐구실험' MUST be split into every common subject and emitted as requiredSubjects. Emit hard-to-parse subjects with low confidence instead of omitting them; never rely on warnings as a substitute for the data.",
    "DO NOT INVENT SUBJECTS OR CREDITS. Skip column-bleed fragments that are not real subject names. Do not assign a guessed uniform credit to subjects whose credit cell is blank; omit credits and lower confidence instead.",
    // --- 분류/코호트 ---
    "Preserve Korean subject names exactly (aside from the splits above).",
    "Use category only when it is one of: 공통, 일반선택, 진로선택, 융합선택, 전문교과, 기타. If a 과목구분 column marks 공통/일반/진로/융합 with a value spanning several rows (rowspan), propagate it to every covered subject. At minimum set category='공통' for 공통과목 (국어/수학/영어/한국사/통합사회/통합과학/과학탐구실험 and numbered variants).",
    "When a file has multiple cohorts, read each cohort's own credit and 택수 cells independently; never copy a value across cohorts.",
    "Use warnings for ambiguous grade, semester, credit, category, or choice-group evidence.",
    "Do not use empty strings for optional fields. Omit unknown optional values.",
    "Return only data that is supported by the supplied text, tables, or user hints.",
  ].join(" ");
}

export class OpenAIStructurerProvider implements StructurerProvider {
  async structure(document: Parameters<StructurerProvider["structure"]>[0]): Promise<StructuringResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_STRUCTURER_MODEL ?? defaultModel,
        reasoning: {
          effort: process.env.OPENAI_REASONING_EFFORT ?? "low",
        },
        input: [
          {
            role: "system",
            content: createSystemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify({
              userHints: document.hints ?? {
                cohortMode: "auto",
                entranceYears: [],
              },
              text: document.text,
              tables: document.tables,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "curriculum_structuring_result",
            schema: curriculumJsonSchema,
            strict: false,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `OpenAI structuring failed with ${response.status}${errorText ? `: ${errorText}` : ""}`,
      );
    }

    const body: unknown = await response.json();
    const text = extractResponseText(body);

    if (!text) {
      throw new Error("OpenAI response did not include output text.");
    }

    return parseJsonResponse(text, document.hints);
  }
}
