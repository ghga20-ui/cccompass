import test from "node:test";
import assert from "node:assert/strict";

const {
  buildCurrentPath,
  buildSubjectDetailHref,
  getInternalReturnPath,
} = await import(new URL("./subject-navigation.ts", import.meta.url).href);

test("builds a subject detail href with the current page as the return target", () => {
  assert.equal(
    buildSubjectDetailHref("physics", "/recommend?dept=컴퓨터공학과"),
    "/subjects/physics?from=%2Frecommend%3Fdept%3D%EC%BB%B4%ED%93%A8%ED%84%B0%EA%B3%B5%ED%95%99%EA%B3%BC"
  );
});

test("keeps only internal return paths", () => {
  assert.equal(getInternalReturnPath("/roadmap?dept=컴퓨터공학과"), "/roadmap?dept=컴퓨터공학과");
  assert.equal(getInternalReturnPath("https://example.com/phishing"), "/subjects");
  assert.equal(getInternalReturnPath("//example.com/phishing"), "/subjects");
  assert.equal(getInternalReturnPath(null), "/subjects");
});

test("builds the current path with an optional query string", () => {
  assert.equal(buildCurrentPath("/recommend", "dept=컴퓨터공학과"), "/recommend?dept=컴퓨터공학과");
  assert.equal(buildCurrentPath("/roadmap", ""), "/roadmap");
});
