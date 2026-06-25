import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  MAX_PDF_PAGES,
  countPdfPages,
  isPdfUpload,
  pdfPageLimitMessage,
} from "@/lib/curriculum/pdf-limit";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    doc.addPage([200, 200]);
  }
  return doc.save();
}

describe("PDF 페이지 제한", () => {
  it("확장자 또는 MIME으로 PDF를 판별한다", () => {
    expect(isPdfUpload("편제표.pdf")).toBe(true);
    expect(isPdfUpload("편제표.PDF")).toBe(true);
    expect(isPdfUpload("noext", "application/pdf")).toBe(true);
    expect(isPdfUpload("편제표.hwpx")).toBe(false);
    expect(
      isPdfUpload(
        "표.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(false);
  });

  it("실제 페이지 수를 정확히 센다", async () => {
    expect(await countPdfPages(await makePdf(1))).toBe(1);
    expect(await countPdfPages(await makePdf(MAX_PDF_PAGES))).toBe(MAX_PDF_PAGES);
    expect(await countPdfPages(await makePdf(MAX_PDF_PAGES + 1))).toBe(
      MAX_PDF_PAGES + 1,
    );
  });

  it("한도 초과 안내에 실제 쪽수와 한도가 들어간다", () => {
    const message = pdfPageLimitMessage(32);
    expect(message).toContain("32쪽");
    expect(message).toContain(`${MAX_PDF_PAGES}쪽`);
  });
});
