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
