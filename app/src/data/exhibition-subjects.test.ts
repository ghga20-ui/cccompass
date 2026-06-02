import test from "node:test";
import assert from "node:assert/strict";

const {
  exhibitionAreaMatches,
  exhibitionSubjects,
  getExhibitionDisplayArea,
} = await import(new URL("./exhibition-subjects.ts", import.meta.url).href);

function findSubject(subjectId: string) {
  const subject = exhibitionSubjects.find((item) => item.id === subjectId);
  assert.ok(subject, `missing subject ${subjectId}`);
  return subject;
}

test("maps professional-course source areas to exhibition display areas", () => {
  assert.equal(getExhibitionDisplayArea(findSubject("food_and_nutrition")), "기술·가정");
  assert.equal(getExhibitionDisplayArea(findSubject("programming")), "정보");
  assert.equal(getExhibitionDisplayArea(findSubject("informatics_science")), "정보");
  assert.equal(getExhibitionDisplayArea(findSubject("drawing")), "예술");
  assert.equal(getExhibitionDisplayArea(findSubject("chorus_and_ensemble")), "예술");
  assert.equal(getExhibitionDisplayArea(findSubject("tourism_japanese")), "제2외국어");
  assert.equal(getExhibitionDisplayArea(findSubject("tourism_chinese")), "제2외국어");
  assert.equal(getExhibitionDisplayArea(findSubject("changes_in_the_modern_world")), "사회");
});

test("area filters include the old exhibition professional-course subjects", () => {
  assert.equal(
    exhibitionAreaMatches(findSubject("food_and_nutrition"), "기술·가정"),
    true
  );
  assert.equal(exhibitionAreaMatches(findSubject("programming"), "정보"), true);
  assert.equal(
    exhibitionAreaMatches(findSubject("informatics_science"), "정보"),
    true
  );
  assert.equal(exhibitionAreaMatches(findSubject("drawing"), "예술"), true);
  assert.equal(
    exhibitionAreaMatches(findSubject("chorus_and_ensemble"), "예술"),
    true
  );
  assert.equal(
    exhibitionAreaMatches(findSubject("tourism_japanese"), "제2외국어"),
    true
  );
  assert.equal(
    exhibitionAreaMatches(findSubject("tourism_chinese"), "제2외국어"),
    true
  );
});

test("uses subject-specific descriptions for exhibition professional-course cards", () => {
  const expectedDescriptions = {
    food_and_nutrition:
      "식품의 특성과 영양소, 건강한 식생활 관리 방법을 배우며 식품과 건강을 과학적으로 탐구하는 과목입니다.",
    programming:
      "문제를 작은 절차로 나누고 프로그래밍 언어로 구현하며, 소프트웨어로 생활 속 문제를 해결하는 방법을 배우는 과목입니다.",
    tourism_japanese:
      "관광 상황에서 필요한 일본어 표현과 일본 문화 이해를 바탕으로 여행, 서비스, 국제 교류 장면의 의사소통 능력을 기르는 과목입니다.",
    tourism_chinese:
      "관광 상황에서 필요한 중국어 표현과 중국 문화 이해를 바탕으로 여행, 서비스, 국제 교류 장면의 의사소통 능력을 기르는 과목입니다.",
  } as const;

  for (const [subjectId, description] of Object.entries(expectedDescriptions)) {
    const subject = findSubject(subjectId);
    assert.equal(subject.description, description);
    assert.notEqual(subject.description, "농림·수산 분야의 전문 교과 과목입니다.");
  }
});
