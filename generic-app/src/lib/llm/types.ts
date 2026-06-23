import type { SchoolCurriculum } from "@/lib/curriculum/schema";
import type { ParsedDocument } from "@/lib/parser";

export type CohortMode = "auto" | "single" | "multiple";

export type StructuringHints = {
  schoolName?: string;
  cohortMode: CohortMode;
  entranceYears: string[];
};

export type StructuringResult = {
  curriculum: SchoolCurriculum;
  warnings: string[];
  sourceSnippets: string[];
};

/** 원본 업로드 파일. PDF는 비전(네이티브) 입력으로 모델에 직접 전달한다. */
export type StructuringFile = {
  fileName: string;
  mimeType: string;
  base64: string;
};

export interface StructurerProvider {
  structure(
    document: Pick<ParsedDocument, "text" | "tables"> & {
      hints?: StructuringHints;
      file?: StructuringFile;
    },
  ): Promise<StructuringResult>;
}
