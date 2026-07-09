/**
 * 전문교과 → 관심분야 태그 매핑 (순수 로직).
 *
 * JSON을 import하지 않는다 — tests/*.mjs가 이 파일을 직접 import하기 때문.
 * 데이터 결합은 data/professional-subjects.ts가 담당한다.
 */

/**
 * professionalArea(22종) → 관심분야 태그 기본값.
 *
 * 빈 배열은 "추천하지 않음"을 뜻한다. 한 area에 여러 계열이 섞여 있어
 * 기본값을 주면 오추천이 확정되는 경우(예술계열: 음악·미술·무용·연극·영화·
 * 사진·문예창작 62과목)에는 기본값을 두지 않고 오버라이드로만 채운다.
 * 미분류 과목은 현재 동작(추천 안 됨)과 같으므로 회귀가 아니다.
 */
export const AREA_TO_TAGS: Record<string, string[]> = {
  "정보·통신": ["cs-ai"],
  기계: ["mechanical-elec"],
  "전기·전자": ["mechanical-elec"],
  재료: ["mechanical-elec"],
  건설: ["architecture"],
  화학공업: ["biotech"],
  "환경·안전": ["environment"],
  "경영·금융": ["business"],
  음식조리: ["food-nutrition"],
  식품가공: ["food-nutrition"],
  "농림·수산": ["food-nutrition", "bio-earth"],
  "보건·복지": ["nursing-health", "psychology-social"],
  외국어계열: ["global"],
  국제계열: ["global"],
  체육계열: ["sports"],
  "섬유･의류": ["art-design"],
  "인쇄･출판･공예": ["art-design"],
  "디자인·문화콘텐츠": ["art-design", "media-comm"],
  과학계열: ["natural-science"],
  예술계열: [],
  "미용·관광·레저": [],
  전문공통: [],
};

/** 과목명 단위 오버라이드. area 기본값을 대체한다(병합하지 않는다). */
export const SUBJECT_OVERRIDES: Record<string, string[]> = {
  // area 기본값을 넓히는 사례
  프로그래밍: ["cs-ai", "mechanical-elec"],
  정보과학: ["cs-ai", "natural-science"],
  "이산 수학": ["natural-science", "cs-ai"],
  "고급 물리학": ["natural-science", "mechanical-elec"],
  "물리학 실험": ["natural-science", "mechanical-elec"],
  "고급 화학": ["natural-science", "biotech"],
  "화학 실험": ["natural-science", "biotech"],
  "고급 생명과학": ["bio-earth", "biotech", "medical"],
  "생명과학 실험": ["bio-earth", "biotech", "medical"],
  "고급 지구과학": ["bio-earth"],
  "지구과학 실험": ["bio-earth"],

  // 예술계열 — area 기본값 없음
  드로잉: ["art-design"],
  "미술 이론": ["art-design"],
  미술사: ["art-design"],
  "미술 전공 실기": ["art-design"],
  "조형 탐구": ["art-design"],
  "미술 매체 탐구": ["art-design"],
  "미술과 사회": ["art-design"],
  "평면 조형": ["art-design"],
  "입체 조형": ["art-design"],
  "매체 미술": ["art-design"],
  "합창·합주": ["music-perform"],
  합창: ["music-perform"],
  합주: ["music-perform"],
  "음악 이론": ["music-perform"],
  음악사: ["music-perform"],
  "시창·청음": ["music-perform"],
  "음악 전공 실기": ["music-perform"],
  "음악 공연 실습": ["music-perform"],
  "음악과 문화": ["music-perform"],
  "공연 실습": ["music-perform"],

  // 국제계열 — area 기본값은 global. 법·정치 성격이 뚜렷한 과목은 law-politics도 부여.
  // (오버라이드는 area 기본값을 대체하므로 global을 명시해야 유실되지 않는다)
  국제법: ["global", "law-politics"],
  "국제 정치": ["global", "law-politics"],
  "국제 관계와 국제기구": ["global", "law-politics"],

  // 미용·관광·레저 — area 기본값 없음
  "관광 일반": ["global"],
  "관광 사업": ["global"],
  "관광 서비스": ["global"],
  "관광 영어": ["global"],
  "관광 일본어": ["global"],
  "관광 중국어": ["global"],
  "미용의 기초": ["art-design"],
  "미용 안전·보건": ["art-design"],
};

/**
 * 전문교과 과목이 속하는 관심분야 태그.
 * professionalArea가 없으면(커리컴퍼스 fallback Subject) 항상 [].
 */
export function resolveTagsForProfessional(
  name: string,
  professionalArea: string | undefined
): string[] {
  if (!professionalArea) return [];
  const override = SUBJECT_OVERRIDES[name];
  if (override) return override;
  return AREA_TO_TAGS[professionalArea] ?? [];
}
