import uniData from "./json/university-requirements.json";

// ========== 인터페이스 ==========
export interface UniversityRequirement {
  name: string;
  isFlexible: boolean;
  requiredSubjects: Record<string, boolean | string>;
}

export interface DepartmentRequirement {
  field: string;
  department: string;
  universities: UniversityRequirement[];
  summary?: Record<string, number | string>;
}

export interface UniversityRequirementsData {
  title: string;
  note: string;
  departments: DepartmentRequirement[];
}

// ========== 데이터 ==========
export const universityRequirements: UniversityRequirementsData =
  uniData as unknown as UniversityRequirementsData;

// ========== 유틸 함수 ==========

/** 계열(field)로 학과 목록 필터 */
export function getDepartmentsByField(field: string): DepartmentRequirement[] {
  return universityRequirements.departments.filter((d) => d.field === field);
}

/** 학과명으로 검색 */
export function getDepartmentByName(
  departmentName: string
): DepartmentRequirement | undefined {
  return universityRequirements.departments.find(
    (d) => d.department === departmentName
  );
}

/** 특정 과목을 요구하는 대학/학과 목록 */
export function getUniversitiesRequiringSubject(
  subjectArea: string
): { field: string; department: string; university: string }[] {
  const results: { field: string; department: string; university: string }[] = [];
  universityRequirements.departments.forEach((dept) => {
    dept.universities.forEach((uni) => {
      if (subjectArea in uni.requiredSubjects) {
        results.push({
          field: dept.field,
          department: dept.department,
          university: uni.name,
        });
      }
    });
  });
  return results;
}

/** 사용 가능한 계열 목록 */
export function getAvailableFields(): string[] {
  const fields = new Set<string>();
  universityRequirements.departments.forEach((d) => fields.add(d.field));
  return Array.from(fields);
}

/**
 * 학과 → 대입 모집단위 매핑
 * 118개 학과를 16개 대표 모집단위에 연결
 */
const deptToUnitMap: Record<string, string> = {
  // 인문
  "영어영문학과": "영어영문", "통번역학과": "영어영문",
  "철학과": "철학", "사학과": "철학", "고고학과": "철학", "인류학과": "철학",
  "문화재보존학과": "철학", "문헌정보학과": "철학",
  // 사회
  "경영학과": "경영", "경제학과": "경영", "금융보험학과": "경영",
  "무역·유통학과": "경영", "세무·회계학과": "경영", "호텔·관광경영학과": "경영",
  "심리학과": "심리", "사회학과": "심리", "사회복지학과": "심리",
  "아동학과": "심리", "정치외교학과": "심리", "국제학과": "심리",
  // 교육
  "언어 교과 교육과": "국어교육", "수학교육과": "수학교육",
  "과학 교과 교육과": "수학교육", "교육학과": "국어교육",
  // 자연
  "물리학과": "물리", "대기과학과": "물리", "천문학과": "물리",
  "화학과": "화학",
  "생명과학과": "생명과학", "수학과": "물리", "통계학과": "물리",
  "지질학과": "생명과학",
  // 공학
  "기계공학과": "기계공학", "전기공학과": "기계공학", "전자공학과": "기계공학",
  "항공우주공학과": "기계공학", "스마트모빌리티학과": "기계공학",
  "제어계측공학과": "기계공학", "항공운항학과": "기계공학",
  "컴퓨터공학과": "컴퓨터공학", "소프트웨어학과": "컴퓨터공학",
  "인공지능학과": "컴퓨터공학", "빅데이터학과": "컴퓨터공학",
  "정보통신학과": "컴퓨터공학", "정보보안학과": "컴퓨터공학",
  "산업공학과": "컴퓨터공학", "멀티미디어학과": "컴퓨터공학",
  "건축학과": "기계공학", "건축공학과": "기계공학", "토목공학과": "기계공학",
  "환경공학과": "기계공학", "도시공학과": "기계공학",
  "생명공학과": "생명과학", "화학공학과": "화학", "신소재공학과": "화학",
  "재료공학과": "화학", "식품공학과": "생명과학",
  // 의약
  "의예과": "의예", "치의예과": "의예", "한의예과": "의예",
  "약학과": "약학", "수의학과": "의예",
  "간호학과": "의예", "물리치료학과": "의예",
  // 예체능
  "디자인과": "시각디자인", "회화과": "시각디자인",
  "체육학과": "체육", "스포츠과학과": "체육", "체육교육과": "체육",
};

/**
 * 대입 데이터 기반 과목별 중요도 점수 계산
 * 특정 모집단위에서 각 과목(area)을 요구하는 대학 수를 반환
 */
export function getSubjectPriorityScores(deptName: string): Map<string, number> {
  const scores = new Map<string, number>();

  // 학과→모집단위 매핑
  const unitName = deptToUnitMap[deptName];
  if (!unitName) return scores;

  const unit = universityRequirements.departments.find(
    (d) => d.department === unitName
  );
  if (!unit || !unit.summary) return scores;

  const summary = unit.summary as Record<string, unknown>;

  // summary 구조: { 국어: [...], 수학: { 대수: [...], ... }, 영어: [...], 사회: { ... }, 과학: { ... } }
  // 과목명 → 요구 대학 수로 변환

  // 과목명과 area를 매핑하기 위한 테이블
  const subjectAreaMap: Record<string, string[]> = {
    "국어": ["국어"],
    "영어": ["영어"],
    "대수": ["대수"],
    "확률과 통계": ["확률과 통계"],
    "미적분Ⅰ": ["미적분Ⅰ"],
    "미적분Ⅱ": ["미적분Ⅱ", "미적분II"],
    "기하": ["기하"],
    "물리학": ["물리학", "역학과 에너지", "전자기와 양자"],
    "화학": ["화학", "물질과 에너지", "화학 반응의 세계"],
    "생명과학": ["생명과학", "세포와 물질대사", "생물의 유전"],
    "지구과학": ["지구과학", "지구시스템과학", "행성우주과학"],
    "일반사회": ["경제", "정치", "법과 사회", "사회와 문화"],
    "역사": ["세계사", "동아시아 역사 기행"],
    "지리": ["세계시민과 지리", "한국지리 탐구", "여행지리"],
    "윤리": ["윤리와 사상", "현대사회와 윤리", "인문학과 윤리"],
  };

  for (const [key, value] of Object.entries(summary)) {
    if (Array.isArray(value)) {
      // 직접 과목 (국어, 영어 등)
      const count = value.length;
      if (count > 0) {
        const subjectNames = subjectAreaMap[key] || [];
        subjectNames.forEach((name) => scores.set(name, count));
      }
    } else if (typeof value === "object" && value !== null) {
      // 하위 분류 (수학.대수, 과학.물리학 등)
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(subValue)) {
          const count = subValue.length;
          if (count > 0) {
            const subjectNames = subjectAreaMap[subKey] || [];
            subjectNames.forEach((name) => scores.set(name, count));
          }
        }
      }
    }
  }

  return scores;
}

/**
 * 태그 → 대표 모집단위 매핑
 */
const tagToUnitMap: Record<string, string[]> = {
  "medical": ["의예"],
  "nursing-health": ["의예"],
  "cs-ai": ["컴퓨터공학"],
  "mechanical-elec": ["기계공학"],
  "architecture": ["기계공학"],
  "biotech": ["생명과학", "화학"],
  "natural-science": ["물리", "화학"],
  "bio-earth": ["생명과학"],
  "business": ["경영"],
  "law-politics": ["심리"],
  "media-comm": ["심리"],
  "psychology-social": ["심리"],
  "literature": ["영어영문"],
  "humanities": ["철학"],
  "global": ["영어영문"],
  "education": ["국어교육", "수학교육"],
  "art-design": ["시각디자인"],
  "music-perform": ["음악"],
  "sports": ["체육"],
  "environment": ["생명과학"],
  "food-nutrition": ["생명과학"],
};

/** 태그 기반 과목 우선순위 점수 (여러 모집단위 합산) */
export function getSubjectPriorityScoresByInterests(interests: string[]): Map<string, number> {
  const scores = new Map<string, number>();

  interests.forEach((tagId) => {
    const unitNames = tagToUnitMap[tagId] || [];
    unitNames.forEach((unitName) => {
      const unit = universityRequirements.departments.find(
        (d) => d.department === unitName
      );
      if (!unit || !unit.summary) return;

      const summary = unit.summary as Record<string, unknown>;
      const subjectAreaMap: Record<string, string[]> = {
        "국어": ["국어"], "영어": ["영어"],
        "대수": ["대수"], "확률과 통계": ["확률과 통계"],
        "미적분Ⅰ": ["미적분Ⅰ"], "미적분Ⅱ": ["미적분Ⅱ", "미적분II"],
        "기하": ["기하"],
        "물리학": ["물리학", "역학과 에너지", "전자기와 양자"],
        "화학": ["화학", "물질과 에너지", "화학 반응의 세계"],
        "생명과학": ["생명과학", "세포와 물질대사", "생물의 유전"],
        "지구과학": ["지구과학", "지구시스템과학", "행성우주과학"],
        "일반사회": ["경제", "정치", "법과 사회", "사회와 문화"],
        "역사": ["세계사", "동아시아 역사 기행"],
        "지리": ["세계시민과 지리", "한국지리 탐구", "여행지리"],
        "윤리": ["윤리와 사상", "현대사회와 윤리", "인문학과 윤리"],
      };

      for (const [key, value] of Object.entries(summary)) {
        if (Array.isArray(value)) {
          const count = value.length;
          if (count > 0) {
            (subjectAreaMap[key] || []).forEach((name) =>
              scores.set(name, (scores.get(name) || 0) + count)
            );
          }
        } else if (typeof value === "object" && value !== null) {
          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            if (Array.isArray(subValue) && subValue.length > 0) {
              (subjectAreaMap[subKey] || []).forEach((name) =>
                scores.set(name, (scores.get(name) || 0) + subValue.length)
              );
            }
          }
        }
      }
    });
  });

  return scores;
}
