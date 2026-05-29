import { parse, type IRBlock } from "@clazic/kordoc";
import type { ParseResponse, ParserAdapter } from "../types.js";

function collectTables(blocks: IRBlock[] | undefined) {
  if (!blocks) {
    return [];
  }

  const tables: string[][] = [];

  for (const block of blocks) {
    if (block.type === "table" && block.table) {
      for (const row of block.table.cells) {
        tables.push(row.map((cell) => cell.text.trim()));
      }
    }

    if (block.children) {
      tables.push(...collectTables(block.children));
    }
  }

  return tables;
}

export class KordocParserAdapter implements ParserAdapter {
  async parse(input: Parameters<ParserAdapter["parse"]>[0]): Promise<ParseResponse> {
    const result = await parse(input.buffer);

    if (!result.success) {
      throw new Error(`Kordoc parse failed${result.code ? ` (${result.code})` : ""}: ${result.error}`);
    }

    return {
      text: result.markdown,
      tables: collectTables(result.blocks),
      metadata: {
        parser: "kordoc",
        fileName: input.fileName,
        fileType: result.fileType,
        pageCount: result.pageCount,
        warnings: result.warnings ?? [],
      },
    };
  }
}
