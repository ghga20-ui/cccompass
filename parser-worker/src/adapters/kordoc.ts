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
  async checkReadiness() {
    // Loading the adapter alone does not load Kordoc's optional PDF engine.
    // Import it without opening documents, starting OCR, or downloading models.
    const [pdf, pdfWorker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ]);

    if (typeof parse !== "function" || typeof collectTableBlocks !== "function" ||
        typeof VERSION !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(VERSION) ||
        typeof pdf.getDocument !== "function" ||
        typeof pdfWorker.WorkerMessageHandler?.setup !== "function") {
      throw new Error("Parser runtime is unavailable.");
    }

    return { adapter: "kordoc" as const, parserVersion: VERSION };
  }

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
