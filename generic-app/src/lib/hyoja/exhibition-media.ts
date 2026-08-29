import postersData from "@/data/json/exhibition-posters.json";

// 효자고가 제작한 공식 과목 포스터 (전국 공유, 옵션 b).
// 파일명 규칙: /exhibition/posters/{subjectId}.jpg
const posterSubjectIds = new Set<string>(
  (postersData as { posterSubjectIds: string[] }).posterSubjectIds,
);

export function hasExhibitionPoster(subjectId: string): boolean {
  return posterSubjectIds.has(subjectId);
}

/** subjectId에 공식 포스터가 있으면 경로, 없으면 null */
export function getPosterImageSrc(subjectId: string): string | null {
  return posterSubjectIds.has(subjectId)
    ? `/exhibition/posters/${subjectId}.jpg`
    : null;
}

export function getExhibitionPosterSubjectIds(): string[] {
  return Array.from(posterSubjectIds);
}
