import subjectsData from "./json/subjects.json";

export interface Subject {
  id: string;
  name: string;
  category: "공통" | "일반선택" | "진로선택" | "융합선택";
  area: string;
  credits: string;
  description: string;
  keyContents?: string[];
  relatedCareers?: string[];
  relatedDepartments?: string[];
  suneung?: boolean;
}

// JSON에서 가져온 109개 과목
const jsonSubjects: Subject[] = subjectsData.subjects as Subject[];

// school.json에 있지만 subjects.json에 없는 과목들 (공통과목, 제2외국어 개별 등)
const additionalSubjects: Subject[] = [
  // 공통국어
  { id: "common_korean_1", name: "공통국어1", category: "공통", area: "국어", credits: "3", description: "국어의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_korean_2", name: "공통국어2", category: "공통", area: "국어", credits: "4", description: "국어의 기초 역량을 심화하는 공통 과목입니다." },
  // 공통수학
  { id: "common_math_1", name: "공통수학1", category: "공통", area: "수학", credits: "4", description: "수학의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_math_2", name: "공통수학2", category: "공통", area: "수학", credits: "4", description: "수학의 기초 역량을 심화하는 공통 과목입니다." },
  // 공통영어
  { id: "common_english_1", name: "공통영어1", category: "공통", area: "영어", credits: "4", description: "영어의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_english_2", name: "공통영어2", category: "공통", area: "영어", credits: "3", description: "영어의 기초 역량을 심화하는 공통 과목입니다." },
  // 통합사회
  { id: "common_social_1", name: "통합사회1", category: "공통", area: "사회", credits: "3~4", description: "사회 영역의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_social_2", name: "통합사회2", category: "공통", area: "사회", credits: "3~4", description: "사회 영역의 기초 역량을 심화하는 공통 과목입니다." },
  // 한국사
  { id: "common_korean_history_1", name: "한국사1", category: "공통", area: "사회", credits: "3", description: "한국의 역사를 학습하는 공통 필수 과목입니다." },
  { id: "common_korean_history_2", name: "한국사2", category: "공통", area: "사회", credits: "3", description: "한국의 근현대사를 학습하는 공통 필수 과목입니다." },
  // 통합과학
  { id: "common_science_1", name: "통합과학1", category: "공통", area: "과학", credits: "3~4", description: "과학의 기초 역량을 기르는 공통 과목입니다." },
  { id: "common_science_2", name: "통합과학2", category: "공통", area: "과학", credits: "3~4", description: "과학의 기초 역량을 심화하는 공통 과목입니다." },
  // 과학탐구실험
  { id: "common_science_lab_1", name: "과학탐구실험1", category: "공통", area: "과학", credits: "1", description: "과학 탐구 실험의 기초를 학습하는 공통 과목입니다." },
  { id: "common_science_lab_2", name: "과학탐구실험2", category: "공통", area: "과학", credits: "1", description: "과학 탐구 실험을 심화하는 공통 과목입니다." },
  // 제2외국어 개별 과목
  { id: "lang2_japanese", name: "일본어", category: "일반선택", area: "제2외국어", credits: "3", description: "일본어의 기초 의사소통 능력과 일본 문화를 학습하는 과목입니다." },
  { id: "lang2_chinese", name: "중국어", category: "일반선택", area: "제2외국어", credits: "3", description: "중국어의 기초 의사소통 능력과 중국 문화를 학습하는 과목입니다." },
  { id: "lang2_japanese_conv", name: "일본어 회화", category: "진로선택", area: "제2외국어", credits: "3", description: "일본어 회화 능력을 기르는 과목입니다." },
  { id: "lang2_japanese_culture", name: "일본 문화", category: "진로선택", area: "제2외국어", credits: "3", description: "일본 문화를 이해하고 탐구하는 과목입니다." },
  { id: "lang2_japanese_tourism", name: "관광 일본어", category: "진로선택", area: "제2외국어", credits: "3", description: "관광 분야에서 활용하는 일본어를 학습하는 과목입니다." },
  { id: "lang2_chinese_conv", name: "중국어 회화", category: "진로선택", area: "제2외국어", credits: "3", description: "중국어 회화 능력을 기르는 과목입니다." },
  { id: "lang2_chinese_culture", name: "중국 문화", category: "진로선택", area: "제2외국어", credits: "3", description: "중국 문화를 이해하고 탐구하는 과목입니다." },
  { id: "lang2_chinese_tourism", name: "관광 중국어", category: "진로선택", area: "제2외국어", credits: "3", description: "관광 분야에서 활용하는 중국어를 학습하는 과목입니다." },
  // 기타
  { id: "info_programming", name: "프로그래밍", category: "진로선택", area: "정보", credits: "3", description: "프로그래밍 언어와 소프트웨어 개발의 기초를 학습합니다." },
  { id: "info_cs", name: "정보과학", category: "진로선택", area: "정보", credits: "3", description: "정보과학의 원리와 활용을 심화 학습합니다." },
  { id: "tech_food_nutrition", name: "식품과 영양", category: "진로선택", area: "기술·가정", credits: "3", description: "식품과 영양에 관한 과학적 지식을 학습합니다." },
  { id: "art_chorus_ensemble", name: "합창·합주", category: "진로선택", area: "예술", credits: "3", description: "합창과 합주를 통한 음악적 표현을 탐구합니다." },
  { id: "art_drawing", name: "드로잉", category: "진로선택", area: "예술", credits: "3", description: "드로잉의 기초와 표현 기법을 학습합니다." },
  { id: "soc_modern_world_change", name: "현대 세계의 변화", category: "진로선택", area: "사회", credits: "3", description: "현대 세계의 정치, 경제, 사회적 변화를 탐구합니다." },
  { id: "lib_critical_question_solution", name: "비판적 질문과 창의적 해결", category: "융합선택", area: "교양", credits: "2", description: "비판적 질문과 창의적 문제 해결 역량을 기르는 과목입니다." },
  { id: "info_ai_ethics", name: "인공지능 윤리", category: "융합선택", area: "교양", credits: "2", description: "인공지능 활용과 관련된 윤리적 쟁점을 탐구하는 교양 과목입니다." },
  // 논술, 생태와 환경은 기존 JSON에 있을 수 있으나, school.json에서 "논술↔생태와 환경"으로 묶여 있어 개별 항목으로도 제공
  { id: "lib_essay_alt", name: "논술", category: "융합선택", area: "교양", credits: "2~3", description: "논리적 글쓰기와 비판적 사고를 학습합니다." },
  { id: "lib_eco_alt", name: "생태와 환경", category: "일반선택", area: "교양", credits: "2~3", description: "생태계와 환경 문제를 학습합니다." },
];

// 전체 과목 배열
export const subjects: Subject[] = [...jsonSubjects, ...additionalSubjects];

// 이름으로 과목을 빠르게 찾기 위한 맵
const subjectByName = new Map<string, Subject>();
subjects.forEach((s) => {
  subjectByName.set(s.name, s);
});

// ID로 과목을 빠르게 찾기 위한 맵
const subjectById = new Map<string, Subject>();
subjects.forEach((s) => {
  subjectById.set(s.id, s);
});

export const subjectAreas = [
  "국어", "수학", "영어", "사회", "과학", "정보",
  "기술·가정", "체육", "예술", "제2외국어", "한문", "교양",
] as const;

export type SubjectArea = (typeof subjectAreas)[number];

export function getSubjectById(id: string): Subject | undefined {
  return subjectById.get(id);
}

export function getSubjectByName(name: string): Subject | undefined {
  return subjectByName.get(name);
}

export function getSubjectsByArea(area: string): Subject[] {
  return subjects.filter((s) => s.area === area);
}

export function getSubjectsByCategory(category: Subject["category"]): Subject[] {
  return subjects.filter((s) => s.category === category);
}
