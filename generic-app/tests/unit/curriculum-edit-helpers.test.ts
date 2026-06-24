import { describe, expect, it } from "vitest";
import {
  createEmptyChoiceGroup,
  createEmptySubject,
  generateGroupId,
} from "@/lib/curriculum/factory";
import {
  hasConcentratedMarker,
  resolveConcentratedName,
} from "@/lib/curriculum/split-subjects";
import {
  choiceGroupSchema,
  curriculumSubjectSchema,
  type ChoiceGroup,
} from "@/lib/curriculum/schema";

describe("factory.createEmptySubject", () => {
  it("schema를 통과하는 기본 과목을 만든다", () => {
    const result = curriculumSubjectSchema.safeParse(createEmptySubject());
    expect(result.success).toBe(true);
  });
});

describe("factory.generateGroupId", () => {
  it("기존 그룹 id와 충돌하지 않는 값을 만든다", () => {
    const existing: ChoiceGroup[] = [
      { id: "group-1", label: "A", choose: 1, subjects: [createEmptySubject()] },
      { id: "grade-2-semester-1-choice-a", label: "B", choose: 1, subjects: [createEmptySubject()] },
    ];
    const id = generateGroupId(existing);
    expect(existing.map((g) => g.id)).not.toContain(id);
    expect(id).toBe("group-2");
  });

  it("빈 목록이면 group-1을 만든다", () => {
    expect(generateGroupId([])).toBe("group-1");
  });
});

describe("factory.createEmptyChoiceGroup", () => {
  it("schema를 통과하는 기본 선택군을 만든다 (옵션 1개, choose 1)", () => {
    const group = createEmptyChoiceGroup([]);
    const result = choiceGroupSchema.safeParse(group);
    expect(result.success).toBe(true);
    expect(group.subjects).toHaveLength(1);
    expect(group.choose).toBe(1);
  });
});

describe("split-subjects.resolveConcentratedName (집중이수 ↔)", () => {
  it("1학기는 앞 과목, 2학기는 뒤 과목으로 해석한다", () => {
    expect(resolveConcentratedName("정보↔한문", 1)).toBe("정보");
    expect(resolveConcentratedName("정보↔한문", 2)).toBe("한문");
    expect(resolveConcentratedName("음악↔미술", 1)).toBe("음악");
    expect(resolveConcentratedName("음악↔미술", 2)).toBe("미술");
  });

  it("마커가 없으면 정규화된 원본을 반환한다", () => {
    expect(resolveConcentratedName("  물리학 ", 1)).toBe("물리학");
  });

  it("hasConcentratedMarker는 ↔ 포함 여부를 판별한다", () => {
    expect(hasConcentratedMarker("정보↔한문")).toBe(true);
    expect(hasConcentratedMarker("정보")).toBe(false);
  });
});
