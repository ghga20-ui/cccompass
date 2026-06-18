export interface RoadmapSelectionState {
  cohort: string;
  selections: Record<string, string[]>;
}

function encodeBase64Url(value: string) {
  const base64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(value)))
      : Buffer.from(value, "utf8").toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const decoded =
    typeof atob === "function"
      ? decodeURIComponent(escape(atob(padded)))
      : Buffer.from(padded, "base64").toString("utf8");

  return decoded;
}

export function encodeRoadmapSelectionState(state: RoadmapSelectionState) {
  return encodeBase64Url(JSON.stringify(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSelections(
  value: unknown,
  validGroupIds: Set<string>,
): Record<string, string[]> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([groupId, selection]) => {
      if (!validGroupIds.has(groupId)) return [];
      if (typeof selection === "string") return [[groupId, [selection]]];
      if (!Array.isArray(selection)) return [];

      const selectedSubjects = selection.filter(
        (subject): subject is string => typeof subject === "string",
      );

      return selectedSubjects.length > 0 ? [[groupId, selectedSubjects]] : [];
    }),
  );
}

export function decodeRoadmapSelectionState(
  encoded: string | null | undefined,
  validGroupIds: Set<string>,
): RoadmapSelectionState | null {
  if (!encoded) return null;

  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(encoded));
    if (!isRecord(parsed) || typeof parsed.cohort !== "string") return null;

    return {
      cohort: parsed.cohort,
      selections: parseSelections(parsed.selections, validGroupIds),
    };
  } catch {
    return null;
  }
}
