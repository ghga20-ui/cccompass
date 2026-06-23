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

const jsonSubjects: Subject[] = (subjectsData as SubjectsJson).subjects;

// 전국 2022 개정 교육과정 공통 과목 (편제 JSON에는 보통 빠져 있어 카탈로그에 보강)
const additionalSubjects: Subject[] = [
  { id: "common_korean_1", name: "공통국어1", category: "공통", area: "국어", credits: "3", description: "국어의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_korean_2", name: "공통국어2", category: "공통", area: "국어", credits: "4", description: "국어의 기초 역량을 심화하는 공통 과목입니다." },
  { id: "common_math_1", name: "공통수학1", category: "공통", area: "수학", credits: "4", description: "수학의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_math_2", name: "공통수학2", category: "공통", area: "수학", credits: "4", description: "수학의 기초 역량을 심화하는 공통 과목입니다." },
  { id: "common_english_1", name: "공통영어1", category: "공통", area: "영어", credits: "4", description: "영어의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_english_2", name: "공통영어2", category: "공통", area: "영어", credits: "3", description: "영어의 기초 역량을 심화하는 공통 과목입니다." },
  { id: "common_social_1", name: "통합사회1", category: "공통", area: "사회", credits: "3~4", description: "사회 영역의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_social_2", name: "통합사회2", category: "공통", area: "사회", credits: "3~4", description: "사회 영역의 기초 역량을 심화하는 공통 과목입니다." },
  { id: "common_korean_history_1", name: "한국사1", category: "공통", area: "사회", credits: "3", description: "한국의 역사를 학습하는 공통 필수 과목입니다." },
  { id: "common_korean_history_2", name: "한국사2", category: "공통", area: "사회", credits: "3", description: "한국의 근현대사를 학습하는 공통 필수 과목입니다." },
  { id: "common_science_1", name: "통합과학1", category: "공통", area: "과학", credits: "3~4", description: "과학의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_science_2", name: "통합과학2", category: "공통", area: "과학", credits: "3~4", description: "과학의 기초 역량을 심화하는 공통 과목입니다." },
  { id: "common_science_lab_1", name: "과학탐구실험1", category: "공통", area: "과학", credits: "1", description: "과학 탐구 실험의 기초를 학습하는 공통 과목입니다." },
  { id: "common_science_lab_2", name: "과학탐구실험2", category: "공통", area: "과학", credits: "1", description: "과학 탐구 실험을 심화하는 공통 과목입니다." },
];

export const subjects: Subject[] = [...jsonSubjects, ...additionalSubjects];

const subjectByName = new Map<string, Subject>();
subjects.forEach((s) => subjectByName.set(s.name, s));

const subjectById = new Map<string, Subject>();
subjects.forEach((s) => subjectById.set(s.id, s));

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
  return subjectById.get(id);
}

export function getSubjectByName(name: string): Subject | undefined {
  return subjectByName.get(name);
}

// 학생 런타임(subject-catalog.ts)과 동일한 정규화: 공백 정리 + 소문자.
// 이 집합에 없는 과목명은 학생 화면에서 '빈 추천 데이터' fallback이 되어
// 관심분야/학과 추천에 노출되지 않는다.
function normalizeForMatch(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

const knownSubjectNames = new Set(subjects.map((s) => normalizeForMatch(s.name)));

/** 과목명이 마스터 카탈로그(2022 보통교과 + 전문교과 + 공통)에 있는지. */
export function isKnownSubjectName(name: string): boolean {
  const normalized = normalizeForMatch(name);
  return normalized.length > 0 && knownSubjectNames.has(normalized);
}

export function getSubjectsByArea(area: string): Subject[] {
  return subjects.filter((s) => subjectAreaMatches(s.area, area));
}

export function getSubjectsByCategory(category: Subject["category"]): Subject[] {
  return subjects.filter((s) => s.category === category);
}
