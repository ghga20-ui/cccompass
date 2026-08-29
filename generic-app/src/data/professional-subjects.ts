import { subjects, getSubjectByName, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";
import { PROFESSIONAL_AREA, isProfessionalSubject } from "@/lib/recommend-items";

// 전문교과 판별 규칙은 lib/recommend-items.ts가 단일 출처 (추천 정렬과 같은 규칙을 써야 함)
export { PROFESSIONAL_AREA, isProfessionalSubject };

/**
 * 관심분야 태그들에 해당하는 전문교과 목록.
 * 업로드 편제 과목까지 매칭하려면 subjectCatalog.getSubjectByName 주입.
 * 개설 여부 필터는 호출자가 담당한다.
 */
export function getProfessionalSubjectsForTags(
  tags: string[],
  resolveSubject: (name: string) => Subject | undefined = getSubjectByName,
): Subject[] {
  if (tags.length === 0) return [];
  const tagSet = new Set(tags);
  const result: Subject[] = [];
  subjects.forEach((staticSubject) => {
    if (!isProfessionalSubject(staticSubject)) return;
    const tagsForSubject = resolveTagsForProfessional(
      staticSubject.name,
      staticSubject.professionalArea,
    );
    if (!tagsForSubject.some((tag) => tagSet.has(tag))) return;
    result.push(resolveSubject(staticSubject.name) ?? staticSubject);
  });
  return result;
}
