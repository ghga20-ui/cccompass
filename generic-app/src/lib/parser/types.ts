export type ParseInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedDocument = {
  text: string;
  tables: string[][];
  metadata: {
    parser: string;
    fileName: string;
  };
};

export interface ParserProvider {
  parse(input: ParseInput): Promise<ParsedDocument>;
}
