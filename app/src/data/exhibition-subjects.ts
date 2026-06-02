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

const descriptionBySubjectId: Readonly<Record<string, string>> = {
  food_and_nutrition:
    "식품의 특성과 영양소, 건강한 식생활 관리 방법을 배우며 식품과 건강을 과학적으로 탐구하는 과목입니다.",
  programming:
    "문제를 작은 절차로 나누고 프로그래밍 언어로 구현하며, 소프트웨어로 생활 속 문제를 해결하는 방법을 배우는 과목입니다.",
  tourism_japanese:
    "관광 상황에서 필요한 일본어 표현과 일본 문화 이해를 바탕으로 여행, 서비스, 국제 교류 장면의 의사소통 능력을 기르는 과목입니다.",
  tourism_chinese:
    "관광 상황에서 필요한 중국어 표현과 중국 문화 이해를 바탕으로 여행, 서비스, 국제 교류 장면의 의사소통 능력을 기르는 과목입니다.",
} as const;

export const exhibitionSubjects = selectedSubjectsPayload.subjects.map(
  (subject) => ({
    ...subject,
    description: descriptionBySubjectId[subject.id] ?? subject.description,
  })
);

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
