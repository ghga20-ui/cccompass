import { subjects, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";

export const PROFESSIONAL_AREA = "전문교과";

/** 전문교과이면서 계열 정보(professionalArea)를 가진 과목인지 */
export function isProfessionalSubject(subject: Subject): boolean {
  return subject.area === PROFESSIONAL_AREA && !!subject.professionalArea;
}

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
