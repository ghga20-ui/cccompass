import { afterEach, describe, expect, it, vi } from "vitest";
import { getStructurerProvider, OpenAIStructurerProvider } from "@/lib/llm";
import { getParserProvider, KordocParserProvider } from "@/lib/parser";

const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const originalParserProvider = process.env.CURRICULUM_PARSER_PROVIDER;
const originalStructurerProvider = process.env.CURRICULUM_STRUCTURER_PROVIDER;
const originalParserServiceUrl = process.env.PARSER_SERVICE_URL;
const originalParserServiceToken = process.env.PARSER_SERVICE_TOKEN;
const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalOpenAiStructurerModel = process.env.OPENAI_STRUCTURER_MODEL;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("curriculum providers", () => {
  afterEach(() => {
    restoreEnv("CURRICULUM_PARSER_PROVIDER", originalParserProvider);
    restoreEnv("CURRICULUM_STRUCTURER_PROVIDER", originalStructurerProvider);
    restoreEnv("PARSER_SERVICE_URL", originalParserServiceUrl);
    restoreEnv("PARSER_SERVICE_TOKEN", originalParserServiceToken);
    restoreEnv("OPENAI_API_KEY", originalOpenAiApiKey);
    restoreEnv("OPENAI_STRUCTURER_MODEL", originalOpenAiStructurerModel);
    vi.unstubAllGlobals();
  });

  it("returns the mock parser by default", async () => {
    delete process.env.CURRICULUM_PARSER_PROVIDER;

    const parser = getParserProvider();

    const document = await parser.parse({
      fileName: "sample.xlsx",
      mimeType: xlsxMimeType,
      buffer: Buffer.from("sample"),
    });

    expect(document.metadata.parser).toBe("mock");
    expect(document.text.length).toBeGreaterThan(0);
    expect(document.tables.length).toBeGreaterThan(0);
  });

  it("returns the mock structurer by default", async () => {
    delete process.env.CURRICULUM_STRUCTURER_PROVIDER;

    const structurer = getStructurerProvider();

    const result = await structurer.structure({
      text: "sample curriculum text",
      tables: [],
    });

    expect(result.curriculum.schoolName.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it("calls the parser service when kordoc is configured", async () => {
    process.env.CURRICULUM_PARSER_PROVIDER = "kordoc";
    process.env.PARSER_SERVICE_URL = "https://parser.example.test/api/parse";
    process.env.PARSER_SERVICE_TOKEN = "parser-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "parsed text",
          tables: [["header"], ["value"]],
          metadata: { parser: "kordoc" },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const parser = getParserProvider();

    expect(parser).toBeInstanceOf(KordocParserProvider);
    const parsed = await parser.parse({
      fileName: "sample.xlsx",
      mimeType: xlsxMimeType,
      buffer: Buffer.from("sample"),
    });

    expect(parsed.text).toBe("parsed text");
    expect(parsed.tables).toEqual([["header"], ["value"]]);
    expect(parsed.metadata).toEqual({
      parser: "kordoc",
      fileName: "sample.xlsx",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://parser.example.test/api/parse"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer parser-token",
        }),
      }),
    );
  });

  it("requires a parser service URL for kordoc", async () => {
    process.env.CURRICULUM_PARSER_PROVIDER = "kordoc";
    delete process.env.PARSER_SERVICE_URL;

    const parser = getParserProvider();

    await expect(
      parser.parse({
        fileName: "sample.xlsx",
        mimeType: xlsxMimeType,
        buffer: Buffer.from("sample"),
      }),
    ).rejects.toThrow("PARSER_SERVICE_URL is required");
  });

  it("throws for unsupported parser providers", () => {
    process.env.CURRICULUM_PARSER_PROVIDER = "unknown";

    expect(() => getParserProvider()).toThrow("Unsupported curriculum parser provider: unknown");
  });

  it("calls OpenAI when the openai structurer is configured", async () => {
    process.env.CURRICULUM_STRUCTURER_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_STRUCTURER_MODEL = "test-model";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            curriculum: {
              schoolName: "Test High School",
              sourceYear: "2026",
              cohorts: [
                {
                  entranceYear: "2026",
                  label: "2026 entrance",
                  grades: [
                    {
                      grade: 2,
                      semesters: [
                        {
                          semester: 1,
                          requiredSubjects: [{ name: "Literature", credits: 4 }],
                          choiceGroups: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            warnings: [],
            sourceSnippets: ["sample"],
          }),
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const structurer = getStructurerProvider();

    expect(structurer).toBeInstanceOf(OpenAIStructurerProvider);
    const result = await structurer.structure({
      text: "sample",
      tables: [],
    });

    expect(result.curriculum.schoolName).toBe("Test High School");
    expect(result.warnings).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
        }),
      }),
    );
  });

  it("requires an OpenAI API key for the openai structurer", async () => {
    process.env.CURRICULUM_STRUCTURER_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;

    const structurer = getStructurerProvider();

    await expect(structurer.structure({ text: "sample", tables: [] })).rejects.toThrow(
      "OPENAI_API_KEY is required",
    );
  });

  it("throws for unsupported structurer providers", () => {
    process.env.CURRICULUM_STRUCTURER_PROVIDER = "unknown";

    expect(() => getStructurerProvider()).toThrow(
      "Unsupported curriculum structurer provider: unknown",
    );
  });
});
