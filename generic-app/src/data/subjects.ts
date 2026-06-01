import subjectsData from "./json/subjects.json";

export interface ExplorationActivity {
  task: string;
  activityExamples: string[];
}

export interface Subject {
  id: string;
  name: string;
  category: "공통" | "일반선택" | "진로선택" | "융합선택";
  area: string;
  credits: string;
  description: string;
  keywords?: string[];
  keyContents?: string[];
  contentCategories?: string[];
  keyIdeas?: string[];
  learningActivities?: string[];
  interestFields?: string[];
  relatedCareers?: string[];
  relatedDepartments?: string[];
  explorationTasks?: string[];
  explorationActivities?: ExplorationActivity[];
  activityExamples?: string[];
  recommendedFor?: string[];
  professionalArea?: string;
  curriculumTrack?: string;
  suneung?: boolean;
}

interface SubjectsJson {
  subjects: Subject[];
}

export const subjects: Subject[] = (subjectsData as SubjectsJson).subjects;

export const subjectAreas = [
  "국어",
  "수학",
  "영어",
  "사회",
  "과학",
  "정보",
  "기술·가정",
  "체육",
  "예술",
  "제2외국어",
  "한문",
  "교양",
  "전문교과",
] as const;

export type SubjectArea = (typeof subjectAreas)[number];

export function subjectAreaMatches(
  subjectArea: string,
  selectedArea: string,
): boolean {
  if (selectedArea === "전체") return true;
  if (subjectArea === selectedArea) return true;

  if (selectedArea === "사회") {
    return subjectArea === "사회(역사/도덕 포함)";
  }
  if (selectedArea === "정보" || selectedArea === "기술·가정") {
    return subjectArea === "기술·가정/정보";
  }
  if (selectedArea === "제2외국어" || selectedArea === "한문") {
    return subjectArea === "제2외국어/한문";
  }
  if (selectedArea === "전문교과") {
    return subjectArea === "전문교과" || subjectArea.startsWith("전문교과");
  }

  return false;
}

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((subject) => subject.id === id);
}

export function getSubjectByName(name: string): Subject | undefined {
  return subjects.find((subject) => subject.name === name);
}
