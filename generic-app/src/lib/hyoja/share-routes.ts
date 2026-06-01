export function normalizeShareBasePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/\/+$/g, "");
  if (!trimmed.startsWith("/s/") || trimmed.startsWith("//")) {
    throw new Error("basePath must be an internal /s/[shareToken] path");
  }
  return trimmed;
}

function isUnsafePath(path: string) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(path) ||
    path.startsWith("//") ||
    !path.startsWith("/")
  );
}

function isWithinBasePath(path: string, basePath: string) {
  return path === basePath || path.startsWith(`${basePath}/`);
}

export function buildShareHref(
  basePath: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const normalizedBasePath = normalizeShareBasePath(basePath);
  if (isUnsafePath(path)) {
    throw new Error("path must be an internal absolute path");
  }

  const normalizedPath = path === "/" ? "" : path.replace(/^\/+/, "/");
  const href = normalizedPath.startsWith(`${normalizedBasePath}/`)
    ? normalizedPath
    : `${normalizedBasePath}${normalizedPath}`;

  if (!isWithinBasePath(href, normalizedBasePath)) {
    throw new Error("path must stay inside the active share base path");
  }

  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

export function buildCurrentPath(pathname: string, search: string): string {
  if (!search) return pathname;
  return search.startsWith("?") ? `${pathname}${search}` : `${pathname}?${search}`;
}

export function getInternalReturnPath(
  from: string | null | undefined,
  basePath: string,
  fallback = `${normalizeShareBasePath(basePath)}/subjects`,
): string {
  const normalizedBasePath = normalizeShareBasePath(basePath);
  if (!from || isUnsafePath(from)) return fallback;

  const [pathname] = from.split("?");
  if (!isWithinBasePath(pathname, normalizedBasePath)) return fallback;

  return from;
}

export function buildSubjectDetailHref(
  subjectId: string,
  returnPath: string | null | undefined,
  basePath: string,
): string {
  const href = buildShareHref(
    basePath,
    `/subjects/${encodeURIComponent(subjectId)}`,
  );
  if (!returnPath) return href;

  const params = new URLSearchParams({
    from: getInternalReturnPath(returnPath, basePath),
  });

  return `${href}?${params.toString()}`;
}
