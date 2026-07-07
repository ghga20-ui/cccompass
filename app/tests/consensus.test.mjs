import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBadgeMap,
  computeCoverage,
  normalizeSubjectName,
} from "../src/lib/consensus.ts";

const entry = (university, coreSubjects, recSubjects) => ({
  university,
  core: coreSubjects ? { raw: "", subjects: coreSubjects, areas: [], isFlexible: false } : null,
  recommended: recSubjects ? { raw: "", subjects: recSubjects, areas: [], isFlexible: false } : null,
});

test("buildBadgeMap counts distinct universities per subject", () => {
  const badges = buildBadgeMap([
    entry("A대", ["물리학", "수학"], null),
    entry("A대", ["물리학"], null), // 같은 대학 다른 모집단위 — 중복 카운트 금지
    entry("B대", ["물리학"], ["기하"]),
    entry("C대", null, ["기하"]),
  ]);
  assert.equal(badges.get("물리학").core, 2); // A대, B대
  assert.equal(badges.get("물리학").recommended, 0);
  assert.equal(badges.get("기하").core, 0);
  assert.equal(badges.get("기하").recommended, 2); // B대, C대
});

test("buildBadgeMap ignores areas (umbrella terms)", () => {
  const badges = buildBadgeMap([
    {
      university: "A대",
      core: { raw: "", subjects: [], areas: ["수학"], isFlexible: false },
      recommended: null,
    },
  ]);
  assert.equal(badges.size, 0);
});

test("computeCoverage: offered-only denominator, threshold, missing sorted desc", () => {
  const coreCounts = new Map([
    ["미적분Ⅱ", 20],
    ["기하", 10],
    ["물리학", 8],
    ["정보", 2], // threshold 미만 — 분모 제외
  ]);
  const offered = new Set(["미적분Ⅱ", "물리학", "정보"]); // 기하 미개설
  const taken = new Set(["미적분Ⅱ"]);
  const r = computeCoverage(coreCounts, offered, taken, 3);
  assert.equal(r.denominator, 2); // 미적분Ⅱ, 물리학
  assert.equal(r.percent, 50);
  assert.deepEqual(r.covered, ["미적분Ⅱ"]);
  assert.deepEqual(r.missing, [{ name: "물리학", count: 8 }]);
  assert.deepEqual(r.notOffered, [{ name: "기하", count: 10 }]);
});

test("computeCoverage: empty denominator yields percent 0", () => {
  const r = computeCoverage(new Map(), new Set(), new Set(), 3);
  assert.equal(r.denominator, 0);
  assert.equal(r.percent, 0);
});

test("normalizeSubjectName equates roman numeral variants", () => {
  assert.equal(normalizeSubjectName("미적분II"), normalizeSubjectName("미적분Ⅱ"));
  assert.equal(normalizeSubjectName("영어 Ⅰ"), normalizeSubjectName("영어Ⅰ"));
});

test("computeCoverage matches taken names across roman variants", () => {
  const coreCounts = new Map([["미적분Ⅱ", 20]]);
  const offered = new Set(["미적분Ⅱ"]);
  const taken = new Set(["미적분II"]); // ASCII II
  const r = computeCoverage(coreCounts, offered, taken, 3);
  assert.equal(r.percent, 100);
});
