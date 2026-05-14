import test from "node:test";
import assert from "node:assert/strict";

import { getInitialRoadmapSelections } from "../src/lib/roadmap-selection-state.ts";

test("recommendation context does not create initial checked selections", () => {
  const selections = getInitialRoadmapSelections({
    encodedSelections: null,
    encodedCohort: null,
    currentCohort: "2026",
    decodeSelections: () => ({ groupA: ["미적분II"] }),
  });

  assert.deepEqual(selections, {});
});

test("shared selection links still restore checked selections", () => {
  const selections = getInitialRoadmapSelections({
    encodedSelections: "encoded",
    encodedCohort: "2025",
    currentCohort: "2026",
    decodeSelections: (encoded, cohort) => ({
      groupA: [`${encoded}-${cohort}`],
    }),
  });

  assert.deepEqual(selections, { groupA: ["encoded-2025"] });
});

test("invalid shared cohort falls back to the current cohort", () => {
  const selections = getInitialRoadmapSelections({
    encodedSelections: "encoded",
    encodedCohort: "bad-cohort",
    currentCohort: "2026",
    decodeSelections: (encoded, cohort) => ({
      groupA: [`${encoded}-${cohort}`],
    }),
  });

  assert.deepEqual(selections, { groupA: ["encoded-2026"] });
});
