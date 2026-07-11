import test from "node:test";
import assert from "node:assert/strict";

import { buildRecommendItems, isProfessionalSubject } from "../src/lib/recommend-items.ts";

// ---- 픽스처 ----
const sub = (id, name, category, extra = {}) => ({
  id,
  name,
  category,
  area: "교과",
  ...extra,
});
const prof = (id, name, professionalArea, extra = {}) =>
  sub(id, name, "진로선택", { area: "전문교과", professionalArea, ...extra });

const ORDER = ["2-1", "2-2", "3-1", "3-2"];

/** 기본 인자 — 테스트마다 필요한 것만 덮어쓴다 */
const call = (over = {}) =>
  buildRecommendItems({
    baseSubjects: [],
    professionalSubjects: [],
    selectableMap: new Map(),
    allSchoolNames: new Set(),
    excludedNames: new Set(),
    semesterOrder: ORDER,
    ...over,
  });

const namesIn = (map, sem) => (map.get(sem) || []).map((i) => i.subject.name);

test("공통 과목은 추천 후보에서 제외된다", () => {
  const { bySemester, unavailable } = call({
    baseSubjects: [sub("c", "공통국어", "공통"), sub("a", "대수", "일반선택")],
    selectableMap: new Map([
      ["공통국어", ["2-1"]],
      ["대수", ["2-1"]],
    ]),
  });
  assert.deepEqual(namesIn(bySemester, "2-1"), ["대수"]);
  assert.deepEqual(unavailable, []);
});

test("id 기준으로 중복을 제거한다 (base 내부, base↔전문교과)", () => {
  const info = prof("info", "정보과학", "과학계열");
  const { bySemester } = call({
    // 같은 과목이 base에 두 번, 그리고 전문교과 목록에도 등장
    baseSubjects: [sub("a", "대수", "일반선택"), sub("a", "대수", "일반선택"), info],
    professionalSubjects: [info],
    selectableMap: new Map([
      ["대수", ["2-1"]],
      ["정보과학", ["2-1"]],
    ]),
  });
  assert.deepEqual(namesIn(bySemester, "2-1"), ["대수", "정보과학"]);
});

test("excludedNames는 보통교과와 전문교과 양쪽에서 제외한다", () => {
  const { bySemester, unavailable } = call({
    baseSubjects: [sub("a", "대수", "일반선택")],
    professionalSubjects: [prof("p", "프로그래밍", "정보·통신")],
    selectableMap: new Map([
      ["대수", ["2-1"]],
      ["프로그래밍", ["2-1"]],
    ]),
    excludedNames: new Set(["대수", "프로그래밍"]),
  });
  assert.deepEqual(namesIn(bySemester, "2-1"), []);
  assert.deepEqual(unavailable, []);
});

test("미개설 보통교과는 unavailable로 가고, 미개설 전문교과는 어디에도 없다", () => {
  const { bySemester, unavailable } = call({
    baseSubjects: [sub("a", "미개설보통", "진로선택")],
    professionalSubjects: [prof("g", "고급 지구과학", "과학계열")],
  });
  assert.deepEqual(unavailable.map((i) => i.subject.name), ["미개설보통"]);
  ORDER.forEach((sem) => assert.deepEqual(namesIn(bySemester, sem), []));
});

test("개설 과목은 semesterOrder상 첫 학기에 배치된다", () => {
  const { bySemester } = call({
    baseSubjects: [sub("a", "대수", "일반선택")],
    selectableMap: new Map([["대수", ["3-1", "2-2"]]]),
  });
  assert.deepEqual(namesIn(bySemester, "2-2"), ["대수"]);
  assert.deepEqual(namesIn(bySemester, "3-1"), []);
});

test("개설이지만 선택 학기 정보가 없으면 어느 학기에도 배치되지 않는다", () => {
  // allSchoolNames로만 개설 확인된 과목 (지정과목 등)
  const { bySemester, unavailable } = call({
    baseSubjects: [sub("a", "지정과목", "일반선택")],
    allSchoolNames: new Set(["지정과목"]),
  });
  assert.deepEqual(unavailable, []);
  ORDER.forEach((sem) => assert.deepEqual(namesIn(bySemester, sem), []));
});

test("정렬: 일반→진로→융합, 같은 카테고리면 수능과목 먼저, 전문교과는 맨 뒤", () => {
  const { bySemester } = call({
    baseSubjects: [
      sub("f", "융합과목", "융합선택"),
      sub("c1", "진로비수능", "진로선택"),
      sub("c2", "진로수능", "진로선택", { suneung: true }),
      sub("g", "일반과목", "일반선택"),
    ],
    professionalSubjects: [prof("p", "프로그래밍", "정보·통신")],
    selectableMap: new Map(
      ["융합과목", "진로비수능", "진로수능", "일반과목", "프로그래밍"].map((n) => [n, ["2-1"]])
    ),
  });
  assert.deepEqual(namesIn(bySemester, "2-1"), [
    "일반과목",
    "진로수능",
    "진로비수능",
    "융합과목",
    "프로그래밍",
  ]);
});

test("professionalOffered는 개설된 전문교과에만 true — 미개설 전문교과는 false", () => {
  // 정보과학은 base(career-mapping)에도 있으므로 미개설이어도 unavailable에 남는다
  const { bySemester, unavailable } = call({
    baseSubjects: [prof("info", "정보과학", "과학계열"), sub("a", "대수", "일반선택")],
    professionalSubjects: [prof("p", "프로그래밍", "정보·통신")],
    selectableMap: new Map([
      ["대수", ["2-1"]],
      ["프로그래밍", ["2-1"]],
    ]),
  });

  const programming = bySemester.get("2-1").find((i) => i.subject.name === "프로그래밍");
  const daesu = bySemester.get("2-1").find((i) => i.subject.name === "대수");
  const info = unavailable.find((i) => i.subject.name === "정보과학");

  assert.equal(programming.professionalOffered, true);
  assert.equal(daesu.professionalOffered, false); // 보통교과는 항상 false
  assert.equal(info.professionalOffered, false); // 미개설 전문교과 → "우리 학교 개설" 문구 금지
});

test("isProfessionalSubject는 professionalArea가 없으면 false", () => {
  assert.equal(isProfessionalSubject(prof("p", "프로그래밍", "정보·통신")), true);
  // 커리컴퍼스 fallback subject: area는 전문교과지만 professionalArea 없음
  assert.equal(isProfessionalSubject(sub("x", "미상", "진로선택", { area: "전문교과" })), false);
  assert.equal(isProfessionalSubject(sub("a", "대수", "일반선택")), false);
});

test("교과군이 전문교과가 아니어도 professionalArea가 있으면 전문교과로 본다", () => {
  // 「현대 세계의 변화」는 국제계열 전문교과지만 학교에서 사회 교과로 개설한다.
  // 교과군 배치가 아니라 professionalArea 보유 여부로 판별해야 추천 경로가 유지된다.
  const s = sub("cmw", "현대 세계의 변화", "진로선택", {
    area: "사회",
    professionalArea: "국제계열",
  });
  assert.equal(isProfessionalSubject(s), true);

  const { bySemester } = call({
    professionalSubjects: [s],
    selectableMap: new Map([["현대 세계의 변화", ["3-1"]]]),
    semesterOrder: ["3-1"],
  });
  const item = bySemester.get("3-1")[0];
  assert.equal(item.subject.name, "현대 세계의 변화");
  assert.equal(item.professionalOffered, true);
});
