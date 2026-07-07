// 대교협 「2028학년도 권역별 대학별 권장과목」 기반 합의도/커버리지 순수 계산.
// JSON import 없이 유지할 것 — node:test(.mjs)가 직접 import한다.

export interface ConsensusBadge {
  core: number;
  recommended: number;
}

interface CellLike {
  subjects: string[];
}

export interface ConsensusEntryLike {
  university: string;
  core: CellLike | null;
  recommended: CellLike | null;
}

export interface CoverageResult {
  percent: number;
  covered: string[];
  missing: { name: string; count: number }[];
  notOffered: { name: string; count: number }[];
  denominator: number;
}

/** 로마숫자 변형(II vs Ⅱ)과 공백 차이를 흡수하는 비교용 정규화 */
export function normalizeSubjectName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .replace(/III/g, "Ⅲ")
    .replace(/II/g, "Ⅱ")
    .replace(/I/g, "Ⅰ");
}

/**
 * 과목명 → 그 과목을 명시적으로 핵심/권장과목으로 지정한 대학 수.
 * 같은 대학이 여러 모집단위에서 지정해도 1로 센다. areas(우산 용어)는 세지 않는다.
 */
export function buildBadgeMap(
  entries: ConsensusEntryLike[]
): Map<string, ConsensusBadge> {
  const coreUnis = new Map<string, Set<string>>();
  const recUnis = new Map<string, Set<string>>();

  const collect = (
    target: Map<string, Set<string>>,
    cell: CellLike | null,
    university: string
  ) => {
    if (!cell) return;
    cell.subjects.forEach((name) => {
      let set = target.get(name);
      if (!set) {
        set = new Set<string>();
        target.set(name, set);
      }
      set.add(university);
    });
  };

  entries.forEach((e) => {
    collect(coreUnis, e.core, e.university);
    collect(recUnis, e.recommended, e.university);
  });

  const badges = new Map<string, ConsensusBadge>();
  coreUnis.forEach((unis, name) => {
    badges.set(name, { core: unis.size, recommended: 0 });
  });
  recUnis.forEach((unis, name) => {
    const existing = badges.get(name);
    if (existing) {
      existing.recommended = unis.size;
    } else {
      badges.set(name, { core: 0, recommended: unis.size });
    }
  });
  return badges;
}

/**
 * 커버리지 계산.
 * 분모: coreCounts 중 count >= threshold이면서 학교 개설(offeredNames)인 과목.
 * 미개설 핵심과목(count >= threshold)은 분모에서 빼고 notOffered로 따로 반환.
 * missing/notOffered는 지정 대학 수 내림차순.
 */
export function computeCoverage(
  coreCounts: Map<string, number>,
  offeredNames: Set<string>,
  takenNames: Set<string>,
  threshold = 3
): CoverageResult {
  const offeredNorm = new Set(
    Array.from(offeredNames, (n) => normalizeSubjectName(n))
  );
  const takenNorm = new Set(
    Array.from(takenNames, (n) => normalizeSubjectName(n))
  );

  const covered: string[] = [];
  const missing: { name: string; count: number }[] = [];
  const notOffered: { name: string; count: number }[] = [];

  coreCounts.forEach((count, name) => {
    if (count < threshold) return;
    const norm = normalizeSubjectName(name);
    if (!offeredNorm.has(norm)) {
      notOffered.push({ name, count });
      return;
    }
    if (takenNorm.has(norm)) {
      covered.push(name);
    } else {
      missing.push({ name, count });
    }
  });

  missing.sort((a, b) => b.count - a.count);
  notOffered.sort((a, b) => b.count - a.count);

  const denominator = covered.length + missing.length;
  const percent =
    denominator === 0 ? 0 : Math.round((covered.length / denominator) * 100);

  return { percent, covered, missing, notOffered, denominator };
}
