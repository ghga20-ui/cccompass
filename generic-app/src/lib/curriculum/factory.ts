import type { ChoiceGroup, CurriculumSubject } from "@/lib/curriculum/schema";

/**
 * 새 과목의 기본값. name(min 1)·credits(positive)을 즉시 만족시켜
 * 추가 직후에도 schoolCurriculumSchema 검증을 통과한다.
 */
export function createEmptySubject(): CurriculumSubject {
  return { name: "새 과목", credits: 1 };
}

/**
 * 같은 학기 내 선택군들 사이에서 충돌하지 않는 새 그룹 id를 만든다.
 * adapter가 `${entranceYear}-${grade}-${semester}-${group.id}`로 prefix하므로
 * 학기 단위 유일성만 보장하면 충분하다.
 */
export function generateGroupId(existingGroups: ChoiceGroup[]): string {
  const used = new Set(existingGroups.map((group) => group.id));
  let index = 1;
  while (used.has(`group-${index}`)) {
    index += 1;
  }
  return `group-${index}`;
}

/**
 * 새 선택군의 기본값. 옵션 1개 + choose 1로 시작해
 * subjects.min(1)·choose<=subjects.length 불변식을 즉시 만족한다.
 */
export function createEmptyChoiceGroup(existingGroups: ChoiceGroup[]): ChoiceGroup {
  return {
    id: generateGroupId(existingGroups),
    label: "새 선택군",
    choose: 1,
    subjects: [createEmptySubject()],
  };
}
