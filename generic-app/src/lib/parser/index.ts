import { MockParserProvider } from "./mock-parser";
import type { ParserProvider } from "./types";

export type { ParsedDocument, ParseInput, ParserProvider } from "./types";

export function getParserProvider(): ParserProvider {
  const provider = process.env.CURRICULUM_PARSER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockParserProvider();
  }

  throw new Error(`Unsupported curriculum parser provider: ${provider}`);
}
