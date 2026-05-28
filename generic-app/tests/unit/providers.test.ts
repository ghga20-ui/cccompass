import { describe, expect, it } from "vitest";
import { getStructurerProvider } from "@/lib/llm";
import { getParserProvider } from "@/lib/parser";

const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("curriculum providers", () => {
  it("returns the mock parser by default", async () => {
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
    const structurer = getStructurerProvider();

    const result = await structurer.structure({
      text: "테스트고등학교 2026학년도 입학생 교육과정 편제표",
      tables: [],
    });

    expect(result.curriculum.schoolName).toBe("테스트고등학교");
    expect(result.warnings).toEqual([]);
  });
});
