export function normalizeSubjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function resolveChooseCount(text: string): number | null {
  const normalizedText = normalizeSubjectName(text);
  const compactedText = normalizedText.replace(/\s+/g, "");

  const compactMatch = compactedText.match(/택(\d+)/);
  if (compactMatch) {
    return Number(compactMatch[1]);
  }

  const descriptiveMatch = normalizedText.match(/\d+\s*과목\s*중\s*(\d+)\s*과목\s*선택/);
  if (descriptiveMatch) {
    return Number(descriptiveMatch[1]);
  }

  return null;
}
