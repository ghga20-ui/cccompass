import type { CurriculumSubject } from "@/lib/curriculum/schema";

export interface ReviewFlag {
  /** 배지에 짧게 표시할 라벨 */
  label: string;
  /** 왜 확인이 필요한지 + 어떻게 고치는지 (비개발자용 평이한 안내) */
  reason: string;
}

/** 과목명에서 공백/기호를 제외한 '붙어있는 한글 덩어리'의 최대 길이 */
function longestKoreanRun(name: string): number {
  const runs = name.split(/[^가-힣]+/).filter(Boolean);
  return runs.reduce((max, run) => Math.max(max, run.length), 0);
}

/**
 * 파싱 결과 과목이 사람 검수가 필요한지 판정.
 * 우선순위: 집중이수(↔) > 과목 뭉침 의심 > AI 불확실.
 * null이면 특별히 확인할 필요 없음.
 */
export function getReviewFlag(subject: CurriculumSubject): ReviewFlag | null {
  if (subject.name.includes("↔")) {
    return {
      label: "집중이수 확인",
      reason:
        "두 과목이 학기별로 번갈아 열리는 '집중이수'일 수 있어요. '집중이수 N학기 배정' 버튼을 눌러 이 학기에 맞는 과목만 남겨 주세요.",
    };
  }

  if (longestKoreanRun(subject.name) >= 12) {
    return {
      label: "붙어있는지 확인",
      reason:
        "여러 과목이 하나로 붙어서 읽혔을 수 있어요. 실제로 여러 과목이면 '과목 나누기' 버튼으로 나눠 주세요.",
    };
  }

  if (typeof subject.confidence === "number" && subject.confidence < 0.5) {
    return {
      label: "확인 필요",
      reason:
        "AI가 이 과목을 정확히 읽었는지 확신하지 못했어요. 원본 편제표와 과목명·학점이 맞는지 확인해 주세요.",
    };
  }

  return null;
}
