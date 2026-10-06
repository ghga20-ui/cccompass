export type ParseRequest = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

export type ParseResponse = {
  text: string;
  tables: string[][];
  metadata: {
    parser: string;
    fileName: string;
    [key: string]: unknown;
  };
};

export interface ParserAdapter {
  checkReadiness(): Promise<{
    adapter: "mock" | "command" | "kordoc";
    parserVersion?: string;
  }>;
  parse(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<ParseResponse>;
}
