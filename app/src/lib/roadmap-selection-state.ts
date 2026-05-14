type Cohort = "2025" | "2026";

type DecodeSelections = (
  encodedSelections: string,
  cohort: string
) => Record<string, string[]>;

interface InitialRoadmapSelectionsParams {
  encodedSelections: string | null;
  encodedCohort: string | null;
  currentCohort: Cohort;
  decodeSelections: DecodeSelections;
}

export function getInitialRoadmapSelections({
  encodedSelections,
  encodedCohort,
  currentCohort,
  decodeSelections,
}: InitialRoadmapSelectionsParams): Record<string, string[]> {
  if (!encodedSelections) return {};

  const decodeCohort =
    encodedCohort === "2025" || encodedCohort === "2026"
      ? encodedCohort
      : currentCohort;
  const decoded = decodeSelections(encodedSelections, decodeCohort);

  return Object.keys(decoded).length > 0 ? decoded : {};
}
