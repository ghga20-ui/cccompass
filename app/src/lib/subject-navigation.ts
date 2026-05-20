export function buildCurrentPath(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function getInternalReturnPath(
  from: string | null,
  fallback = "/subjects"
): string {
  if (!from) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

export function buildSubjectDetailHref(
  subjectId: string,
  returnPath?: string
): string {
  if (!returnPath) return `/subjects/${subjectId}`;

  const params = new URLSearchParams({ from: returnPath });
  return `/subjects/${subjectId}?${params.toString()}`;
}
