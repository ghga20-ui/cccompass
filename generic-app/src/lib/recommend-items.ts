/**
 * 추천 목록 구성 로직 (순수).
 *
 * import를 두지 않는다 — tests/*.mjs가 이 파일을 직접 import하기 때문.
 * 데이터 조회(career-mapping, subjects.json, 학교 편제)는 호출자가 끝내고
 * 결과 배열/Map/Set만 넘긴다.
 */

export const PROFESSIONAL_AREA = "전문교과";

/** 추천 로직이 필요로 하는 과목 필드만 (구조적 타입 — Subject를 그대로 넘겨도 된다) */
export interface RecommendSubject {
  id: string;
  name: string;
  category: string;
  area: string;
  professionalArea?: string;
  suneung?: boolean;
}

export interface RecommendItem<T extends RecommendSubject = RecommendSubject> {
  subject: T;
  isAvailable: boolean;
  suneung: boolean;
  semesters: string[];
  /** 전문교과이면서 우리 학교가 개설한 경우에만 true. 카드의 "우리 학교 개설" 문구를 가른다. */
  professionalOffered: boolean;
}

export interface BuildRecommendItemsInput<T extends RecommendSubject = RecommendSubject> {
  /** career-mapping 등에서 온 추천 과목 (중복·공통 포함 가능) */
  baseSubjects: T[];
  /** 관심계열 태그로 조회한 전문교과 (개설 여부 미필터) */
  professionalSubjects: T[];
  /** 과목명 → 선택 가능한 학기 라벨 */
  selectableMap: Map<string, string[]>;
  /** 학교에 개설되는 전체 과목명 (지정 포함) */
  allSchoolNames: Set<string>;
  /** 추천에서 제외할 과목명 */
  excludedNames: Set<string>;
  /** 화면에 표시할 학기 순서 */
  semesterOrder: string[];
}

export interface BuildRecommendItemsResult<T extends RecommendSubject = RecommendSubject> {
  bySemester: Map<string, RecommendItem<T>[]>;
  unavailable: RecommendItem<T>[];
}

/**
 * 전문교과 성격의 과목인지.
 *
 * 교과군(`area`)이 아니라 `professionalArea` 보유 여부로 판단한다.
 * 전문교과라도 학교가 보통교과군으로 편성해 개설할 수 있기 때문이다.
 * (예: 「현대 세계의 변화」는 국제계열 전문교과이지만 사회 교과로 개설한다)
 */
export function isProfessionalSubject(subject: RecommendSubject): boolean {
  return !!subject.professionalArea;
}

const CATEGORY_ORDER: Record<string, number> = {
  일반선택: 0,
  진로선택: 1,
  융합선택: 2,
};

/**
 * 추천 후보를 만들고 학기별로 그룹핑한다.
 *
 * 규칙:
 * 1. `공통` 과목은 제외하고, 같은 과목(id)은 한 번만 담는다.
 * 2. `excludedNames`에 있는 과목은 보통교과·전문교과 모두 제외한다.
 * 3. 전문교과는 **학교가 개설한 것만** 담는다(미개설이면 미개설 목록에도 넣지 않는다).
 *    단, career-mapping을 통해 들어온 전문교과(예: 정보과학)는 보통교과와 같은 규칙을 따르므로
 *    미개설이면 `unavailable`에 남는다.
 * 4. 개설 과목은 `semesterOrder`상 처음 만나는 학기에 배치한다.
 * 5. 학기 안 정렬: 일반→진로→융합, 같은 카테고리면 수능과목 먼저, 전문교과는 맨 뒤.
 */
export function buildRecommendItems<T extends RecommendSubject>({
  baseSubjects,
  professionalSubjects,
  selectableMap,
  allSchoolNames,
  excludedNames,
  semesterOrder,
}: BuildRecommendItemsInput<T>): BuildRecommendItemsResult<T> {
  const allItems: RecommendItem<T>[] = [];
  const seen = new Set<string>();

  const toItem = (subject: T, semesters: string[], isAvailable: boolean): RecommendItem<T> => ({
    subject,
    isAvailable,
    suneung: subject.suneung === true,
    semesters,
    professionalOffered: isAvailable && isProfessionalSubject(subject),
  });

  const availabilityOf = (subject: T) => {
    const semesters = selectableMap.get(subject.name) || [];
    const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
    return { semesters, isAvailable };
  };

  baseSubjects.forEach((subject) => {
    if (seen.has(subject.id)) return;
    if (subject.category === "공통") return;
    if (excludedNames.has(subject.name)) return;
    seen.add(subject.id);

    const { semesters, isAvailable } = availabilityOf(subject);
    allItems.push(toItem(subject, semesters, isAvailable));
  });

  professionalSubjects.forEach((subject) => {
    if (seen.has(subject.id)) return;
    if (excludedNames.has(subject.name)) return;

    const { semesters, isAvailable } = availabilityOf(subject);
    if (!isAvailable) return; // 미개설 전문교과는 노출하지 않음
    seen.add(subject.id);
    allItems.push(toItem(subject, semesters, true));
  });

  const unavailable = allItems.filter((item) => !item.isAvailable);

  const bySemester = new Map<string, RecommendItem<T>[]>();
  semesterOrder.forEach((sem) => bySemester.set(sem, []));

  allItems
    .filter((item) => item.isAvailable)
    .forEach((item) => {
      const firstSem = semesterOrder.find((sem) => item.semesters.includes(sem));
      if (firstSem) bySemester.get(firstSem)!.push(item);
    });

  bySemester.forEach((items) => {
    // Array.prototype.sort는 안정 정렬 — 아래 두 단계가 서로의 순서를 보존한다
    items.sort((a, b) => {
      const catDiff =
        (CATEGORY_ORDER[a.subject.category] ?? 3) - (CATEGORY_ORDER[b.subject.category] ?? 3);
      if (catDiff !== 0) return catDiff;
      return a.suneung === b.suneung ? 0 : a.suneung ? -1 : 1;
    });
    items.sort(
      (a, b) => Number(isProfessionalSubject(a.subject)) - Number(isProfessionalSubject(b.subject))
    );
  });

  return { bySemester, unavailable };
}
