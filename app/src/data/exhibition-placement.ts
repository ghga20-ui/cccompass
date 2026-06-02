import selectedSubjectsData from "./json/school-selected-subjects.json" with { type: "json" };

export type ExhibitionAudience = "grade1" | "grade2";

export interface ExhibitionOffering {
  readonly grade: number;
  readonly semester: number;
  readonly choose: number | null;
  readonly creditsEach: number | null;
  readonly totalCredits: number | null;
  readonly groupLabel: string;
}

interface SourceOffering {
  readonly cohort: string;
  readonly grade: number;
  readonly semester: number;
  readonly choose?: number;
  readonly creditsEach?: number;
  readonly totalCredits?: number;
  readonly groupLabel?: string;
}

interface SourceSubject {
  readonly name: string;
  readonly offerings?: readonly SourceOffering[];
}

interface SelectedSubjectsPayload {
  readonly subjects: readonly SourceSubject[];
}

export const exhibitionSemesterFiltersByAudience = {
  grade1: ["2-1", "2-2", "3-1", "3-2"],
  grade2: ["3-1", "3-2"],
} as const satisfies Record<ExhibitionAudience, readonly string[]>;

const selectedSubjectsPayload = selectedSubjectsData as SelectedSubjectsPayload;

const cohortByAudience = {
  grade1: "2026",
  grade2: "2025",
} as const satisfies Record<ExhibitionAudience, string>;

const socialIssuesSubject = "사회문제 탐구";

function normalizeSubjectName(subjectName: string): string {
  return subjectName.replace(/\s+/g, "").trim();
}

function subjectNamesMatch(left: string, right: string): boolean {
  return normalizeSubjectName(left) === normalizeSubjectName(right);
}

function findSourceSubject(subjectName: string): SourceSubject | undefined {
  return selectedSubjectsPayload.subjects.find((subject) =>
    subjectNamesMatch(subject.name, subjectName)
  );
}

export function semesterKey(offering: ExhibitionOffering): string {
  return `${offering.grade}-${offering.semester}`;
}

export function isVisibleForExhibitionAudience(
  subjectName: string,
  audience: ExhibitionAudience
): boolean {
  return !(
    audience === "grade2" &&
    subjectNamesMatch(subjectName, socialIssuesSubject)
  );
}

export function getExhibitionOfferings(
  subjectName: string,
  audience: ExhibitionAudience
): readonly ExhibitionOffering[] {
  if (!isVisibleForExhibitionAudience(subjectName, audience)) return [];

  const sourceSubject = findSourceSubject(subjectName);
  if (!sourceSubject?.offerings) return [];

  const cohort = cohortByAudience[audience];
  const targetSemesterKeys = new Set<string>(
    exhibitionSemesterFiltersByAudience[audience]
  );
  const uniqueOfferings = new Map<string, ExhibitionOffering>();

  for (const offering of sourceSubject.offerings) {
    if (offering.cohort !== cohort) continue;

    const normalizedOffering: ExhibitionOffering = {
      grade: offering.grade,
      semester: offering.semester,
      choose: offering.choose ?? null,
      creditsEach: offering.creditsEach ?? null,
      totalCredits: offering.totalCredits ?? null,
      groupLabel: offering.groupLabel ?? "선택 과목",
    };

    const key = semesterKey(normalizedOffering);
    if (!targetSemesterKeys.has(key)) continue;

    uniqueOfferings.set(key, normalizedOffering);
  }

  return Array.from(uniqueOfferings.values()).sort(
    (left, right) => left.grade - right.grade || left.semester - right.semester
  );
}
