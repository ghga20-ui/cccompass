import { normalizeSubjectName } from "@/lib/curriculum/normalize";

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
