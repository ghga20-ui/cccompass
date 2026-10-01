import type { ChoiceGroup, SchoolCurriculum } from "@/lib/curriculum/schema";

// Public curriculum excerpt from the actual Seoul Samyook 2027 HWPX extraction.
// The source footnote and subject table disagree, so preserve this as guidance only.
export const seoulGroupNote =
  "3학년 1학기 기초과목(문학과영상, 미적분Ⅱ, 고급기하, 경제수학, 영어발표와토론) 중 최대 택2까지 선택 가능";

export const seoulChoiceGroup: ChoiceGroup = {
  id: "g3-1-2",
  label: "[택4] 일반/진로선택",
  choose: 4,
  creditsEach: 3,
  notes: [seoulGroupNote],
  subjects: [
    "독서 토론과 글쓰기", "미적분Ⅱ", "고급 대수", "경제 수학",
    "영어 발표와 토론", "법과 사회", "경제", "도시의 미래 탐구",
    "인문학과 윤리", "전자기와 양자", "물질과 에너지", "생물의 유전",
    "행성우주과학",
  ].map((name) => ({ name, credits: 3 })),
};

export function curriculumWithGroup(group: ChoiceGroup): SchoolCurriculum {
  return {
    schoolName: "서울삼육고등학교",
    cohorts: [{
      entranceYear: "2027",
      label: "2027학년도 입학생",
      grades: [{
        grade: 3,
        semesters: [{ semester: 1, requiredSubjects: [], choiceGroups: [group] }],
      }],
    }],
  };
}
