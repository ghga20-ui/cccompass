import selectedSubjectsData from "./json/school-selected-subjects.json" with { type: "json" };

export interface ExhibitionSubject {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly area: string;
  readonly description: string;
  readonly recommendedFor?: readonly string[];
  readonly relatedDepartments?: readonly string[];
  readonly relatedCareers?: readonly string[];
  readonly keywords?: readonly string[];
}

interface SelectedSubjectsPayload {
  readonly subjects: readonly ExhibitionSubject[];
}

const selectedSubjectsPayload = selectedSubjectsData as SelectedSubjectsPayload;

export const exhibitionSubjects = selectedSubjectsPayload.subjects;

export const exhibitionAreas = [
  "전체",
  "국어",
  "영어",
  "수학",
  "사회",
  "과학",
  "체육",
  "예술",
  "기술·가정",
  "정보",
  "한문",
  "제2외국어",
  "교양",
] as const;

export type ExhibitionArea = (typeof exhibitionAreas)[number];

const displayAreaBySubjectId: Readonly<Record<string, ExhibitionArea>> = {
  tourism_japanese: "제2외국어",
  tourism_chinese: "제2외국어",
  drawing: "예술",
  food_and_nutrition: "기술·가정",
  informatics_science: "정보",
  programming: "정보",
  chorus_and_ensemble: "예술",
  changes_in_the_modern_world: "사회",
} as const;

export function getExhibitionDisplayArea(
  subject: ExhibitionSubject
): ExhibitionArea | string {
  return displayAreaBySubjectId[subject.id] ?? subject.area;
}

export function exhibitionAreaMatches(
  subject: ExhibitionSubject,
  selectedArea: ExhibitionArea
): boolean {
  const subjectArea = getExhibitionDisplayArea(subject);

  if (selectedArea === "전체") return true;
  if (subjectArea === selectedArea) return true;

  if (selectedArea === "기술·가정" || selectedArea === "정보") {
    return subjectArea === "기술·가정/정보";
  }

  if (selectedArea === "제2외국어" || selectedArea === "한문") {
    return subjectArea === "제2외국어/한문";
  }

  return false;
}
