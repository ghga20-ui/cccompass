import { afterEach, describe, expect, it } from "vitest";
import { getStructurerProvider, OpenAIStructurerProvider } from "@/lib/llm";
import { getParserProvider, KordocParserProvider } from "@/lib/parser";

const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const originalParserProvider = process.env.CURRICULUM_PARSER_PROVIDER;
const originalStructurerProvider = process.env.CURRICULUM_STRUCTURER_PROVIDER;

describe("curriculum providers", () => {
  afterEach(() => {
    if (originalParserProvider === undefined) {
      delete process.env.CURRICULUM_PARSER_PROVIDER;
    } else {
      process.env.CURRICULUM_PARSER_PROVIDER = originalParserProvider;
    }

    if (originalStructurerProvider === undefined) {
      delete process.env.CURRICULUM_STRUCTURER_PROVIDER;
    } else {
      process.env.CURRICULUM_STRUCTURER_PROVIDER = originalStructurerProvider;
    }
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
    expect(document.text).toContain("테스트고등학교");
    expect(document.tables.length).toBeGreaterThan(0);
  });

  it("returns the mock structurer by default", async () => {
    delete process.env.CURRICULUM_STRUCTURER_PROVIDER;

    const structurer = getStructurerProvider();

    const result = await structurer.structure({
      text: "테스트고등학교 2026학년도 입학생 교육과정 편제표",
      tables: [],
    });

    expect(result.curriculum.schoolName).toBe("테스트고등학교");
    expect(result.warnings).toEqual([]);
  });

  it("returns the kordoc parser shell when configured", async () => {
    process.env.CURRICULUM_PARSER_PROVIDER = "kordoc";

    const parser = getParserProvider();

    expect(parser).toBeInstanceOf(KordocParserProvider);
    await expect(
      parser.parse({
        fileName: "sample.xlsx",
        mimeType: xlsxMimeType,
        buffer: Buffer.from("sample"),
      }),
    ).rejects.toThrow(
      "KordocParserProvider is not wired yet. Deploy a server-side parser service and set CURRICULUM_PARSER_PROVIDER=mock until it is ready.",
    );
  });

  it("throws for unsupported parser providers", () => {
    process.env.CURRICULUM_PARSER_PROVIDER = "unknown";

    expect(() => getParserProvider()).toThrow("Unsupported curriculum parser provider: unknown");
  });

  it("returns the openai structurer shell when configured", async () => {
    process.env.CURRICULUM_STRUCTURER_PROVIDER = "openai";

    const structurer = getStructurerProvider();

    expect(structurer).toBeInstanceOf(OpenAIStructurerProvider);
    await expect(
      structurer.structure({
        text: "sample",
        tables: [],
      }),
    ).rejects.toThrow(
      "OpenAIStructurerProvider is not wired yet. Add the OpenAI Responses API call with structured output before setting CURRICULUM_STRUCTURER_PROVIDER=openai.",
    );
  });

  it("throws for unsupported structurer providers", () => {
    process.env.CURRICULUM_STRUCTURER_PROVIDER = "unknown";

    expect(() => getStructurerProvider()).toThrow(
      "Unsupported curriculum structurer provider: unknown",
    );
  });
});
