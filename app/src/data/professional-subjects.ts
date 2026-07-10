import { subjects, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";
import { PROFESSIONAL_AREA, isProfessionalSubject } from "@/lib/recommend-items";

// 전문교과 판별 규칙은 lib/recommend-items.ts가 단일 출처 (추천 정렬과 같은 규칙을 써야 함)
export { PROFESSIONAL_AREA, isProfessionalSubject };

/**
 * 관심분야 태그들에 해당하는 전문교과 목록.
 * 개설 여부 필터는 호출자(추천 화면)가 담당한다.
 */
export function getProfessionalSubjectsForTags(tags: string[]): Subject[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  return subjects.filter((subject) => {
    if (!isProfessionalSubject(subject)) return false;
    return resolveTagsForProfessional(subject.name, subject.professionalArea).some((tag) =>
      tagSet.has(tag)
    );
  });
}
