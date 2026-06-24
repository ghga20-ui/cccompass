import { describe, expect, it } from "vitest";
import { splitByMasterList, postProcessCurriculum } from "@/lib/curriculum/post-process";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";

describe("post-process.splitByMasterList", () => {
  it("마스터리스트로 완전히 소비되는 뭉친 과목명을 분해한다", () => {
    expect(splitByMasterList("기후변화와지속가능한세계경제")).toEqual([
      "기후변화와 지속가능한 세계",
      "경제",
    ]);
    expect(splitByMasterList("윤리와 사상드로잉")).toEqual(["윤리와 사상", "드로잉"]);
  });

  it("잔재가 남으면(미인식 과목 포함) 분리하지 않는다(안전)", () => {
    // '세계지리','세계사' 등이 마스터리스트에 정확히 없으면 null
    expect(splitByMasterList("존재하지않는과목명xyz")).toBeNull();
  });

  it("단일 과목이면 null(분리 불가)", () => {
    expect(splitByMasterList("문학")).toBeNull();
  });
});

describe("post-process.postProcessCurriculum", () => {
  it("뭉친 지정과목을 분해하고 결과가 스키마를 통과한다", () => {
    const input = {
      schoolName: "테스트고",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026 입학생",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [
                    { name: "윤리와 사상드로잉", credits: 2 },
                  ],
                  choiceGroups: [],
                },
              ],
            },
          ],
        },
      ],
    };
    const out = postProcessCurriculum(schoolCurriculumSchema.parse(input));
    const names = out.cohorts[0].grades[0].semesters[0].requiredSubjects.map((s) => s.name);
    expect(names).toEqual(["윤리와 사상", "드로잉"]);
    expect(schoolCurriculumSchema.safeParse(out).success).toBe(true);
  });

  it("같은 학기 동일 구성 선택군 중복을 제거한다", () => {
    const group = {
      id: "g1",
      label: "택1",
      choose: 1,
      subjects: [{ name: "문학", credits: 4 }],
    };
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026",
          grades: [
            {
              grade: 2,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [],
                  choiceGroups: [group, { ...group, id: "g2" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const out = postProcessCurriculum(input);
    expect(out.cohorts[0].grades[0].semesters[0].choiceGroups).toHaveLength(1);
  });

  it("집중이수(↔) 지정과목을 앞→1학기 / 뒤→2학기로 분리한다", () => {
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026",
          grades: [
            {
              grade: 1,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "정보↔한문", credits: 3 }],
                  choiceGroups: [],
                },
                { semester: 2, requiredSubjects: [], choiceGroups: [] },
              ],
            },
          ],
        },
      ],
    });
    const out = postProcessCurriculum(input);
    const sems = out.cohorts[0].grades[0].semesters;
    expect(sems.find((s) => s.semester === 1)!.requiredSubjects.map((s) => s.name)).toEqual(["정보"]);
    expect(sems.find((s) => s.semester === 2)!.requiredSubjects.map((s) => s.name)).toEqual(["한문"]);
    expect(schoolCurriculumSchema.safeParse(out).success).toBe(true);
  });

  it("↔가 양 학기에 중복돼 있어도 학기당 하나씩만 남긴다", () => {
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [
        {
          entranceYear: "2026",
          label: "2026",
          grades: [
            {
              grade: 1,
              semesters: [
                {
                  semester: 1,
                  requiredSubjects: [{ name: "정보↔한문", credits: 3 }],
                  choiceGroups: [],
                },
                {
                  semester: 2,
                  requiredSubjects: [{ name: "정보↔한문", credits: 3 }],
                  choiceGroups: [],
                },
              ],
            },
          ],
        },
      ],
    });
    const out = postProcessCurriculum(input);
    const sems = out.cohorts[0].grades[0].semesters;
    expect(sems.find((s) => s.semester === 1)!.requiredSubjects.map((s) => s.name)).toEqual(["정보"]);
    expect(sems.find((s) => s.semester === 2)!.requiredSubjects.map((s) => s.name)).toEqual(["한문"]);
  });
});
