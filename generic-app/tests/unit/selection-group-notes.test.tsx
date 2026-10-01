import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SelectionGroup from "@/components/SelectionGroup";
import { adaptCurriculumForStudentAssistant } from "@/lib/hyoja/school-adapter";
import { curriculumWithGroup, seoulChoiceGroup, seoulGroupNote } from "../fixtures/seoul-group-notes";

afterEach(cleanup);

const group = {
  id: "2027-3-1-g3-1-2",
  label: seoulChoiceGroup.label,
  grade: 3,
  semester: 1,
  choose: 4,
  creditsEach: 3,
  totalCredits: 12,
  options: seoulChoiceGroup.subjects.map((subject) => subject.name),
};

const defaultProps = {
  selected: [],
  onToggle: () => {},
  getSubjectByName: () => undefined,
  basePath: "/s/test",
};

describe("selection group source and teacher guidance", () => {
  it("shows all notes near the options and describes selection buttons accessibly", () => {
    const teacherNote = "담당 교사 확인 필요";
    const notedGroup = { ...group, notes: [seoulGroupNote, teacherNote] };
    render(<SelectionGroup {...defaultProps} group={notedGroup} />);

    const guidance = screen.getByRole("note", { name: "편제·교사 안내" });
    expect(within(guidance).getByText(seoulGroupNote)).toBeVisible();
    expect(within(guidance).getByText(teacherNote)).toBeVisible();
    const firstButton = screen.getByRole("button", { name: "독서 토론과 글쓰기 선택" });
    expect(guidance.compareDocumentPosition(firstButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleDescription(`편제·교사 안내 ${seoulGroupNote} ${teacherNote}`);
    }
  });

  it("keeps the source note visible through the curriculum-to-student flow", () => {
    const adapted = adaptCurriculumForStudentAssistant(curriculumWithGroup(seoulChoiceGroup))
      .cohorts["2027"].selections[0];
    render(<SelectionGroup {...defaultProps} group={adapted} />);

    expect(screen.getByText(seoulGroupNote)).toBeVisible();
    expect(screen.getByText("택4 / 과목당 3학점")).toBeInTheDocument();
  });

  it.each([undefined, [], [" ", "\n"]])("omits empty guidance for notes %j", (notes) => {
    const notedGroup = { ...group, notes };
    render(<SelectionGroup {...defaultProps} group={notedGroup} />);

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByText("편제·교사 안내")).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-describedby");
    }
  });

  it("does not turn a free-text subset limit into an enforced selection rule", () => {
    const onToggle = vi.fn();
    const notedGroup = { ...group, notes: [seoulGroupNote] };
    render(<SelectionGroup
      {...defaultProps}
      group={notedGroup}
      selected={["미적분Ⅱ", "경제 수학"]}
      onToggle={onToggle}
    />);

    const thirdBasicSubject = screen.getByRole("button", { name: "영어 발표와 토론 선택" });
    expect(thirdBasicSubject).toBeEnabled();
    fireEvent.click(thirdBasicSubject);
    expect(onToggle).toHaveBeenCalledWith("영어 발표와 토론");
  });

  it("uses distinct note descriptions when the same group is rendered twice", () => {
    const notedGroup = { ...group, notes: [seoulGroupNote] };
    render(<>
      <SelectionGroup {...defaultProps} group={notedGroup} />
      <SelectionGroup {...defaultProps} group={notedGroup} />
    </>);

    const notes = screen.getAllByRole("note", { name: "편제·교사 안내" });
    const buttons = screen.getAllByRole("button", { name: "미적분Ⅱ 선택" });
    expect(notes[0].id).not.toBe(notes[1].id);
    buttons.forEach((button, index) => expect(button).toHaveAttribute("aria-describedby", notes[index].id));
  });
});
