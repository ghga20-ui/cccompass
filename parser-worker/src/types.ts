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
  parse(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<ParseResponse>;
}
