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
