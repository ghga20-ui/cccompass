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

function isPublicStudentGrade(grade: number) {
  return grade >= 2;
}

function hasPublicSemesterData(semester: CurriculumSemester) {
  return semester.requiredSubjects.length > 0 || semester.choiceGroups.length > 0;
}

function hasPublicCohortData(cohort: CurriculumCohort) {
  return cohort.grades.some(
    (grade) =>
      isPublicStudentGrade(grade.grade) &&
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
        .filter((grade) => isPublicStudentGrade(grade.grade))
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

                selections.push({
                  id: `${cohort.entranceYear}-${grade.grade}-${semester.semester}-${group.id}`,
                  label: group.label,
                  grade: grade.grade,
                  semester: semester.semester,
                  choose: group.choose,
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
  if (!cohort || !isPublicStudentGrade(grade)) return [];

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
  if (!cohort || !isPublicStudentGrade(grade)) return [];

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
    addName(subject.subject);
  });
  getSelectionGroups(data, cohortYear, grade, semester).forEach((group) => {
    group.options.forEach(addName);
  });

  return names;
}
