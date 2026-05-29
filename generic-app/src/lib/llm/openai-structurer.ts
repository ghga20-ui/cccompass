import { schoolCurriculumSchema, subjectCategorySchema } from "@/lib/curriculum/schema";
import type { StructurerProvider, StructuringResult } from "./types";

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
        type?: unknown;
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

function parseJsonResponse(text: string): StructuringResult {
  const parsed: unknown = JSON.parse(text);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned a non-object JSON response.");
  }

  const result = parsed as Partial<StructuringResult>;
  const curriculum = schoolCurriculumSchema.parse(normalizeCurriculumCandidate(result.curriculum));

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

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanSubject(subject: unknown) {
  if (!subject || typeof subject !== "object") {
    return subject;
  }

  const candidate = subject as Record<string, unknown>;
  const category = subjectCategorySchema.safeParse(candidate.category);

  return {
    ...candidate,
    area: cleanOptionalString(candidate.area),
    category: category.success ? category.data : undefined,
    rawText: cleanOptionalString(candidate.rawText),
  };
}

function normalizeCurriculumCandidate(curriculum: unknown) {
  if (!curriculum || typeof curriculum !== "object") {
    return curriculum;
  }

  const candidate = curriculum as Record<string, unknown>;

  return {
    ...candidate,
    schoolName: cleanOptionalString(candidate.schoolName) ?? "학교명 미확인",
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
                              ? semesterCandidate.requiredSubjects.map(cleanSubject)
                              : semesterCandidate.requiredSubjects,
                            choiceGroups: Array.isArray(semesterCandidate.choiceGroups)
                              ? semesterCandidate.choiceGroups.map((group) => {
                                  if (!group || typeof group !== "object") {
                                    return group;
                                  }

                                  const groupCandidate = group as Record<string, unknown>;

                                  return {
                                    ...groupCandidate,
                                    subjects: Array.isArray(groupCandidate.subjects)
                                      ? groupCandidate.subjects.map(cleanSubject)
                                      : groupCandidate.subjects,
                                    notes: Array.isArray(groupCandidate.notes)
                                      ? groupCandidate.notes.filter(
                                          (note): note is string =>
                                            typeof note === "string" && note.trim().length > 0,
                                        )
                                      : groupCandidate.notes,
                                  };
                                })
                              : semesterCandidate.choiceGroups,
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
            content:
              "You convert Korean high-school curriculum tables into strict JSON. Preserve Korean names exactly. Use warnings for ambiguous grade, semester, credit, or choice-group evidence. Return only data that is supported by the supplied text or tables.",
          },
          {
            role: "user",
            content: JSON.stringify({
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

    return parseJsonResponse(text);
  }
}
