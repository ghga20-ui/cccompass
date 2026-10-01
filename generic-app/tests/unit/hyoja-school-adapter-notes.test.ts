import { describe, expect, it } from "vitest";
import { adaptCurriculumForStudentAssistant } from "@/lib/hyoja/school-adapter";
import { curriculumWithGroup, seoulChoiceGroup, seoulGroupNote } from "../fixtures/seoul-group-notes";

describe("student curriculum group notes", () => {
  it("preserves source and teacher notes verbatim without changing structured choice limits", () => {
    const notes = [seoulGroupNote, "담당 교사 확인 필요\n원문 표와 주석을 함께 확인하세요."];
    const curriculum = curriculumWithGroup({ ...seoulChoiceGroup, notes });

    const group = adaptCurriculumForStudentAssistant(curriculum).cohorts["2027"].selections[0];

    expect(group).toMatchObject({ notes, choose: 4, minChoose: 4, maxChoose: 4 });
    expect(group.options).toEqual(seoulChoiceGroup.subjects.map((subject) => subject.name));
    expect(curriculum.cohorts[0].grades[0].semesters[0].choiceGroups[0].notes).toEqual(notes);
  });

  it("does not add a notes property when a legacy group has none", () => {
    const legacyGroup = { ...seoulChoiceGroup };
    delete legacyGroup.notes;
    const group = adaptCurriculumForStudentAssistant(curriculumWithGroup(legacyGroup))
      .cohorts["2027"].selections[0];

    expect(group).not.toHaveProperty("notes");
  });

  it("preserves an explicitly empty notes array", () => {
    const group = adaptCurriculumForStudentAssistant(curriculumWithGroup({ ...seoulChoiceGroup, notes: [] }))
      .cohorts["2027"].selections[0];

    expect(group).toHaveProperty("notes", []);
  });
});
