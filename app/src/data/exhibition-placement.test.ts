import test from "node:test";
import assert from "node:assert/strict";

const {
  exhibitionSemesterFiltersByAudience,
  getExhibitionOfferings,
  isVisibleForExhibitionAudience,
  semesterKey,
} = await import(new URL("./exhibition-placement.ts", import.meta.url).href);

type Audience = "grade1" | "grade2";

function offeringKeys(subjectName: string, audience: Audience): readonly string[] {
  return getExhibitionOfferings(subjectName, audience).map(semesterKey);
}

test("uses the old exhibition semester range for each audience", () => {
  assert.deepEqual(exhibitionSemesterFiltersByAudience.grade1, [
    "2-1",
    "2-2",
    "3-1",
    "3-2",
  ]);
  assert.deepEqual(exhibitionSemesterFiltersByAudience.grade2, ["3-1", "3-2"]);
});

test("places finance in grade 3 semester 2 for first-year audience", () => {
  assert.deepEqual(offeringKeys("금융과 경제 생활", "grade1"), ["3-2"]);
});

test("places finance in grade 3 semester 1 for second-year audience", () => {
  assert.deepEqual(offeringKeys("금융과 경제생활", "grade2"), ["3-1"]);
});

test("hides social issues only for second-year audience", () => {
  assert.equal(isVisibleForExhibitionAudience("사회문제 탐구", "grade1"), true);
  assert.deepEqual(offeringKeys("사회문제 탐구", "grade1"), ["3-1"]);

  assert.equal(isVisibleForExhibitionAudience("사회문제 탐구", "grade2"), false);
  assert.deepEqual(offeringKeys("사회문제 탐구", "grade2"), []);
});

test("includes old exhibition placements for first-year audience", () => {
  assert.deepEqual(offeringKeys("식품과 영양", "grade1"), ["2-2", "3-1"]);
  assert.deepEqual(offeringKeys("프로그래밍", "grade1"), ["2-2"]);
  assert.deepEqual(offeringKeys("드로잉", "grade1"), ["3-1"]);
  assert.deepEqual(offeringKeys("합창·합주", "grade1"), ["3-1"]);
  assert.deepEqual(offeringKeys("정보과학", "grade1"), ["3-2"]);
  assert.deepEqual(offeringKeys("관광 일본어", "grade1"), ["3-2"]);
  assert.deepEqual(offeringKeys("관광 중국어", "grade1"), ["3-2"]);
});

test("includes old exhibition placements for second-year audience", () => {
  assert.deepEqual(offeringKeys("식품과 영양", "grade2"), ["3-1"]);
  assert.deepEqual(offeringKeys("드로잉", "grade2"), ["3-2"]);
  assert.deepEqual(offeringKeys("합창·합주", "grade2"), ["3-2"]);
  assert.deepEqual(offeringKeys("정보과학", "grade2"), ["3-2"]);
  assert.deepEqual(offeringKeys("관광 일본어", "grade2"), ["3-2"]);
  assert.deepEqual(offeringKeys("관광 중국어", "grade2"), ["3-2"]);
});

test("returns empty placement for unknown subjects", () => {
  assert.deepEqual(offeringKeys("없는 과목", "grade1"), []);
});
