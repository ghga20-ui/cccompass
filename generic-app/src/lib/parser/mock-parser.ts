import type { ParsedDocument, ParserProvider } from "./types";

export class MockParserProvider implements ParserProvider {
  async parse(input: Parameters<ParserProvider["parse"]>[0]): Promise<ParsedDocument> {
    const text = [
      "테스트고등학교",
      "2026학년도 입학생 교육과정 편제표",
      "2학년 1학기 문학 4학점 필수",
      "2학년 1학기 선택A 택1 물리학 3학점 생명과학 3학점",
    ].join("\n");

    return {
      text,
      tables: [
        ["학교명", "학년도", "학년", "학기", "구분", "과목", "학점"],
        ["테스트고등학교", "2026", "2", "1", "필수", "문학", "4"],
        ["테스트고등학교", "2026", "2", "1", "선택A 택1", "물리학", "3"],
        ["테스트고등학교", "2026", "2", "1", "선택A 택1", "생명과학", "3"],
      ],
      metadata: {
        parser: "mock",
        fileName: input.fileName,
      },
    };
  }
}
