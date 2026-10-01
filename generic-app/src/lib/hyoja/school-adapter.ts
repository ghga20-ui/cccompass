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
  /** 과목별 학점이 다를 때 사용. 없으면 creditsEach를 적용한다. */
  optionCredits?: Record<string, number>;
  /** 업로드 선택과목의 영역/유형. 기존 문자열 options와 함께 보존한다. */
  optionMetadata?: Record<string, Pick<CurriculumSubject, "area" | "category">>;
  totalCredits: number;
  options: string[];
  /** 편제 원문·교사 안내. 자유 서술은 선택 제한으로 해석하지 않는다. */
  notes?: string[];
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

export type SelectionCreditGroup = Pick<
  SelectionGroup,
  "options" | "creditsEach" | "optionCredits" | "choose" | "minChoose" | "maxChoose"
>;

function getOptionCredits(group: SelectionCreditGroup, name: string): number {
  return group.optionCredits && Object.prototype.hasOwnProperty.call(group.optionCredits, name)
    ? group.optionCredits[name]
    : group.creditsEach;
}

/** 현재 개설된 선택 과목만 중복 없이 합산한다. */
export function getSelectionCredits(group: SelectionCreditGroup, selected: string[]): number {
  const offered = new Set(group.options);
  return [...new Set(selected)].reduce(
    (sum, name) => sum + (offered.has(name) ? getOptionCredits(group, name) : 0),
    0,
  );
}

/** 최소/최대 선택 수와 과목별 학점으로 가능한 이수 학점 범위를 계산한다. */
export function getSelectionCreditRange(group: SelectionCreditGroup): { min: number; max: number } {
  const credits = [...new Set(group.options)]
    .map((name) => getOptionCredits(group, name))
    .sort((a, b) => a - b);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return {
    min: sum(credits.slice(0, group.minChoose ?? group.choose)),
    max: sum(credits.slice(-(group.maxChoose ?? group.choose))),
  };
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

/**
 * 학교명을 '~고등학교'로 정규화.
 * 'xx고'→'xx고등학교', 이미 '고등학교'면 유지. 그 외(고로 안 끝남)는
 * 영문명 등 훼손을 막기 위해 그대로 둔다(국내 고교명은 거의 '고'/'고등학교'로 끝남).
 */
export function normalizeSchoolName(raw: string): string {
  const name = (raw ?? "").trim();
  if (!name) return name;
  if (name.endsWith("고등학교")) return name;
  if (name.endsWith("고")) return `${name.slice(0, -1)}고등학교`;
  return name;
}

export function adaptCurriculumForStudentAssistant(
  curriculum: SchoolCurriculum,
): StudentSchoolData {
  const schoolName = normalizeSchoolName(curriculum.schoolName);
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
                const hasVariableCredits = group.creditsEach === undefined &&
                  new Set(group.subjects.map((subject) => subject.credits)).size > 1;
                const metadataSubjects = group.subjects.filter((subject) => subject.area || subject.category);

                selections.push({
                  id: `${cohort.entranceYear}-${grade.grade}-${semester.semester}-${group.id}`,
                  label: group.label,
                  grade: grade.grade,
                  semester: semester.semester,
                  choose: group.choose,
                  minChoose,
                  maxChoose,
                  creditsEach,
                  ...(hasVariableCredits ? {
                    optionCredits: Object.fromEntries(
                      group.subjects.map((subject) => [subject.name, subject.credits]),
                    ),
                  } : {}),
                  ...(metadataSubjects.length ? {
                    optionMetadata: Object.fromEntries(metadataSubjects.map((subject) => [
                      subject.name,
                      { area: subject.area, category: subject.category },
                    ])),
                  } : {}),
                  totalCredits: creditsEach * group.choose,
                  options: uniqueNames(group.subjects),
                  ...(group.notes !== undefined ? { notes: group.notes } : {}),
                });
              });
            });
        });

      result[cohort.entranceYear] = {
        label: cohort.label,
        description: `${schoolName} ${cohort.label}`,
        designated,
        selections,
      };

      return result;
    },
    {},
  );

  return {
    schoolName,
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
