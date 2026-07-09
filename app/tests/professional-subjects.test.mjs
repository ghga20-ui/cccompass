import test from "node:test";
import assert from "node:assert/strict";

import {
  AREA_TO_TAGS,
  resolveTagsForProfessional,
} from "../src/lib/professional-subjects.ts";

test("area 기본값으로 태그를 해석한다", () => {
  assert.deepEqual(resolveTagsForProfessional("재료 일반", "기계"), ["mechanical-elec"]);
  assert.deepEqual(resolveTagsForProfessional("공중 보건", "보건·복지"), [
    "nursing-health",
    "psychology-social",
  ]);
});

test("오버라이드가 area 기본값을 대체한다", () => {
  // 정보·통신 area는 cs-ai만 주지만, 프로그래밍은 기계공학 지망생에게도 권장할 만하다
  assert.deepEqual(resolveTagsForProfessional("프로그래밍", "정보·통신"), [
    "cs-ai",
    "mechanical-elec",
  ]);
});

test("professionalArea가 없으면 빈 배열", () => {
  // 커리컴퍼스 업로드 과목이 정적 카탈로그에 미매칭인 경우
  assert.deepEqual(resolveTagsForProfessional("프로그래밍", undefined), []);
});

test("모호한 area는 오버라이드 없이는 빈 배열", () => {
  assert.deepEqual(AREA_TO_TAGS["예술계열"], []);
  assert.deepEqual(resolveTagsForProfessional("무용의 이해", "예술계열"), []);
});

test("예술계열은 오버라이드로 미술/음악이 갈린다", () => {
  assert.deepEqual(resolveTagsForProfessional("드로잉", "예술계열"), ["art-design"]);
  assert.deepEqual(resolveTagsForProfessional("합창·합주", "예술계열"), ["music-perform"]);
});

test("오버라이드는 area와 무관한 태그를 추가할 수 있다", () => {
  assert.ok(resolveTagsForProfessional("고급 생명과학", "과학계열").includes("medical"));
});

test("국제계열 법·정치 과목은 global과 law-politics를 모두 받는다", () => {
  // 오버라이드는 area 기본값(global)을 대체하므로 global을 명시해야 유실되지 않는다
  for (const name of ["국제법", "국제 정치", "국제 관계와 국제기구"]) {
    assert.deepEqual(resolveTagsForProfessional(name, "국제계열"), ["global", "law-politics"]);
  }
});

test("오버라이드 없는 국제계열 과목은 area 기본값 global만 받는다", () => {
  assert.deepEqual(resolveTagsForProfessional("현대 세계의 변화", "국제계열"), ["global"]);
  assert.deepEqual(resolveTagsForProfessional("비교 문화", "국제계열"), ["global"]);
});
