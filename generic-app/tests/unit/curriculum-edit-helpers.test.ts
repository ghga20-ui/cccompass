import { describe, expect, it } from "vitest";
import {
  createEmptyChoiceGroup,
  createEmptySubject,
  generateGroupId,
} from "@/lib/curriculum/factory";
import {
  expandSubjectBySplit,
  hasConcentratedMarker,
  parseManualSplit,
  resolveConcentratedName,
  splitMergedSubjectName,
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

describe("split-subjects.splitMergedSubjectName", () => {
  it("슬래시/가운뎃점/콤마/줄바꿈으로 분리한다", () => {
    expect(splitMergedSubjectName("물리학/화학·생명과학")).toEqual([
      "물리학",
      "화학",
      "생명과학",
    ]);
    expect(splitMergedSubjectName("문학\n독서")).toEqual(["문학", "독서"]);
  });

  it("분리할 게 없으면 정규화된 원본 1개를 반환한다", () => {
    expect(splitMergedSubjectName("  미적분Ⅰ  ")).toEqual(["미적분Ⅰ"]);
  });

  it("중복은 제거한다", () => {
    expect(splitMergedSubjectName("정보/정보")).toEqual(["정보"]);
  });
});

describe("split-subjects.expandSubjectBySplit", () => {
  it("이름 분리 결과만큼 area/credits/category를 복제한다", () => {
    const merged = {
      name: "물리학/화학",
      area: "과학",
      category: "일반선택" as const,
      credits: 4,
    };
    const expanded = expandSubjectBySplit(merged);
    expect(expanded).toHaveLength(2);
    expanded.forEach((s) => {
      expect(s.area).toBe("과학");
      expect(s.credits).toBe(4);
      expect(curriculumSubjectSchema.safeParse(s).success).toBe(true);
    });
    expect(expanded.map((s) => s.name)).toEqual(["물리학", "화학"]);
  });

  it("분리 불가하면 원본 그대로 반환한다", () => {
    const single = { name: "한국사", credits: 3 };
    expect(expandSubjectBySplit(single)).toEqual([single]);
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

describe("split-subjects.parseManualSplit (수동 분리)", () => {
  it("여러 줄을 과목명 목록으로 만든다", () => {
    expect(parseManualSplit("세계시민과 지리\n정치\n물리학")).toEqual([
      "세계시민과 지리",
      "정치",
      "물리학",
    ]);
  });

  it("쉼표로도 분리하고 중복/공백을 제거한다", () => {
    expect(parseManualSplit("화학, 화학, ,생명과학")).toEqual(["화학", "생명과학"]);
  });
});
