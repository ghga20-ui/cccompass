import { KordocParserProvider } from "./kordoc-parser";
import { MockParserProvider } from "./mock-parser";
import type { ParserProvider } from "./types";

export { KordocParserProvider } from "./kordoc-parser";
export { MockParserProvider } from "./mock-parser";
export type { ParsedDocument, ParseInput, ParserProvider } from "./types";

export function getParserProvider(): ParserProvider {
  const provider = process.env.CURRICULUM_PARSER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockParserProvider();
  }

  if (provider === "kordoc") {
    return new KordocParserProvider();
  }

  throw new Error(`Unsupported curriculum parser provider: ${provider}`);
}
