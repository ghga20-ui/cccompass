import type { ParserAdapter } from "../types.js";

export class MockParserAdapter implements ParserAdapter {
  async parse(input: Parameters<ParserAdapter["parse"]>[0]) {
    return {
      text: [
        "테스트고등학교",
        "2026학년도 입학생 교육과정 편제표",
        "2학년 1학기 문학 4단위 필수",
        "2학년 1학기 선택A 택1 물리학 3단위 생명과학 3단위",
      ].join("\n"),
      tables: [
        ["학교명", "입학연도", "학년", "학기", "구분", "과목", "단위"],
        ["테스트고등학교", "2026", "2", "1", "필수", "문학", "4"],
        ["테스트고등학교", "2026", "2", "1", "선택A 택1", "물리학", "3"],
        ["테스트고등학교", "2026", "2", "1", "선택A 택1", "생명과학", "3"],
      ],
      metadata: {
        parser: "mock-worker",
        fileName: input.fileName,
      },
    };
  }
}
