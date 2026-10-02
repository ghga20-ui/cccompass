import { parse, VERSION, collectTableBlocks, type IRBlock } from "kordoc";
import type { ParseResponse, ParserAdapter } from "../types.js";

function collectTables(blocks: IRBlock[] | undefined) {
  if (!blocks) {
    return [];
  }

  const tables: string[][] = [];

  for (const block of collectTableBlocks(blocks)) {
    if (block.table) {
      for (const row of block.table.cells) {
        tables.push(row.map((cell) => cell.text.trim()));
      }
    }
  }

  return tables;
}

export class KordocParserAdapter implements ParserAdapter {
  async parse(input: Parameters<ParserAdapter["parse"]>[0]): Promise<ParseResponse> {
    const result = await parse(input.buffer, { ocr: false, formulaOcr: false });

    if (!result.success) {
      throw new Error(`Kordoc parse failed${result.code ? ` (${result.code})` : ""}: ${result.error}`);
    }

    return {
      text: result.markdown,
      tables: collectTables(result.blocks),
      metadata: {
        parser: "kordoc",
        parserVersion: VERSION,
        fileName: input.fileName,
        fileType: result.fileType,
        pageCount: result.pageCount,
        warnings: result.warnings ?? [],
        qualitySummary: result.qualitySummary,
        requiresVisualReview: Boolean(result.qualitySummary?.needsOcr) ||
          (result.warnings ?? []).some((warning) =>
            ["NEEDS_OCR", "SKIPPED_IMAGE", "OCR_FAILED", "OCR_LOW_CONF", "PARTIAL_PARSE", "TRUNCATED_TABLE"].includes(warning.code),
          ),
      },
    };
  }
}
