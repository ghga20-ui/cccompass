import recData from "./json/university-recommendations.json";

// ========== 인터페이스 ==========
export interface RecommendationCell {
  raw: string;
  subjects: string[];
  areas: string[];
  isFlexible: boolean;
}

export interface RecommendationEntry {
  region: string;
  district: string;
  university: string;
  unitGroup: string;
  unit: string;
  core: RecommendationCell | null;
  recommended: RecommendationCell | null;
  note: string;
}

export interface RecommendationSource {
  publisher: string;
  document: string;
  published: string;
  file: string;
  basis: string;
  note: string;
}

export interface UniversityRecommendationsData {
  title: string;
  legend: string;
  source: RecommendationSource;
  entries: RecommendationEntry[];
}

// ========== 데이터 ==========
export const universityRecommendations: UniversityRecommendationsData =
  recData as unknown as UniversityRecommendationsData;

export const recommendationSource: RecommendationSource =
  universityRecommendations.source;

// ========== 관심분야 태그 → 모집단위 키워드 ==========
// interestTags(career-mapping.ts)의 id를 대교협 자료의 모집단위명에 매칭
const tagToUnitKeywords: Record<string, string[]> = {
  "medical": ["의예", "의학", "치의", "한의", "수의", "약학"],
  "nursing-health": ["간호", "보건", "물리치료", "치위생", "응급구조", "방사선", "임상"],
  "cs-ai": ["컴퓨터", "소프트웨어", "인공지능", "AI", "데이터", "정보보안", "게임"],
  "mechanical-elec": ["기계", "전기", "전자", "항공우주", "로봇", "자동차", "제어", "반도체", "정보통신"],
  "architecture": ["건축", "토목", "도시", "건설"],
  "biotech": ["생명공학", "바이오", "유전", "식품공학", "생물"],
  "natural-science": ["물리", "화학", "수학", "통계", "천문", "자연과학"],
  "bio-earth": ["생명과학", "지구", "대기", "해양", "지질", "환경과학"],
  "business": ["경영", "경제", "회계", "무역", "금융", "세무", "유통"],
  "law-politics": ["법", "정치", "행정", "경찰"],
  "media-comm": ["미디어", "언론", "신문방송", "커뮤니케이션", "콘텐츠", "광고"],
  "psychology-social": ["심리", "사회학", "사회복지", "아동", "가족", "상담"],
  "literature": ["국문", "문예창작", "어문", "문헌정보"],
  "humanities": ["철학", "사학", "역사", "고고", "인류", "종교"],
  "global": ["영어영문", "통번역", "국제", "글로벌", "외국어", "중어", "일어", "불어", "독어", "노어", "서어"],
  "education": ["교육"],
  "art-design": ["디자인", "미술", "회화", "조형", "공예", "패션"],
  "music-perform": ["음악", "성악", "기악", "작곡", "연극", "영화", "공연", "무용"],
  "sports": ["체육", "스포츠", "운동"],
  "environment": ["환경"],
  "food-nutrition": ["식품", "영양", "조리", "외식"],
};

// 우산 용어(교과 영역) → 대표 과목 확장
// university-requirements.ts의 subjectAreaMap과 같은 어휘 체계를 따른다
const areaExpansionMap: Record<string, string[]> = {
  "국어": ["화법과 언어", "독서와 작문", "문학"],
  "수학": ["대수", "미적분Ⅰ", "확률과 통계"],
  "미적분": ["미적분Ⅰ", "미적분Ⅱ"],
  "영어": ["영어Ⅰ", "영어Ⅱ"],
  "사회": ["경제", "정치", "법과 사회", "사회와 문화"],
  "과학": ["물리학", "화학", "생명과학", "지구과학"],
  "역사": ["세계사", "동아시아 역사 기행"],
  "윤리": ["윤리와 사상", "현대사회와 윤리"],
  "도덕": ["윤리와 사상", "현대사회와 윤리"],
  "지리": ["세계시민과 지리", "한국지리 탐구"],
};

// 키워드 crosstalk 차단 — 모집단위명에 이 단어가 있으면 해당 태그에서 제외
// (예: "산림경영학과"·"산업경영공학과"가 business에 잡히는 문제)
const tagToUnitExcludes: Record<string, string[]> = {
  "business": ["공학", "산림", "농업", "해양"],
  "humanities": ["역사교육"],
  "natural-science": ["교육"],
  "literature": ["문헌정보"],
};

/** 관심분야 태그에 해당하는 모집단위 엔트리 */
export function getEntriesByInterest(interestId: string): RecommendationEntry[] {
  const keywords = tagToUnitKeywords[interestId] || [];
  if (keywords.length === 0) return [];
  const excludes = tagToUnitExcludes[interestId] || [];
  return universityRecommendations.entries.filter((e) => {
    const target = `${e.unitGroup} ${e.unit}`;
    if (excludes.some((k) => target.includes(k))) return false;
    return keywords.some((k) => target.includes(k));
  });
}

export interface ConsensusOptions {
  /** true면 핵심과목만 집계 (권장과목 제외) */
  coreOnly?: boolean;
  /** true면 우산 용어("수학", "과학" 등)를 대표 과목으로 확장해 집계 */
  expandAreas?: boolean;
}

/**
 * 관심분야 기반 과목별 합의도 카운트.
 * 과목명 → 그 과목을 지정한 대학 수(대학별 중복 제거).
 *
 * 추천 보강처럼 보수적 판단이 필요하면 { coreOnly: true, expandAreas: false }로
 * 명시적 핵심과목 지정만 집계하고, 합의도 표시(뱃지)처럼 전체 그림이 필요하면
 * 기본 옵션을 쓴다.
 */
export function getSubjectConsensusByInterests(
  interests: string[],
  options: ConsensusOptions = {}
): Map<string, number> {
  const { coreOnly = false, expandAreas = true } = options;
  const subjectToUnis = new Map<string, Set<string>>();

  const add = (subjectName: string, university: string) => {
    let set = subjectToUnis.get(subjectName);
    if (!set) {
      set = new Set<string>();
      subjectToUnis.set(subjectName, set);
    }
    set.add(university);
  };

  const collectCell = (cell: RecommendationCell | null, university: string) => {
    if (!cell) return;
    cell.subjects.forEach((name) => add(name, university));
    if (expandAreas) {
      cell.areas.forEach((area) => {
        (areaExpansionMap[area] || []).forEach((name) => add(name, university));
      });
    }
  };

  interests.forEach((tagId) => {
    getEntriesByInterest(tagId).forEach((entry) => {
      collectCell(entry.core, entry.university);
      if (!coreOnly) collectCell(entry.recommended, entry.university);
    });
  });

  const scores = new Map<string, number>();
  subjectToUnis.forEach((unis, name) => scores.set(name, unis.size));
  return scores;
}

/**
 * 특정 대학의 모집단위별 핵심/권장과목 (목표 대학 오버레이용).
 */
export function getEntriesByUniversity(
  universityName: string
): RecommendationEntry[] {
  return universityRecommendations.entries.filter(
    (e) => e.university === universityName
  );
}

/** 자료에 수록된 대학 목록 (권역별 정렬) */
export function getAvailableUniversities(): {
  region: string;
  university: string;
}[] {
  const seen = new Set<string>();
  const result: { region: string; university: string }[] = [];
  universityRecommendations.entries.forEach((e) => {
    if (seen.has(e.university)) return;
    seen.add(e.university);
    result.push({ region: e.region, university: e.university });
  });
  return result;
}
