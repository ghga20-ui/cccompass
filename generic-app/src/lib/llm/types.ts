import type { SchoolCurriculum } from "@/lib/curriculum/schema";
import type { ParsedDocument } from "@/lib/parser";

export type StructuringResult = {
  curriculum: SchoolCurriculum;
  warnings: string[];
  sourceSnippets: string[];
};

export interface StructurerProvider {
  structure(document: Pick<ParsedDocument, "text" | "tables">): Promise<StructuringResult>;
}
