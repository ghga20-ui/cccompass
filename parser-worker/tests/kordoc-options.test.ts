import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "kordoc";
import { KordocParserAdapter } from "../src/adapters/kordoc.js";

vi.mock("kordoc", async (importOriginal) => ({ ...await importOriginal<typeof import("kordoc")>(), parse: vi.fn() }));

describe("Kordoc adapter runtime policy", () => {
  afterEach(() => vi.clearAllMocks());

  it("explicitly disables built-in and formula OCR even if models exist in the runtime", async () => {
    vi.mocked(parse).mockResolvedValue({ success: true, fileType: "pdf", markdown: "text", blocks: [] });
    const input = { fileName: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("test") };
    await new KordocParserAdapter().parse(input);
    expect(parse).toHaveBeenCalledWith(input.buffer, expect.objectContaining({ ocr: false, formulaOcr: false }));
  });


  it("includes nested cell and caption tables without losing their rows", async () => {
    const nested = (text: string) => ({ type: "table", table: { rows: 1, cols: 1, cells: [[{ text }]] } });
    const blocks = [{ type: "table", table: { rows: 1, cols: 1, cells: [[{ text: "outer", blocks: [nested("nested credit")] }]], captionBlocks: [nested("caption credit")] } }];
    vi.mocked(parse).mockResolvedValue({ success: true, fileType: "hwp", markdown: "", blocks } as Awaited<ReturnType<typeof parse>>);
    const result = await new KordocParserAdapter().parse({ fileName: "test.hwp", mimeType: "application/x-hwp", buffer: Buffer.from("test") });
    expect(result.tables).toEqual([["outer"], ["nested credit"], ["caption credit"]]);
  });

  it("preserves skipped-image warnings and quality metadata without claiming complete OCR", async () => {
    const warnings = [{ code: "SKIPPED_IMAGE" as const, message: "Image was not read", page: 1 }];
    const qualitySummary = { totalPages: 1, needsOcr: false };
    vi.mocked(parse).mockResolvedValue({ success: true, fileType: "pdf", markdown: "title", blocks: [], warnings, qualitySummary } as Awaited<ReturnType<typeof parse>>);
    const result = await new KordocParserAdapter().parse({ fileName: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("test") });
    expect(result.metadata.warnings).toEqual(warnings);
    expect(result.metadata.qualitySummary).toEqual(qualitySummary);
    expect(result.metadata.requiresVisualReview).toBe(true);
  });
});
