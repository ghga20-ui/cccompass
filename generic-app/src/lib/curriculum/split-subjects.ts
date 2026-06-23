import { normalizeSubjectName } from "@/lib/curriculum/normalize";
import type { CurriculumSubject } from "@/lib/curriculum/schema";

// 한 칸에 뭉쳐 파싱된 과목명을 나누는 구분자.
// 자동 적용이 아니라 사용자가 명시적으로 '분리' 버튼을 누를 때만 호출하므로
// 'AP/IB' 같은 합법적 슬래시 오탐 위험은 사용자가 직접 통제한다.
const SPLIT_PATTERN = /[\/,·・、\n]+/;

/**
 * 뭉친 과목명을 개별 과목명 배열로 분리한다.
 * 분리할 게 없으면 정규화된 원본 1개를 반환(no-op).
 */
export function splitMergedSubjectName(name: string): string[] {
  const parts = name
    .split(SPLIT_PATTERN)
    .map((part) => normalizeSubjectName(part))
    .filter((part) => part.length > 0);

  // 구분자로 실제로 쪼개진 경우(조각 2개 이상)에만 분리 결과를 쓴다.
  // 그 다음 중복 제거(예: "정보/정보" → ["정보"]).
  if (parts.length > 1) {
    return Array.from(new Set(parts));
  }

  return [normalizeSubjectName(name)];
}

/**
 * 과목을 이름 분리 결과만큼 복제한다. area/credits/category 등은 원본을 그대로 복제.
 * 분리 결과가 1개면 원본 그대로 반환(no-op).
 */
export function expandSubjectBySplit(subject: CurriculumSubject): CurriculumSubject[] {
  const names = splitMergedSubjectName(subject.name);
  if (names.length <= 1) {
    return [subject];
  }
  return names.map((name) => ({ ...subject, name }));
}

// 집중이수(순차수업) 표시 구분자. 예) "정보↔한문" = 1학기 정보 / 2학기 한문.
const CONCENTRATED_MARKER = "↔";

export function hasConcentratedMarker(name: string): boolean {
  return name.includes(CONCENTRATED_MARKER);
}

/**
 * 집중이수 과목명("A↔B")을 학기에 맞는 단일 과목명으로 해석한다.
 * 1학기 → 앞(A), 2학기 → 뒤(B). 마커가 없으면 정규화된 원본 반환.
 */
export function resolveConcentratedName(name: string, semester: number): string {
  if (!name.includes(CONCENTRATED_MARKER)) {
    return normalizeSubjectName(name);
  }
  const parts = name
    .split(CONCENTRATED_MARKER)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return normalizeSubjectName(name);
  }
  const index = Math.min(Math.max(semester - 1, 0), parts.length - 1);
  return parts[index];
}

/**
 * 집중이수 과목명("A↔B")을 개별 과목명 배열로 분해한다.
 * 마커가 없으면 정규화된 원본 1개를 반환. (선택 칩 UI에서 사용)
 */
export function splitConcentratedNames(name: string): string[] {
  if (!name.includes(CONCENTRATED_MARKER)) {
    return [normalizeSubjectName(name)];
  }
  const parts = name
    .split(CONCENTRATED_MARKER)
    .map((part) => normalizeSubjectName(part))
    .filter((part) => part.length > 0);
  return parts.length > 0 ? Array.from(new Set(parts)) : [normalizeSubjectName(name)];
}

/**
 * 사용자가 직접 입력한 여러 줄/쉼표 텍스트를 과목명 목록으로 만든다.
 * 자동 구분자가 없는 뭉친 과목명을 수동으로 분리할 때 사용.
 */
export function parseManualSplit(text: string): string[] {
  const parts = text
    .split(/[\n,]+/)
    .map((part) => normalizeSubjectName(part))
    .filter((part) => part.length > 0);
  return Array.from(new Set(parts));
}
