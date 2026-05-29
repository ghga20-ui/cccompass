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

export interface StructurerProvider {
  structure(
    document: Pick<ParsedDocument, "text" | "tables"> & {
      hints?: StructuringHints;
    },
  ): Promise<StructuringResult>;
}
