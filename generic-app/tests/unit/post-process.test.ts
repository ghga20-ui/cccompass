import { describe, expect, it } from "vitest";
import { splitByMasterList, postProcessCurriculum } from "@/lib/curriculum/post-process";
import { getReviewFlag } from "@/lib/curriculum/review-flags";
import { schoolCurriculumSchema, type ChoiceGroup, type CurriculumSemester } from "@/lib/curriculum/schema";

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
  function processSemesters(semesters: CurriculumSemester[]) {
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [{ entranceYear: "2026", label: "2026", grades: [{ grade: 1, semesters }] }],
    });
    return postProcessCurriculum(input).cohorts[0].grades[0].semesters;
  }

  function processChoiceGroups(choiceGroups: ChoiceGroup[]) {
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [{
        entranceYear: "2026",
        label: "2026",
        grades: [{ grade: 2, semesters: [{ semester: 1, choiceGroups }] }],
      }],
    });
    return postProcessCurriculum(input).cohorts[0].grades[0].semesters[0].choiceGroups;
  }

  const baseGroup: ChoiceGroup = {
    id: "g1",
    label: "선택군",
    choose: 1,
    subjects: [
      { name: "문학", credits: 2 },
      { name: "경제", credits: 2 },
      { name: "드로잉", credits: 2 },
    ],
  };

  it.each<[string, Partial<ChoiceGroup>]>([
    ["선택 수", { choose: 2 }],
    ["최대 선택 수", { maxChoose: 2 }],
    ["그룹 학점", { creditsEach: 3 }],
    ["그룹명", { label: "별도 선택군" }],
    ["이수 조건", { notes: ["진로 계열에 따라 선택"] }],
    ["과목 학점", { subjects: baseGroup.subjects.map((subject) => ({ ...subject, credits: 3 })) }],
    ["과목 영역", { subjects: baseGroup.subjects.map((subject) => ({ ...subject, area: "예술" })) }],
    ["과목 유형", { subjects: baseGroup.subjects.map((subject) => ({ ...subject, category: "진로선택" })) }],
  ])("과목명이 같아도 %s 조건이 다른 선택군을 보존한다", (_, difference) => {
    const other = { ...baseGroup, ...difference, id: "g2" };
    expect(processChoiceGroups([baseGroup, other])).toEqual([baseGroup, other]);
  });

  it("기본 선택 수가 같아도 최소 선택 수가 다른 선택군을 보존한다", () => {
    const first = { ...baseGroup, choose: 2, minChoose: 2 };
    const other = { ...first, id: "g2", minChoose: 1 };
    expect(processChoiceGroups([first, other])).toEqual([first, other]);
  });

  it("순서와 생성 ID만 다른 동일 선택군은 중복 제거한다", () => {
    const other = { ...baseGroup, id: "g2", subjects: [...baseGroup.subjects].reverse() };
    expect(processChoiceGroups([baseGroup, other])).toEqual([baseGroup]);
  });

  it.each([undefined, 0.95, 0.3])("뭉친 과목을 분리하면 원문과 검수 경고를 유지한다 (confidence=%s)", (confidence) => {
    const original = { name: "윤리와 사상드로잉", credits: 4, confidence };
    const input = schoolCurriculumSchema.parse({
      schoolName: "테스트고",
      cohorts: [{
        entranceYear: "2026",
        label: "2026",
        grades: [{
          grade: 2,
          semesters: [{
            semester: 1,
            requiredSubjects: [original],
            choiceGroups: [{ id: "g1", label: "택1", choose: 1, subjects: [original] }],
          }],
        }],
      }],
    });
    const semester = postProcessCurriculum(input).cohorts[0].grades[0].semesters[0];
    for (const subject of [...semester.requiredSubjects, ...semester.choiceGroups[0].subjects]) {
      expect(subject.credits).toBe(4);
      expect(getReviewFlag(subject)).toMatchObject({ reason: expect.stringContaining("학점") });
      expect(subject.rawText).toBe(original.name);
      expect(subject.confidence).toBeLessThan(0.5);
      if (confidence !== undefined) expect(subject.confidence).toBeLessThanOrEqual(confidence);
    }
  });

  it("분리한 과목에 추출된 원문이 있으면 덮어쓰지 않는다", () => {
    const groups = processChoiceGroups([{
      ...baseGroup,
      subjects: [{ name: "윤리와 사상드로잉", credits: 4, rawText: "윤리와 사상 드로잉 (4)" }],
    }]);
    expect(groups[0].subjects.map((subject) => subject.rawText)).toEqual([
      "윤리와 사상 드로잉 (4)",
      "윤리와 사상 드로잉 (4)",
    ]);
  });

  it.each([false, true])("집중이수 학점을 해당 학기 원본에서 가져온다 (학기 역순=%s)", (reverse) => {
    const semesters: CurriculumSemester[] = [
      { semester: 1, requiredSubjects: [{ name: "정보↔한문", credits: 2, rawText: "1학기 2학점" }], choiceGroups: [] },
      { semester: 2, requiredSubjects: [{ name: "정보↔한문", credits: 3, rawText: "2학기 3학점" }], choiceGroups: [] },
    ];
    const output = processSemesters(reverse ? semesters.reverse() : semesters);
    expect(output.find((semester) => semester.semester === 1)?.requiredSubjects).toEqual([
      { name: "정보", credits: 2, rawText: "1학기 2학점" },
    ]);
    expect(output.find((semester) => semester.semester === 2)?.requiredSubjects).toEqual([
      { name: "한문", credits: 3, rawText: "2학기 3학점" },
    ]);
  });

  it("다른 학기의 집중이수 추론보다 명시된 단일 과목 학점을 우선한다", () => {
    const output = processSemesters([
      { semester: 1, requiredSubjects: [{ name: "정보↔한문", credits: 2 }], choiceGroups: [] },
      { semester: 2, requiredSubjects: [{ name: "한문", credits: 4 }], choiceGroups: [] },
    ]);
    expect(output[1].requiredSubjects).toEqual([{ name: "한문", credits: 4 }]);
  });

  it("집중이수 쌍 내부의 붙은 표준 과목명도 정규화한다", () => {
    const output = processSemesters([
      { semester: 1, requiredSubjects: [{ name: "윤리와사상↔드로잉", credits: 2 }], choiceGroups: [] },
      { semester: 2, requiredSubjects: [], choiceGroups: [] },
    ]);
    expect(output[0].requiredSubjects[0].name).toBe("윤리와 사상");
    expect(output[1].requiredSubjects[0].name).toBe("드로잉");
    expect(processChoiceGroups([{
      ...baseGroup, subjects: [{ name: "윤리와사상↔드로잉", credits: 2 }],
    }])[0].subjects[0].name).toBe("윤리와 사상");
    const single = processSemesters([
      { semester: 2, requiredSubjects: [{ name: "드로잉↔윤리와사상", credits: 2 }], choiceGroups: [] },
    ]);
    expect(single[0].requiredSubjects[0].name).toBe("윤리와 사상");
  });

  it.each([1, 2])("같은 학기의 집중이수 학점이 충돌하면 원본을 보존하고 검수를 요구한다 (%s개 학기)", (count) => {
    const subjects = [
      { name: "정보↔한문", credits: 2, rawText: "첫 행", confidence: 0.9 },
      { name: "정보↔한문", credits: 3, rawText: "두 번째 행", confidence: 0.4 },
    ];
    const semesters: CurriculumSemester[] = [
      { semester: 1, requiredSubjects: subjects, choiceGroups: [] },
    ];
    if (count === 2) semesters.push({ semester: 2, requiredSubjects: [], choiceGroups: [] });
    const output = processSemesters(semesters);
    expect(output[0].requiredSubjects).toEqual(subjects);
    if (count === 2) expect(output[1].requiredSubjects).toEqual([]);
    output[0].requiredSubjects.forEach((subject) => {
      expect(getReviewFlag(subject)?.label).toBe("집중이수 확인");
    });
  });

  it.each([1, 2])("두 과목이 아닌 집중이수 표현은 임의 분리하지 않는다 (%s개 학기)", (count) => {
    const original = { name: "정보↔한문↔드로잉", credits: 2, confidence: 0.9 };
    const semesters: CurriculumSemester[] = [{
      semester: 1,
      requiredSubjects: [original],
      choiceGroups: [{ ...baseGroup, subjects: [original] }],
    }];
    if (count === 2) semesters.push({ semester: 2, requiredSubjects: [], choiceGroups: [] });
    const output = processSemesters(semesters);
    expect(output[0].requiredSubjects).toEqual([original]);
    expect(output[0].choiceGroups[0].subjects).toEqual([original]);
    expect(getReviewFlag(output[0].requiredSubjects[0])?.label).toBe("집중이수 확인");
  });

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
