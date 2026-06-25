// PDF 업로드 페이지 제한.
//
// 편제표만 담긴 PDF는 보통 1~3쪽, 많아야 5쪽이다. 그 이상이면 교육과정
// 도움자료집·총론(2022 개정 교육과정 총론 등)이 통째로 섞여 들어온 경우로,
// 입력 토큰·비용·분석 시간만 폭증하고 정확도는 오히려 떨어진다.
// 그래서 PDF에 한해 페이지 수를 세고 한도를 넘으면 업로드 자체를 막는다.
// (교육과정부 교사는 순수 편제표 파일을 따로 갖고 있으므로 실사용에 무리 없음.)
//
// HWPX·엑셀·워드는 '페이지' 개념이 달라 이 검사의 대상이 아니다.

export const MAX_PDF_PAGES = 3;

export function isPdfUpload(fileName: string, mimeType?: string): boolean {
  if (fileName.toLowerCase().endsWith(".pdf")) {
    return true;
  }

  return (mimeType ?? "").toLowerCase() === "application/pdf";
}

// pdf-lib는 클라이언트 초기 번들에 싣지 않도록 동적 import 한다(PDF 선택 시에만 로드).
// 서버(Node)에서도 동일하게 동작한다.
export async function countPdfPages(
  bytes: ArrayBuffer | Uint8Array,
): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  return doc.getPageCount();
}

export function pdfPageLimitMessage(pageCount: number): string {
  return (
    `편제표만 담긴 PDF를 올려 주세요 (최대 ${MAX_PDF_PAGES}쪽). ` +
    `지금 파일은 ${pageCount}쪽이라, 교육과정 도움자료집·총론이 함께 들어간 것 같아요. ` +
    `편제표 표가 있는 페이지만 따로 저장해서 올려 주세요.`
  );
}
