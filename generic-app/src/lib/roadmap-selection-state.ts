export interface RoadmapSelectionState {
  cohort: string;
  selections: Record<string, string>;
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

export function decodeRoadmapSelectionState(
  encoded: string | null | undefined,
  validGroupIds: Set<string>,
): RoadmapSelectionState | null {
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as RoadmapSelectionState;
    const selections = Object.fromEntries(
      Object.entries(parsed.selections ?? {}).filter(([groupId]) =>
        validGroupIds.has(groupId),
      ),
    );

    return {
      cohort: parsed.cohort,
      selections,
    };
  } catch {
    return null;
  }
}
