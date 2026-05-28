import type { ParsedDocument, ParserProvider } from "./types";

export class KordocParserProvider implements ParserProvider {
  async parse(): Promise<ParsedDocument> {
    throw new Error(
      "KordocParserProvider is not wired yet. Deploy a server-side parser service and set CURRICULUM_PARSER_PROVIDER=mock until it is ready.",
    );
  }
}
