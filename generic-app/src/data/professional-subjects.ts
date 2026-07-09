import { subjects, getSubjectByName, type Subject } from "@/data/subjects";
import { resolveTagsForProfessional } from "@/lib/professional-subjects";

export const PROFESSIONAL_AREA = "전문교과";

/** 전문교과이면서 계열 정보(professionalArea)를 가진 과목인지 */
export function isProfessionalSubject(subject: Subject): boolean {
  return subject.area === PROFESSIONAL_AREA && !!subject.professionalArea;
}

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
