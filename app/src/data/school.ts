import schoolData from "./json/school.json";

// ========== 인터페이스 ==========
export interface DesignatedSubject {
  subject: string;
  area: string;
  category: string;
  credits: number;
  grade: number;
  semester: number;
}

export interface SelectionGroup {
  id: string;
  label: string;
  grade: number;
  semester: number;
  choose: number;
  creditsEach: number;
  totalCredits: number;
  options: string[];
}

export interface CohortData {
  label: string;
  description: string;
  designated: DesignatedSubject[];
  selections: SelectionGroup[];
}

export interface SchoolData {
  schoolName: string;
  cohorts: Record<string, CohortData>;
}

// ========== 데이터 ==========
export const school: SchoolData = schoolData as SchoolData;

// 하위 호환: defaultSchool도 export
export const defaultSchool = school;

// ========== 유틸 함수 ==========

/** school.json의 묶음 과목명을 화면 검색/개설 판정용 개별 과목명으로 확장 */
export function getExpandedSubjectNames(subjectName: string): string[] {
  if (subjectName.includes("↔")) {
    return subjectName
      .split("↔")
      .map((name) => name.trim())
      .filter(Boolean);
  }
  return [subjectName];
}

/** 해당 학년도(cohort)의 데이터를 반환 */
export function getCohortData(cohortYear: string): CohortData | undefined {
  return school.cohorts[cohortYear];
}

/** 해당 cohort/학년/학기에 지정된(designated) 과목 이름 목록 */
export function getDesignatedSubjects(
  cohortYear: string,
  grade: number,
  semester: number
): DesignatedSubject[] {
  const cohort = school.cohorts[cohortYear];
  if (!cohort) return [];
  return cohort.designated.filter(
    (d) => d.grade === grade && d.semester === semester
  );
}

/** 해당 cohort/학년/학기의 선택 과목 그룹 목록 */
export function getSelectionGroups(
  cohortYear: string,
  grade: number,
  semester: number
): SelectionGroup[] {
  const cohort = school.cohorts[cohortYear];
  if (!cohort) return [];
  return cohort.selections.filter(
    (s) => s.grade === grade && s.semester === semester
  );
}

/** 해당 cohort에서 특정 학년/학기에 선택 가능한 모든 과목 이름 (designated + selection options) */
export function getAllAvailableSubjectNames(
  cohortYear: string,
  grade: number,
  semester: number
): string[] {
  const names = new Set<string>();
  getDesignatedSubjects(cohortYear, grade, semester).forEach((d) =>
    getExpandedSubjectNames(d.subject).forEach((name) => names.add(name))
  );
  getSelectionGroups(cohortYear, grade, semester).forEach((g) =>
    g.options.forEach((o) =>
      getExpandedSubjectNames(o).forEach((name) => names.add(name))
    )
  );
  return Array.from(names);
}

// ========== 하위 호환 함수 ==========
// 기존 코드에서 사용하던 isSubjectAvailable / getAvailableSubjects
// 이제 subject name 기반으로 동작 (기본 cohort: 2026)

export function isSubjectAvailable(
  _school: SchoolData,
  subjectName: string,
  grade: number,
  semester: number,
  cohortYear: string = "2026"
): boolean {
  const allNames = getAllAvailableSubjectNames(cohortYear, grade, semester);
  return allNames.includes(subjectName);
}

export function getAvailableSubjects(
  _school: SchoolData,
  grade: number,
  semester: number,
  cohortYear: string = "2026"
): string[] {
  return getAllAvailableSubjectNames(cohortYear, grade, semester);
}
