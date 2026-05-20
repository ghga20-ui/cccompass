type SubjectBuckets = Record<"일반선택" | "진로선택" | "융합선택", string[]>;

interface DepartmentData {
  name: string;
  description?: string;
  recommendedStudents?: string[];
  recommendedSubjects: SubjectBuckets;
  similarDepartments?: string[];
}

interface TrackData {
  name: string;
  sourceName?: string;
  recommendedSubjects: SubjectBuckets;
  tip?: string;
  departments: DepartmentData[];
}

interface FieldData {
  name: string;
  tracks: TrackData[];
}

interface CareerData {
  fields: FieldData[];
}

interface DesignatedSubject {
  subject: string;
  area: string;
  category: string;
  credits: number;
  grade: number;
  semester: number;
}

interface SelectionGroup {
  id: string;
  label: string;
  grade: number;
  semester: number;
  choose: number;
  creditsEach: number;
  totalCredits: number;
  options: string[];
}

interface SchoolCohort {
  label: string;
  description: string;
  designated: DesignatedSubject[];
  selections: SelectionGroup[];
}

interface SchoolData {
  cohorts: Record<string, SchoolCohort>;
}

export interface RetrievedDepartment {
  fieldName: string;
  trackName: string;
  departmentName: string;
  score: number;
  recommendedSubjects: string[];
  availableSubjects: string[];
  unavailableSubjects: string[];
  description?: string;
  tip?: string;
}

export interface RetrievedChatContext {
  cohortYear: string;
  matches: RetrievedDepartment[];
  availableRecommendedSubjects: string[];
  unavailableRecommendedSubjects: string[];
  promptText: string;
}

interface RetrieveChatContextInput {
  question: string;
  cohortYear?: string;
  careerData: CareerData;
  schoolData: SchoolData;
  maxMatches?: number;
}

const SUBJECT_CATEGORIES = ["일반선택", "진로선택", "융합선택"] as const;

const ALIASES: Record<string, string[]> = {
  의대: ["의예과", "의학", "의약학", "보건", "생명과학", "화학"],
  의사: ["의예과", "의학", "의약학", "보건"],
  의학: ["의예과", "의학", "의약학"],
  약대: ["약학과", "약학", "의약학", "화학", "생명과학"],
  치대: ["치의예과", "치의학", "의약학"],
  한의대: ["한의예과", "한의학", "의약학"],
  수의대: ["수의학과", "수의예과", "의약학"],
  간호: ["간호학과", "보건", "생명과학"],
  컴퓨터: ["컴퓨터공학과", "소프트웨어", "인공지능", "정보"],
  코딩: ["컴퓨터공학과", "소프트웨어", "프로그래밍", "정보"],
  개발: ["컴퓨터공학과", "소프트웨어", "프로그래밍", "정보"],
  it: ["컴퓨터공학과", "소프트웨어", "인공지능", "정보"],
  ai: ["인공지능", "컴퓨터공학과", "소프트웨어", "정보"],
  인공지능: ["인공지능", "컴퓨터공학과", "소프트웨어", "정보"],
  문과: ["인문", "사회", "언어", "문학", "경영", "경제"],
  인문: ["인문", "언어", "문학", "사회"],
  이과: ["자연", "공학", "과학", "수학"],
  자연: ["자연과학", "생명과학", "화학", "물리학"],
  공학: ["공학", "물리학", "미적분", "기하"],
  경영: ["경영학과", "경제", "사회"],
  경제: ["경제학과", "경영", "사회"],
  법: ["법학과", "정치", "법과 사회", "사회"],
  교사: ["교육", "교육학과", "사범"],
  교육: ["교육", "교육학과", "사범"],
};

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[Ⅰⅰ]/g, "i")
    .replace(/[Ⅱⅱ]/g, "ii")
    .replace(/[Ⅲⅲ]/g, "iii")
    .replace(/[·ㆍ/()［\][\]{}.,:;'"`~!?？\s_-]+/g, "");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function flattenSubjects(subjects: SubjectBuckets): string[] {
  return unique(SUBJECT_CATEGORIES.flatMap((category) => subjects[category] ?? []));
}

function buildQueryTerms(question: string): string[] {
  const lowered = question.normalize("NFKC").toLowerCase();
  const rawTokens = lowered.match(/[가-힣a-zA-Z0-9ⅠⅡⅢⅰⅱⅲ]+/g) ?? [];
  const terms = [...rawTokens];

  for (const [trigger, expansions] of Object.entries(ALIASES)) {
    if (normalizeText(lowered).includes(normalizeText(trigger))) {
      terms.push(...expansions);
    }
  }

  return unique(terms.filter((term) => normalizeText(term).length >= 2));
}

function scoreText(haystack: string, terms: string[], weight: number): number {
  const normalizedHaystack = normalizeText(haystack);
  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) return score;
    return normalizedHaystack.includes(normalizedTerm) ? score + weight : score;
  }, 0);
}

function buildAvailableSubjectMap(cohort: SchoolCohort, cohortYear: string): Map<string, string> {
  const minGrade = cohortYear === "2025" ? 3 : 2;
  const map = new Map<string, string>();

  for (const subject of cohort.designated) {
    if (subject.grade >= minGrade) {
      map.set(normalizeText(subject.subject), subject.subject);
    }
  }

  for (const group of cohort.selections) {
    if (group.grade >= minGrade) {
      for (const option of group.options) {
        map.set(normalizeText(option), option);
      }
    }
  }

  return map;
}

function buildSelectionText(cohort: SchoolCohort, cohortYear: string): string {
  const minGrade = cohortYear === "2025" ? 3 : 2;
  const lines: string[] = [];

  for (const designated of cohort.designated.filter((item) => item.grade >= minGrade)) {
    lines.push(
      `- ${designated.grade}학년 ${designated.semester}학기 | 지정: ${designated.subject} (${designated.credits}학점)`
    );
  }

  for (const group of cohort.selections.filter((item) => item.grade >= minGrade)) {
    lines.push(
      `- ${group.grade}학년 ${group.semester}학기 | ${group.label} | ${group.choose}개 선택 (각 ${group.creditsEach}학점)`
    );
    lines.push(`  선택지: ${group.options.join(", ")}`);
  }

  return lines.join("\n");
}

function splitAvailableSubjects(
  subjects: string[],
  availableSubjectMap: Map<string, string>
): { available: string[]; unavailable: string[] } {
  const available: string[] = [];
  const unavailable: string[] = [];

  for (const subject of subjects) {
    const normalized = normalizeText(subject);
    if (availableSubjectMap.has(normalized)) {
      available.push(subject);
    } else {
      unavailable.push(subject);
    }
  }

  return {
    available: unique(available),
    unavailable: unique(unavailable),
  };
}

function formatDepartmentMatch(match: RetrievedDepartment): string {
  const lines = [
    `- ${match.fieldName} > ${match.trackName} > ${match.departmentName}`,
    `  권장 과목: ${match.recommendedSubjects.slice(0, 16).join(", ") || "자료 없음"}`,
    `  효자고 개설/선택 가능: ${match.availableSubjects.join(", ") || "없음"}`,
    `  효자고 미개설 또는 현재 선택대상 아님: ${match.unavailableSubjects.join(", ") || "없음"}`,
  ];

  if (match.description) {
    lines.push(`  학과 설명: ${match.description.slice(0, 180)}`);
  }
  if (match.tip) {
    lines.push(`  계열 참고: ${match.tip.slice(0, 220)}`);
  }

  return lines.join("\n");
}

export function retrieveChatContext({
  question,
  cohortYear = "2026",
  careerData,
  schoolData,
  maxMatches = 4,
}: RetrieveChatContextInput): RetrievedChatContext {
  const cohort = schoolData.cohorts[cohortYear] ?? schoolData.cohorts["2026"];
  const resolvedCohortYear = schoolData.cohorts[cohortYear] ? cohortYear : "2026";
  const terms = buildQueryTerms(question);
  const availableSubjectMap = buildAvailableSubjectMap(cohort, resolvedCohortYear);
  const scored: RetrievedDepartment[] = [];

  for (const field of careerData.fields) {
    for (const track of field.tracks) {
      const trackSubjects = flattenSubjects(track.recommendedSubjects);
      const trackText = [
        field.name,
        track.name,
        track.sourceName,
        track.tip,
        trackSubjects.join(" "),
      ].join(" ");
      const trackScore = scoreText(trackText, terms, 6);

      for (const department of track.departments) {
        const departmentSubjects = flattenSubjects(department.recommendedSubjects);
        const departmentText = [
          department.name,
          department.description,
          department.recommendedStudents?.join(" "),
          department.similarDepartments?.join(" "),
          departmentSubjects.join(" "),
        ].join(" ");

        let score =
          trackScore +
          scoreText(department.name, terms, 40) +
          scoreText(department.similarDepartments?.join(" ") ?? "", terms, 24) +
          scoreText(departmentSubjects.join(" "), terms, 8) +
          scoreText(departmentText, terms, 3);

        if (normalizeText(question).includes(normalizeText(department.name))) {
          score += 120;
        }

        if (score <= 0) continue;

        const subjects = unique([...departmentSubjects, ...trackSubjects]);
        const { available, unavailable } = splitAvailableSubjects(
          subjects,
          availableSubjectMap
        );

        scored.push({
          fieldName: field.name,
          trackName: track.name,
          departmentName: department.name,
          score,
          recommendedSubjects: subjects,
          availableSubjects: available,
          unavailableSubjects: unavailable,
          description: department.description,
          tip: track.tip,
        });
      }
    }
  }

  const sorted = scored.sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const minimumRelevantScore = Math.max(12, topScore * 0.35);
  const matches = sorted
    .filter((match) => match.score >= minimumRelevantScore)
    .slice(0, maxMatches);

  const availableRecommendedSubjects = unique(
    matches.flatMap((match) => match.availableSubjects)
  );
  const unavailableRecommendedSubjects = unique(
    matches.flatMap((match) => match.unavailableSubjects)
  );

  const promptText = [
    `현재 상담 대상: ${cohort.label}`,
    "",
    "효자고 현재 선택 가능 과목 정보:",
    buildSelectionText(cohort, resolvedCohortYear) || "선택 가능 과목 정보 없음",
    "",
    "질문과 관련된 학과/계열 검색 결과:",
    matches.length > 0
      ? matches.map(formatDepartmentMatch).join("\n")
      : "구체적으로 매칭된 학과가 없음. 학생에게 관심 분야나 희망 학과를 더 물어봐.",
    "",
    `추천 시 우선 사용할 효자고 개설 과목: ${
      availableRecommendedSubjects.join(", ") || "검색 결과 없음"
    }`,
    `주의할 과목(자료상 권장되지만 효자고 현재 선택대상에서 확인 안 됨): ${
      unavailableRecommendedSubjects.join(", ") || "없음"
    }`,
  ].join("\n");

  return {
    cohortYear: resolvedCohortYear,
    matches,
    availableRecommendedSubjects,
    unavailableRecommendedSubjects,
    promptText,
  };
}
