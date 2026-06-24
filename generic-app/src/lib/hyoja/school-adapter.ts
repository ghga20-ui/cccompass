import type {
  CurriculumCohort,
  CurriculumSemester,
  CurriculumSubject,
  SchoolCurriculum,
} from "@/lib/curriculum/schema";

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
  /** 최소 선택 수(범위 택N~M). 미지정이면 choose로 간주 */
  minChoose?: number;
  /** 최대 선택 수(범위 택N~M). 미지정이면 choose로 간주 — 학생 선택 캡 */
  maxChoose?: number;
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

export interface StudentSchoolData {
  schoolName: string;
  cohorts: Record<string, CohortData>;
}

export interface CohortOption {
  entranceYear: string;
  label: string;
  description: string;
}

export interface SemesterConfig {
  grade: number;
  semester: number;
  label: string;
}

/**
 * 편제 묶음 과목명("논술↔생태와 환경" 처럼 한 칸에 묶인 과목)을
 * 화면 검색/개설 판정용 개별 과목명으로 분해한다.
 * effja school.ts getExpandedSubjectNames 포팅 + 슬래시(/) 표기도 흡수.
 */
export function expandSubjectNames(subjectName: string): string[] {
  const delimiter = subjectName.includes("↔")
    ? "↔"
    : subjectName.includes("/")
      ? "/"
      : null;

  if (!delimiter) return [subjectName];

  return subjectName
    .split(delimiter)
    .map((name) => name.trim())
    .filter(Boolean);
}

function hasPublicSemesterData(semester: CurriculumSemester) {
  return semester.requiredSubjects.length > 0 || semester.choiceGroups.length > 0;
}

function hasPublicCohortData(cohort: CurriculumCohort) {
  return cohort.grades.some((grade) =>
    grade.semesters.some(hasPublicSemesterData),
  );
}

function toDesignatedSubject(
  subject: CurriculumSubject,
  grade: number,
  semester: number,
): DesignatedSubject {
  return {
    subject: subject.name,
    area: subject.area ?? "",
    category: subject.category ?? "",
    credits: subject.credits,
    grade,
    semester,
  };
}

function uniqueNames(subjects: CurriculumSubject[]) {
  const seen = new Set<string>();
  const names: string[] = [];

  subjects.forEach((subject) => {
    if (seen.has(subject.name)) return;
    seen.add(subject.name);
    names.push(subject.name);
  });

  return names;
}

export function adaptCurriculumForStudentAssistant(
  curriculum: SchoolCurriculum,
): StudentSchoolData {
  const cohorts = curriculum.cohorts.reduce<Record<string, CohortData>>(
    (result, cohort) => {
      if (!hasPublicCohortData(cohort)) return result;

      const designated: DesignatedSubject[] = [];
      const selections: SelectionGroup[] = [];

      cohort.grades
        .slice()
        .sort((a, b) => a.grade - b.grade)
        .forEach((grade) => {
          grade.semesters
            .slice()
            .sort((a, b) => a.semester - b.semester)
            .forEach((semester) => {
              semester.requiredSubjects.forEach((subject) => {
                designated.push(
                  toDesignatedSubject(subject, grade.grade, semester.semester),
                );
              });

              semester.choiceGroups.forEach((group) => {
                const creditsEach =
                  group.creditsEach ?? group.subjects[0]?.credits ?? 0;

                const minChoose = group.minChoose ?? group.choose;
                const maxChoose = group.maxChoose ?? group.choose;

                selections.push({
                  id: `${cohort.entranceYear}-${grade.grade}-${semester.semester}-${group.id}`,
                  label: group.label,
                  grade: grade.grade,
                  semester: semester.semester,
                  choose: group.choose,
                  minChoose,
                  maxChoose,
                  creditsEach,
                  totalCredits: creditsEach * group.choose,
                  options: uniqueNames(group.subjects),
                });
              });
            });
        });

      result[cohort.entranceYear] = {
        label: cohort.label,
        description: `${curriculum.schoolName} ${cohort.label}`,
        designated,
        selections,
      };

      return result;
    },
    {},
  );

  return {
    schoolName: curriculum.schoolName,
    cohorts,
  };
}

export function getStudentCohortOptions(data: StudentSchoolData): CohortOption[] {
  return Object.entries(data.cohorts).map(([entranceYear, cohort]) => ({
    entranceYear,
    label: cohort.label,
    description: cohort.description,
  }));
}

export function getStudentSemesterConfigs(cohort: CohortData): SemesterConfig[] {
  const seen = new Set<string>();
  const configs: SemesterConfig[] = [];

  [...cohort.designated, ...cohort.selections]
    .sort((a, b) => a.grade - b.grade || a.semester - b.semester)
    .forEach((item) => {
      const key = `${item.grade}-${item.semester}`;
      if (seen.has(key)) return;
      seen.add(key);
      configs.push({
        grade: item.grade,
        semester: item.semester,
        label: `${item.grade}학년 ${item.semester}학기`,
      });
    });

  return configs;
}

/**
 * 선택과목군이 있는 학기만 반환한다.
 * 로드맵처럼 "직접 고를 과목이 있는 학기"만 보여줘야 하는 곳에서 사용.
 * 공통/지정 과목만 있고 선택군이 없는 학기는 제외된다.
 */
export function getSelectionSemesterConfigs(cohort: CohortData): SemesterConfig[] {
  return getStudentSemesterConfigs(cohort).filter((config) =>
    cohort.selections.some(
      (group) =>
        group.grade === config.grade && group.semester === config.semester,
    ),
  );
}

export function getCohortData(
  data: StudentSchoolData,
  cohortYear: string,
): CohortData | undefined {
  return data.cohorts[cohortYear];
}

export function getDesignatedSubjects(
  data: StudentSchoolData,
  cohortYear: string,
  grade: number,
  semester: number,
): DesignatedSubject[] {
  const cohort = getCohortData(data, cohortYear);
  if (!cohort) return [];

  return cohort.designated.filter(
    (subject) => subject.grade === grade && subject.semester === semester,
  );
}

export function getSelectionGroups(
  data: StudentSchoolData,
  cohortYear: string,
  grade: number,
  semester: number,
): SelectionGroup[] {
  const cohort = getCohortData(data, cohortYear);
  if (!cohort) return [];

  return cohort.selections.filter(
    (group) => group.grade === grade && group.semester === semester,
  );
}

export function getAllAvailableSubjectNames(
  data: StudentSchoolData,
  cohortYear: string,
  grade: number,
  semester: number,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  function addName(name: string) {
    if (seen.has(name)) return;
    seen.add(name);
    names.push(name);
  }

  getDesignatedSubjects(data, cohortYear, grade, semester).forEach((subject) => {
    expandSubjectNames(subject.subject).forEach(addName);
  });
  getSelectionGroups(data, cohortYear, grade, semester).forEach((group) => {
    group.options.forEach((option) =>
      expandSubjectNames(option).forEach(addName),
    );
  });

  return names;
}

/** 특정 학년/학기에 해당 과목이 개설(지정 또는 선택)되는지 — 묶음 과목명 확장 반영 */
export function isSubjectAvailable(
  data: StudentSchoolData,
  subjectName: string,
  cohortYear: string,
  grade: number,
  semester: number,
): boolean {
  return getAllAvailableSubjectNames(data, cohortYear, grade, semester).includes(
    subjectName,
  );
}

/** getAllAvailableSubjectNames 동치 별칭 (effja 하위 호환 면) */
export function getAvailableSubjects(
  data: StudentSchoolData,
  cohortYear: string,
  grade: number,
  semester: number,
): string[] {
  return getAllAvailableSubjectNames(data, cohortYear, grade, semester);
}
