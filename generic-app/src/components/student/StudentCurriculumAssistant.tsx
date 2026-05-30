"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Compass,
  Download,
  GraduationCap,
  Home,
  Info,
  ListChecks,
  Search,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ChoiceGroup,
  CurriculumCohort,
  CurriculumGrade,
  CurriculumSemester,
  CurriculumSubject,
  SchoolCurriculum,
  SubjectCategory,
} from "@/lib/curriculum/schema";

type StudentCurriculumAssistantProps = {
  curriculum: SchoolCurriculum;
};

type ViewMode = "home" | "recommend" | "roadmap" | "subjects";
type SelectionState = Record<string, string[]>;

type SubjectLocation = {
  cohort: CurriculumCohort;
  grade: number;
  semester: number;
  group: ChoiceGroup;
  subject: CurriculumSubject;
};

type InterestTag = {
  id: string;
  label: string;
  description: string;
  matcher: (subject: CurriculumSubject) => boolean;
};

type RecommendationProfile = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tagIds: string[];
  keywords: string[];
};

type SharedAssistantState = {
  mode?: ViewMode;
  cohortYear?: string;
  activeGrade?: number | "all";
  selectedTagIds?: string[];
  selectedProfileId?: string | null;
  selectedProfileIds?: string[];
  selectedArea?: string;
  selectedCategory?: string;
  profileQuery?: string;
  search?: string;
  selection?: SelectionState;
};

const categoryTone: Record<string, string> = {
  공통: "bg-slate-100 text-slate-600",
  일반선택: "bg-sky-100 text-sky-700",
  진로선택: "bg-emerald-100 text-emerald-700",
  융합선택: "bg-violet-100 text-violet-700",
  전문교과: "bg-amber-100 text-amber-700",
  기타: "bg-slate-100 text-slate-600",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function encodeSharedState(state: SharedAssistantState) {
  const encoded = encodeURIComponent(JSON.stringify(state));

  return btoa(encoded).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSharedState(value: string | null): SharedAssistantState {
  if (!value) return {};

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = JSON.parse(decodeURIComponent(atob(padded))) as SharedAssistantState;

    return decoded && typeof decoded === "object" ? decoded : {};
  } catch {
    return {};
  }
}

function getStorageKey() {
  if (typeof window === "undefined") return "";

  return `student-curriculum-assistant:${window.location.pathname}`;
}

function getInitialSharedState(): SharedAssistantState {
  if (typeof window === "undefined") return {};

  const queryState = new URLSearchParams(window.location.search).get("state");
  if (queryState) return decodeSharedState(queryState);

  try {
    return decodeSharedState(window.localStorage.getItem(getStorageKey()));
  } catch {
    return {};
  }
}

function persistSharedState(state: SharedAssistantState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(), encodeSharedState(state));
  } catch {
    // Local storage can be unavailable in private or restricted browser modes.
  }
}

function buildShareUrl(state: SharedAssistantState) {
  const url = new URL(window.location.href);
  url.searchParams.set("state", encodeSharedState(state));

  return url.toString();
}

function subjectKey(subject: CurriculumSubject) {
  return `${subject.name}:${subject.credits}:${subject.area ?? ""}:${subject.category ?? ""}`;
}

function groupKey(cohort: CurriculumCohort, grade: number, semester: number, group: ChoiceGroup) {
  return `${cohort.entranceYear}:${grade}:${semester}:${group.id}`;
}

function semesterKey(grade: number, semester: number) {
  return `${grade}-${semester}`;
}

function selectableGrades(cohort: CurriculumCohort): CurriculumGrade[] {
  return cohort.grades
    .filter((grade) => grade.grade >= 2)
    .map((grade) => ({
      ...grade,
      semesters: grade.semesters
        .filter((semester) => semester.choiceGroups.length > 0 || semester.requiredSubjects.length > 0)
        .sort((a, b) => a.semester - b.semester),
    }))
    .filter((grade) => grade.semesters.length > 0)
    .sort((a, b) => a.grade - b.grade);
}

function requiredSubjectsForSelectableGrades(cohort: CurriculumCohort) {
  return selectableGrades(cohort).flatMap((grade) =>
    grade.semesters.flatMap((semester) => semester.requiredSubjects),
  );
}

function choiceLocations(cohort: CurriculumCohort): SubjectLocation[] {
  return selectableGrades(cohort).flatMap((grade) =>
    grade.semesters.flatMap((semester) =>
      semester.choiceGroups.flatMap((group) =>
        group.subjects.map((subject) => ({
          cohort,
          grade: grade.grade,
          semester: semester.semester,
          group,
          subject,
        })),
      ),
    ),
  );
}

function uniqueSubjects(locations: SubjectLocation[]) {
  const seen = new Set<string>();
  const result: SubjectLocation[] = [];

  locations.forEach((location) => {
    const key = normalizeText(location.subject.name);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(location);
  });

  return result;
}

function gradeLabel(grade: number, semester?: number) {
  return semester ? `${grade}학년 ${semester}학기` : `${grade}학년`;
}

function cohortDisplayLabel(cohort: CurriculumCohort) {
  return `${cohort.entranceYear}학년도 입학생`;
}

function countRequiredCredits(cohort: CurriculumCohort) {
  return requiredSubjectsForSelectableGrades(cohort).reduce((sum, subject) => sum + subject.credits, 0);
}

function getGroupRecords(cohort: CurriculumCohort) {
  return selectableGrades(cohort).flatMap((grade) =>
    grade.semesters.flatMap((semester) =>
      semester.choiceGroups.map((group) => ({
        id: groupKey(cohort, grade.grade, semester.semester, group),
        grade: grade.grade,
        semester: semester.semester,
        group,
      })),
    ),
  );
}

function calculateSemesterProgress(
  cohort: CurriculumCohort,
  grade: CurriculumGrade,
  semester: CurriculumSemester,
  selection: SelectionState,
) {
  const requiredCredits = semester.requiredSubjects.reduce((sum, subject) => sum + subject.credits, 0);
  const groups = semester.choiceGroups.map((group) => ({
    id: groupKey(cohort, grade.grade, semester.semester, group),
    group,
  }));
  const selectedCredits = groups.reduce((total, record) => {
    const selected = selection[record.id] ?? [];

    return (
      total +
      record.group.subjects.reduce((sum, subject) => {
        return selected.includes(subject.name) ? sum + subject.credits : sum;
      }, 0)
    );
  }, 0);
  const expectedChoiceCredits = groups.reduce((total, record) => {
    const creditsEach = record.group.creditsEach ?? record.group.subjects[0]?.credits ?? 0;

    return total + creditsEach * record.group.choose;
  }, 0);
  const completedGroups = groups.filter(
    (record) => (selection[record.id]?.length ?? 0) >= record.group.choose,
  ).length;

  return {
    requiredCredits,
    selectedCredits,
    totalCredits: requiredCredits + selectedCredits,
    expectedCredits: requiredCredits + expectedChoiceCredits,
    completedGroups,
    totalGroups: groups.length,
  };
}

function calculateGradeProgress(cohort: CurriculumCohort, grade: CurriculumGrade, selection: SelectionState) {
  return grade.semesters.reduce(
    (total, semester) => {
      const progress = calculateSemesterProgress(cohort, grade, semester, selection);

      return {
        totalCredits: total.totalCredits + progress.totalCredits,
        expectedCredits: total.expectedCredits + progress.expectedCredits,
        completedGroups: total.completedGroups + progress.completedGroups,
        totalGroups: total.totalGroups + progress.totalGroups,
      };
    },
    {
      totalCredits: 0,
      expectedCredits: 0,
      completedGroups: 0,
      totalGroups: 0,
    },
  );
}

function calculateSelectionSummary(selection: SelectionState, cohort: CurriculumCohort) {
  const groups = getGroupRecords(cohort);
  const requiredCredits = countRequiredCredits(cohort);
  const selectedNames = Object.values(selection).flat();
  const selectedCredits = groups.reduce((total, record) => {
    const selected = selection[record.id] ?? [];
    return (
      total +
      record.group.subjects.reduce((sum, subject) => {
        return selected.includes(subject.name) ? sum + subject.credits : sum;
      }, 0)
    );
  }, 0);
  const expectedChoiceCredits = groups.reduce((total, record) => {
    const creditsEach = record.group.creditsEach ?? record.group.subjects[0]?.credits ?? 0;
    return total + creditsEach * record.group.choose;
  }, 0);
  const completedGroups = groups.filter(
    (record) => (selection[record.id]?.length ?? 0) >= record.group.choose,
  ).length;

  return {
    requiredCredits,
    selectedCredits,
    totalCredits: requiredCredits + selectedCredits,
    expectedCredits: requiredCredits + expectedChoiceCredits,
    selectedNames,
    selectedCount: new Set(selectedNames).size,
    completedGroups,
    totalGroups: groups.length,
  };
}

function buildSelectedSubjectOrigins(selection: SelectionState, cohort: CurriculumCohort) {
  const records = getGroupRecords(cohort);
  const recordById = new Map(records.map((record) => [record.id, record]));
  const origins = new Map<string, string>();

  Object.entries(selection).forEach(([groupId, names]) => {
    const record = recordById.get(groupId);
    const label = record ? gradeLabel(record.grade, record.semester) : "이미 선택";

    names.forEach((name) => {
      if (!origins.has(name)) origins.set(name, label);
    });
  });

  return origins;
}

function makeInterestTags(locations: SubjectLocation[]) {
  const areas = Array.from(
    new Set(
      locations
        .map(inferSubjectArea)
        .filter((area): area is string => Boolean(area && area.trim().length > 0)),
    ),
  ).slice(0, 8);
  const categories = Array.from(
    new Set(
      locations
        .map(inferSubjectCategory)
        .filter((category): category is SubjectCategory => Boolean(category)),
    ),
  );

  const areaTags: InterestTag[] = areas.map((area) => ({
    id: `area:${area}`,
    label: area,
    description: `${area} 영역 과목 중심으로 보기`,
    matcher: (subject) => {
      const location = locations.find((candidate) => candidate.subject.name === subject.name);
      return location ? inferSubjectArea(location) === area : subject.area === area;
    },
  }));
  const categoryTags: InterestTag[] = categories.map((category) => ({
    id: `category:${category}`,
    label: category,
    description: `${category} 과목 중심으로 보기`,
    matcher: (subject) => {
      const location = locations.find((candidate) => candidate.subject.name === subject.name);
      return location ? inferSubjectCategory(location) === category : subject.category === category;
    },
  }));

  return [...areaTags, ...categoryTags].slice(0, 12);
}

function makeRecommendationProfiles(tags: InterestTag[], locations: SubjectLocation[]) {
  const profiles: RecommendationProfile[] = tags.map((tag) => ({
    id: `tag:${tag.id}`,
    title: `${tag.label} 계열`,
    subtitle: tag.label,
    description: tag.description,
    tagIds: [tag.id],
    keywords: [tag.label, tag.description],
  }));
  const careerGroups = [
    {
      id: "computer",
      title: "컴퓨터공학과",
      subtitle: "소프트웨어 · 인공지능",
      description: "프로그래밍, 인공지능, 정보 과목을 중심으로 확인합니다.",
      keywords: ["컴퓨터", "소프트웨어", "인공지능", "정보", "프로그래밍", "수학", "공학"],
    },
    {
      id: "engineering",
      title: "공학계열",
      subtitle: "기계 · 전자 · 로봇",
      description: "수학, 과학, 기술·공학 과목을 중심으로 확인합니다.",
      keywords: ["공학", "로봇", "기술", "물리", "미적분", "기하", "창의 공학", "전자"],
    },
    {
      id: "nursing",
      title: "간호학과",
      subtitle: "보건 · 생명",
      description: "생명과학, 화학, 보건 계열 과목을 중심으로 확인합니다.",
      keywords: ["간호", "보건", "생명", "화학", "인체", "의학", "의생명"],
    },
    {
      id: "biology",
      title: "생명과학과",
      subtitle: "생명 · 화학 · 환경",
      description: "생명과학과 화학 탐구 과목을 중심으로 확인합니다.",
      keywords: ["생명", "화학", "환경", "세포", "유전", "과학"],
    },
    {
      id: "business",
      title: "경영학과",
      subtitle: "경영 · 경제 · 사회",
      description: "경제, 사회, 수학 관련 과목을 중심으로 확인합니다.",
      keywords: ["경영", "경제", "금융", "사회", "수학", "확률"],
    },
    {
      id: "law",
      title: "법학과",
      subtitle: "법 · 정치 · 윤리",
      description: "사회, 법, 정치, 윤리 과목을 중심으로 확인합니다.",
      keywords: ["법", "정치", "윤리", "사회", "시민", "세계"],
    },
    {
      id: "education",
      title: "교육학과",
      subtitle: "교육 · 심리 · 인문",
      description: "교육, 심리, 인문·사회 과목을 중심으로 확인합니다.",
      keywords: ["교육", "심리", "인문", "사회", "국어", "문학"],
    },
    {
      id: "media",
      title: "미디어커뮤니케이션학과",
      subtitle: "언어 · 매체 · 문화",
      description: "언어, 문학, 영상, 문화 과목을 중심으로 확인합니다.",
      keywords: ["미디어", "매체", "영상", "문화", "언어", "문학", "영어"],
    },
    {
      id: "art-design",
      title: "디자인·예술계열",
      subtitle: "미술 · 음악 · 창작",
      description: "예술, 창작, 매체 표현 과목을 중심으로 확인합니다.",
      keywords: ["디자인", "예술", "미술", "음악", "창작", "매체", "연극"],
    },
  ];

  careerGroups.forEach((group) => {
    const matchingTagIds = tags
      .filter((tag) => group.keywords.some((keyword) => tag.label.includes(keyword) || tag.description.includes(keyword)))
      .map((tag) => tag.id);
    const matchingSubjects = locations.filter((location) => {
      const haystack = [
        location.subject.name,
        location.subject.area,
        location.subject.category,
        location.subject.rawText,
        location.group.label,
      ]
        .filter(Boolean)
        .join(" ");

      return group.keywords.some((keyword) => haystack.includes(keyword));
    });

    if (matchingTagIds.length > 0 || matchingSubjects.length > 0) {
      profiles.unshift({
        id: `career:${group.id}`,
        title: group.title,
        subtitle: group.subtitle,
        description: group.description,
        tagIds: matchingTagIds,
        keywords: group.keywords,
      });
    }
  });
  const keywordGroups = [
    {
      id: "stem",
      title: "이공·공학 계열",
      subtitle: "수학 · 과학 · 기술",
      keywords: ["수학", "미적분", "기하", "확률", "과학", "물리", "화학", "생명", "지구", "정보", "공학", "기술"],
    },
    {
      id: "medical",
      title: "보건·의생명 계열",
      subtitle: "생명 · 화학 · 보건",
      keywords: ["생명", "화학", "보건", "간호", "의학", "인체", "식품", "환경"],
    },
    {
      id: "humanities",
      title: "인문·사회 계열",
      subtitle: "국어 · 사회 · 언어",
      keywords: ["국어", "문학", "독서", "사회", "정치", "경제", "윤리", "역사", "지리", "세계", "언어"],
    },
    {
      id: "business",
      title: "상경·경영 계열",
      subtitle: "경제 · 수학 · 사회",
      keywords: ["경제", "수학", "확률", "사회", "정치", "법", "경영", "금융"],
    },
    {
      id: "arts",
      title: "예술·체육 계열",
      subtitle: "예술 · 체육 · 창작",
      keywords: ["음악", "미술", "예술", "체육", "창작", "연극", "매체", "스포츠"],
    },
  ];

  keywordGroups.forEach((group) => {
    const matchingTagIds = tags
      .filter((tag) => group.keywords.some((keyword) => tag.label.includes(keyword)))
      .map((tag) => tag.id);
    const matchingSubjects = locations.filter((location) => {
      const haystack = [
        location.subject.name,
        location.subject.area,
        location.subject.category,
        location.subject.rawText,
      ]
        .filter(Boolean)
        .join(" ");

      return group.keywords.some((keyword) => haystack.includes(keyword));
    });

    if (matchingTagIds.length > 0 || matchingSubjects.length > 0) {
      profiles.unshift({
        id: `profile:${group.id}`,
        title: group.title,
        subtitle: group.subtitle,
        description: `${group.subtitle} 관련 과목을 우선 추천합니다.`,
        tagIds: matchingTagIds,
        keywords: group.keywords,
      });
    }
  });

  return profiles.slice(0, 28);
}

function tagMatches(tags: InterestTag[], selectedTagIds: string[], subject: CurriculumSubject) {
  if (selectedTagIds.length === 0) return true;
  return tags.some((tag) => selectedTagIds.includes(tag.id) && tag.matcher(subject));
}

function profileMatches(profile: RecommendationProfile, subject: CurriculumSubject, tags: InterestTag[]) {
  if (profile.tagIds.length > 0 && tagMatches(tags, profile.tagIds, subject)) {
    return true;
  }

  const haystack = [subject.name, subject.area, subject.category, subject.rawText]
    .filter(Boolean)
    .join(" ");

  return profile.keywords.some((keyword) => haystack.includes(keyword));
}

function countMatchingProfiles(
  profiles: RecommendationProfile[],
  subject: CurriculumSubject,
  tags: InterestTag[],
) {
  return profiles.filter((profile) => profileMatches(profile, subject, tags)).length;
}

function buildRecommendationReason({
  location,
  selectedProfiles,
  selectedTagIds,
  tags,
}: {
  location: SubjectLocation;
  selectedProfiles: RecommendationProfile[];
  selectedTagIds: string[];
  tags: InterestTag[];
}) {
  const matchingProfiles = selectedProfiles.filter((profile) =>
    profileMatches(profile, location.subject, tags),
  );
  if (matchingProfiles.length > 0) {
    return `${matchingProfiles.map((profile) => profile.title).join(", ")} 목표와 연결되는 과목입니다.`;
  }

  const matchingTags = tags.filter(
    (tag) => selectedTagIds.includes(tag.id) && tag.matcher(location.subject),
  );
  if (matchingTags.length > 0) {
    return `${matchingTags.map((tag) => tag.label).join(", ")} 관심 영역과 연결되는 과목입니다.`;
  }

  return `${location.group.label}에서 ${location.group.choose}개 선택하는 ${location.subject.credits}학점 과목입니다.`;
}

function buildSubjectOverview(subject: CurriculumSubject) {
  const hints = [subject.area, subject.category].filter(Boolean).join(" · ");

  if (subject.rawText && subject.rawText.trim().length > 12) {
    return subject.rawText.trim();
  }

  if (hints) {
    return `${subject.name}은 ${hints} 성격의 ${subject.credits}학점 선택과목입니다. 같은 영역의 과목과 함께 비교하면서 진로 방향과 학습 부담을 확인해 보세요.`;
  }

  return `${subject.name}은 ${subject.credits}학점 선택과목입니다. 편제표의 같은 선택 묶음 안에서 다른 과목과 비교해 선택할 수 있습니다.`;
}

function buildRecommendedFor(location: SubjectLocation) {
  const area = inferSubjectArea(location);
  const subjectName = location.subject.name;
  const rules = [
    { label: "수학·과학 문제 해결을 좋아하는 학생", keywords: ["수학", "과학", "물리", "화학", "생명", "지구", "미적분", "기하"] },
    { label: "사회 현상과 제도, 시사 이슈를 탐구하고 싶은 학생", keywords: ["사회", "경제", "정치", "법", "윤리", "역사", "지리"] },
    { label: "언어, 문학, 읽기와 쓰기 활동에 관심 있는 학생", keywords: ["국어", "문학", "독서", "언어", "작문", "영어"] },
    { label: "보건, 생명, 환경, 의생명 분야 진로를 고민하는 학생", keywords: ["보건", "간호", "생명", "인체", "식품", "환경"] },
    { label: "예술적 표현, 창작, 공연·매체 활동에 관심 있는 학생", keywords: ["음악", "미술", "연극", "예술", "매체", "창작"] },
    { label: "기술, 정보, 공학적 설계와 실습에 관심 있는 학생", keywords: ["정보", "프로그래밍", "인공지능", "기술", "공학", "로봇"] },
  ];
  const haystack = `${area} ${subjectName} ${location.group.label} ${location.subject.rawText ?? ""}`;

  return rules
    .filter((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))
    .map((rule) => rule.label)
    .slice(0, 3);
}

function buildLearningKeywords(location: SubjectLocation) {
  const haystack = `${inferSubjectArea(location)} ${location.subject.name} ${location.group.label} ${
    location.subject.rawText ?? ""
  }`;
  const keywords = [
    "탐구",
    "분석",
    "토론",
    "실험",
    "설계",
    "자료 해석",
    "문제 해결",
    "창작",
    "의사소통",
    "진로 연계",
  ];

  return keywords.filter((keyword) => haystack.includes(keyword)).slice(0, 5);
}

function buildSubjectAvailability(cohort: CurriculumCohort, subjectName: string) {
  return selectableGrades(cohort).flatMap((grade) =>
    grade.semesters.flatMap((semester) => {
      const required = semester.requiredSubjects
        .filter((subject) => subject.name === subjectName)
        .map((subject) => ({
          grade: grade.grade,
          semester: semester.semester,
          label: "필수 이수",
          type: "required" as const,
          credits: subject.credits,
        }));
      const choices = semester.choiceGroups.flatMap((group) =>
        group.subjects
          .filter((subject) => subject.name === subjectName)
          .map((subject) => ({
            grade: grade.grade,
            semester: semester.semester,
            label: group.label,
            type: "choice" as const,
            choose: group.choose,
            credits: subject.credits,
          })),
      );

      return [...required, ...choices];
    }),
  );
}

function inferSubjectArea(location: SubjectLocation) {
  if (location.subject.area) return location.subject.area;

  const haystack = `${location.subject.name} ${location.group.label}`;
  const rules = [
    { label: "국어", keywords: ["국어", "문학", "독서", "언어", "화법", "작문"] },
    { label: "수학", keywords: ["수학", "대수", "미적분", "기하", "확률"] },
    { label: "영어", keywords: ["영어"] },
    { label: "사회", keywords: ["사회", "경제", "정치", "윤리", "세계", "지리", "역사", "법"] },
    { label: "과학", keywords: ["과학", "물리", "화학", "생명", "지구", "실험"] },
    { label: "생활·교양", keywords: ["일본어", "중국어", "한자", "정보", "기술", "가정", "보건", "심리"] },
    { label: "예술·체육", keywords: ["음악", "미술", "연극", "체육", "스포츠", "예술"] },
    { label: "전문·융합", keywords: ["조리", "간호", "인공지능", "융합", "탐구"] },
  ];

  return rules.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))?.label ?? "기타";
}

function inferSubjectCategory(location: SubjectLocation) {
  if (location.subject.category) return location.subject.category;
  if (location.group.label.includes("증배")) return "증배";
  if (location.subject.name.includes("실험") || location.subject.name.includes("탐구")) return "심화·탐구";

  return "선택과목";
}

function SubjectMeta({
  subject,
  location,
  light = false,
}: {
  subject: CurriculumSubject;
  location?: SubjectLocation;
  light?: boolean;
}) {
  const labels = [
    location ? inferSubjectArea(location) : subject.area,
    location ? inferSubjectCategory(location) : subject.category,
  ].filter(
    (label): label is string => typeof label === "string" && label.length > 0,
  );

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className={cx(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            light ? "bg-white/15 text-white" : categoryTone[label] ?? "bg-slate-100 text-slate-600",
          )}
        >
          {label}
        </span>
      ))}
      <span
        className={cx(
          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
          light ? "bg-white/15 text-white" : "bg-white text-slate-600",
        )}
      >
        {subject.credits}학점
      </span>
    </div>
  );
}

function SubjectCard({
  location,
  selected = false,
  recommendationBadge,
  recommendationReason,
  onClick,
  onDetails,
}: {
  location: SubjectLocation;
  selected?: boolean;
  recommendationBadge?: string;
  recommendationReason?: string;
  onClick?: () => void;
  onDetails?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-5 text-slate-950">{location.subject.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {gradeLabel(location.grade, location.semester)} · {location.group.label}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {selected && <Check className="h-4 w-4 text-blue-600" />}
          {onDetails && <Info className="h-4 w-4 text-slate-400" />}
        </span>
      </div>
      <SubjectMeta subject={location.subject} location={location} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
          우리 학교 개설
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          {gradeLabel(location.grade, location.semester)}
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          택{location.group.choose}
        </span>
      </div>
      {recommendationBadge && (
        <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {recommendationBadge}
        </span>
      )}
      {recommendationReason && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{recommendationReason}</p>
      )}
    </>
  );

  if (onClick) {
    return (
      <div
        className={cx(
          "rounded-lg border transition",
          selected
            ? "border-blue-300 bg-blue-50 shadow-sm"
            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40",
        )}
      >
        <button type="button" onClick={onClick} className="w-full p-3 text-left active:scale-[0.99]">
          {content}
        </button>
        {onDetails && (
          <button
            type="button"
            onClick={onDetails}
            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-3 py-2 text-xs font-bold text-slate-500"
          >
            <Info className="h-3.5 w-3.5" />
            과목 상세 보기
          </button>
        )}
      </div>
    );
  }

  return <article className="rounded-lg border border-slate-200 bg-white p-3">{content}</article>;
}

function ChoiceGroupRoadmap({
  cohort,
  grade,
  semester,
  group,
  selection,
  selectedSubjectSet,
  selectedSubjectOrigins,
  recommendedNames,
  onToggle,
}: {
  cohort: CurriculumCohort;
  grade: number;
  semester: number;
  group: ChoiceGroup;
  selection: string[];
  selectedSubjectSet: Set<string>;
  selectedSubjectOrigins: Map<string, string>;
  recommendedNames: Set<string>;
  onToggle: (groupId: string, group: ChoiceGroup, subject: CurriculumSubject) => void;
}) {
  const id = groupKey(cohort, grade, semester, group);
  const isComplete = selection.length >= group.choose;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-950">{group.label}</h4>
          {group.notes && group.notes.length > 0 && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{group.notes[0]}</p>
          )}
        </div>
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
            isComplete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
          )}
        >
          {selection.length}/{group.choose}
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {group.subjects.map((subject) => {
          const isSelected = selection.includes(subject.name);
          const isDuplicate = selectedSubjectSet.has(subject.name) && !isSelected;
          const isFull = group.choose > 1 && selection.length >= group.choose && !isSelected;
          const isRecommended = recommendedNames.has(subject.name);
          const disabled = isDuplicate || isFull;
          const conflictLabel = isDuplicate
            ? `${selectedSubjectOrigins.get(subject.name) ?? "이미"} 선택`
            : isFull
              ? `택${group.choose} 완료`
              : null;

          return (
            <button
              key={subjectKey(subject)}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(id, group, subject)}
              className={cx(
                "min-h-14 rounded-md border px-3 py-2 text-left transition",
                isSelected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isRecommended
                    ? "border-emerald-200 bg-emerald-50 text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-950 hover:border-blue-300",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-5">{subject.name}</span>
                {isRecommended && !isSelected && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    추천
                  </span>
                )}
                {isDuplicate && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                    {conflictLabel}
                  </span>
                )}
                {isFull && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {conflictLabel}
                  </span>
                )}
              </div>
              <SubjectMeta subject={subject} light={isSelected} />
            </button>
          );
        })}
      </div>
    </article>
  );
}

function BottomNav({ mode, setMode }: { mode: ViewMode; setMode: (mode: ViewMode) => void }) {
  const items: Array<{ mode: ViewMode; label: string; icon: typeof Home }> = [
    { mode: "home", label: "홈", icon: Home },
    { mode: "recommend", label: "추천", icon: Sparkles },
    { mode: "roadmap", label: "로드맵", icon: ClipboardList },
    { mode: "subjects", label: "과목", icon: Search },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = mode === item.mode;

          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => setMode(item.mode)}
              className={cx(
                "flex flex-col items-center justify-center gap-1 text-xs font-semibold",
                active ? "text-blue-600" : "text-slate-500",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SubjectDetailPanel({
  location,
  selected,
  profiles,
  tags,
  onClose,
  onSelect,
}: {
  location: SubjectLocation | null;
  selected: boolean;
  profiles: RecommendationProfile[];
  tags: InterestTag[];
  onClose: () => void;
  onSelect: (location: SubjectLocation) => void;
}) {
  if (!location) return null;

  const subject = location.subject;
  const matchingProfiles = profiles.filter((profile) => profileMatches(profile, subject, tags));
  const peerSubjects = location.group.subjects
    .filter((candidate) => candidate.name !== subject.name)
    .slice(0, 8);
  const recommendedFor = buildRecommendedFor(location);
  const learningKeywords = buildLearningKeywords(location);
  const availability = buildSubjectAvailability(location.cohort, subject.name);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 px-4 py-6">
      <div className="mx-auto flex max-h-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-600">{gradeLabel(location.grade, location.semester)}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{subject.name}</h2>
            <SubjectMeta subject={subject} location={location} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <section className="rounded-lg bg-blue-50 p-3">
            <h3 className="text-sm font-bold text-blue-900">과목 한눈에 보기</h3>
            <p className="mt-1 text-sm leading-6 text-blue-900/75">{buildSubjectOverview(subject)}</p>
          </section>

          {matchingProfiles.length > 0 && (
            <section className="rounded-lg bg-emerald-50 p-3">
              <h3 className="text-sm font-bold text-emerald-900">연결되는 진로·학과</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {matchingProfiles.slice(0, 6).map((profile) => (
                  <span
                    key={profile.id}
                    className="rounded-full bg-white px-2 py-1 text-xs font-bold text-emerald-700"
                  >
                    {profile.title}
                  </span>
                ))}
              </div>
            </section>
          )}

          {recommendedFor.length > 0 && (
            <section className="rounded-lg bg-sky-50 p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-sky-700" />
                <h3 className="text-sm font-bold text-sky-900">이 과목을 들으면 좋은 학생</h3>
              </div>
              <ul className="mt-2 space-y-1.5">
                {recommendedFor.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-sky-900/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">학습·탐구 키워드</h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from(new Set([inferSubjectArea(location), inferSubjectCategory(location), ...learningKeywords])).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">학교 개설 정보</h3>
            </div>
            <div className="mt-2 space-y-2">
              {availability.map((item, index) => (
                <div
                  key={`${item.grade}-${item.semester}-${item.label}-${index}`}
                  className="rounded-md bg-white px-3 py-2 text-xs leading-5 text-slate-600"
                >
                  <span className="font-bold text-slate-900">
                    {gradeLabel(item.grade, item.semester)}
                  </span>
                  {" · "}
                  {item.type === "choice" ? `${item.label}에서 택${item.choose}` : item.label}
                  {" · "}
                  {item.credits}학점
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-900">편제표 위치</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {location.group.label}에서 {location.group.choose}개 선택하는 묶음에 포함되어 있습니다.
            </p>
          </section>

          <section className="rounded-lg bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-900">선택 참고</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              이 과목은 {subject.credits}학점 과목입니다. 같은 선택 묶음 안에서 이미 필요한 개수를
              채웠다면 먼저 다른 과목을 해제해야 합니다.
            </p>
          </section>

          {peerSubjects.length > 0 && (
            <section className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-900">같은 묶음의 비교 과목</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {peerSubjects.map((candidate) => (
                  <span
                    key={subjectKey(candidate)}
                    className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    {candidate.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {subject.rawText && (
            <section className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-900">원문 단서</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{subject.rawText}</p>
            </section>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={() => {
              onSelect(location);
              onClose();
            }}
            className={cx(
              "h-11 w-full rounded-lg text-sm font-bold",
              selected ? "bg-slate-100 text-slate-500" : "bg-blue-600 text-white",
            )}
          >
            {selected ? "이미 로드맵에 선택됨" : "로드맵에 담기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentCurriculumAssistant({ curriculum }: StudentCurriculumAssistantProps) {
  const [initialSharedState] = useState(getInitialSharedState);
  const initialMode: ViewMode =
    initialSharedState.mode &&
    ["home", "recommend", "roadmap", "subjects"].includes(initialSharedState.mode)
      ? initialSharedState.mode
      : "home";
  const initialCohortYear =
    initialSharedState.cohortYear &&
    curriculum.cohorts.some((cohort) => cohort.entranceYear === initialSharedState.cohortYear)
      ? initialSharedState.cohortYear
      : curriculum.cohorts[0]?.entranceYear ?? "";
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [cohortYear, setCohortYear] = useState(initialCohortYear);
  const [activeGrade, setActiveGrade] = useState<number | "all">(initialSharedState.activeGrade ?? "all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSharedState.selectedTagIds ?? []);
  const [profileQuery, setProfileQuery] = useState(initialSharedState.profileQuery ?? "");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialSharedState.selectedProfileId ?? null,
  );
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
    initialSharedState.selectedProfileIds ??
      (initialSharedState.selectedProfileId ? [initialSharedState.selectedProfileId] : []),
  );
  const [selectedArea, setSelectedArea] = useState(initialSharedState.selectedArea ?? "전체");
  const [selectedCategory, setSelectedCategory] = useState(initialSharedState.selectedCategory ?? "전체");
  const [activeSubject, setActiveSubject] = useState<SubjectLocation | null>(null);
  const [search, setSearch] = useState(initialSharedState.search ?? "");
  const [selection, setSelection] = useState<SelectionState>(initialSharedState.selection ?? {});
  const [collapsedSemesterIds, setCollapsedSemesterIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  const cohort = useMemo(
    () =>
      curriculum.cohorts.find((candidate) => candidate.entranceYear === cohortYear) ??
      curriculum.cohorts[0],
    [cohortYear, curriculum.cohorts],
  );
  const grades = useMemo(() => (cohort ? selectableGrades(cohort) : []), [cohort]);
  const locations = useMemo(() => (cohort ? choiceLocations(cohort) : []), [cohort]);
  const subjectLocations = useMemo(() => uniqueSubjects(locations), [locations]);
  const tags = useMemo(() => makeInterestTags(locations), [locations]);
  const profiles = useMemo(() => makeRecommendationProfiles(tags, locations), [locations, tags]);
  const areaOptions = useMemo(
    () => [
      "전체",
      ...Array.from(
        new Set(
          subjectLocations
            .map(inferSubjectArea)
            .filter((area): area is string => typeof area === "string" && area.length > 0),
        ),
      ),
    ],
    [subjectLocations],
  );
  const categoryOptions = useMemo(
    () => [
      "전체",
      ...Array.from(
        new Set(
          subjectLocations
            .map(inferSubjectCategory)
            .filter((category) => typeof category === "string" && category.length > 0),
        ),
      ),
    ],
    [subjectLocations],
  );
  const activeSelectedArea = areaOptions.includes(selectedArea) ? selectedArea : "전체";
  const activeSelectedCategory = categoryOptions.includes(selectedCategory) ? selectedCategory : "전체";
  const selectedProfiles = useMemo(
    () => profiles.filter((profile) => selectedProfileIds.includes(profile.id)),
    [profiles, selectedProfileIds],
  );
  const selectedSubjectSet = useMemo(() => new Set(Object.values(selection).flat()), [selection]);
  const selectedSubjectOrigins = useMemo(
    () => (cohort ? buildSelectedSubjectOrigins(selection, cohort) : new Map<string, string>()),
    [cohort, selection],
  );
  const recommendedNames = useMemo(() => {
    const names = new Set<string>();
    locations.forEach((location) => {
      if (
        tagMatches(tags, selectedTagIds, location.subject) ||
        selectedProfiles.some((profile) => profileMatches(profile, location.subject, tags))
      ) {
        names.add(location.subject.name);
      }
    });
    return names;
  }, [locations, selectedProfiles, selectedTagIds, tags]);
  const summary = useMemo(
    () => (cohort ? calculateSelectionSummary(selection, cohort) : null),
    [cohort, selection],
  );
  const selectedSubjectNames = useMemo(() => Array.from(selectedSubjectSet), [selectedSubjectSet]);
  const gradeProgress = useMemo(() => {
    if (!cohort) return [];

    return selectableGrades(cohort).map((grade) => ({
      grade: grade.grade,
      ...calculateGradeProgress(cohort, grade, selection),
    }));
  }, [cohort, selection]);

  const filteredGrades = useMemo(() => {
    if (activeGrade === "all") return grades;
    return grades.filter((grade) => grade.grade === activeGrade);
  }, [activeGrade, grades]);

  const filteredSubjects = useMemo(() => {
    const query = search.trim();
    return subjectLocations.filter((location) => {
      const matchesSearch =
        !query ||
        [location.subject.name, location.subject.area, location.subject.category, location.group.label]
          .filter(Boolean)
          .some((value) => value?.includes(query));
      const matchesTag = tagMatches(tags, selectedTagIds, location.subject);
      const matchesProfile = selectedProfiles.length > 0
        ? selectedProfiles.some((profile) => profileMatches(profile, location.subject, tags))
        : true;
      const matchesGrade = activeGrade === "all" || location.grade === activeGrade;
      const matchesArea = activeSelectedArea === "전체" || inferSubjectArea(location) === activeSelectedArea;
      const matchesCategory =
        activeSelectedCategory === "전체" || inferSubjectCategory(location) === activeSelectedCategory;

      return matchesSearch && matchesTag && matchesProfile && matchesGrade && matchesArea && matchesCategory;
    }).sort((a, b) => {
      if (selectedProfiles.length < 2) {
        return a.grade - b.grade || a.semester - b.semester || a.subject.name.localeCompare(b.subject.name);
      }

      const aMatches = countMatchingProfiles(selectedProfiles, a.subject, tags);
      const bMatches = countMatchingProfiles(selectedProfiles, b.subject, tags);

      if (aMatches !== bMatches) return bMatches - aMatches;
      return a.grade - b.grade || a.semester - b.semester || a.subject.name.localeCompare(b.subject.name);
    });
  }, [
    activeGrade,
    activeSelectedArea,
    activeSelectedCategory,
    search,
    selectedProfiles,
    selectedTagIds,
    subjectLocations,
    tags,
  ]);

  const filteredProfiles = useMemo(() => {
    const query = profileQuery.trim();
    if (!query) return profiles.slice(0, 6);

    return profiles
      .filter((profile) =>
        [profile.title, profile.subtitle, profile.description, ...profile.keywords]
          .join(" ")
          .includes(query),
      )
      .slice(0, 8);
  }, [profileQuery, profiles]);
  const recommendationSections = useMemo(() => {
    const bySemester = new Map<string, { grade: number; semester: number; subjects: SubjectLocation[] }>();

    filteredSubjects.forEach((location) => {
      const key = semesterKey(location.grade, location.semester);
      const existing = bySemester.get(key);
      if (existing) {
        existing.subjects.push(location);
        return;
      }

      bySemester.set(key, {
        grade: location.grade,
        semester: location.semester,
        subjects: [location],
      });
    });

    return Array.from(bySemester.values()).sort(
      (a, b) => a.grade - b.grade || a.semester - b.semester,
    );
  }, [filteredSubjects]);
  const selectedTagPanels = useMemo(
    () =>
      selectedTagIds
        .map((tagId) => {
          const tag = tags.find((candidate) => candidate.id === tagId);
          if (!tag) return null;

          const tagText = `${tag.label} ${tag.description}`;
          const relatedProfiles = profiles
            .filter((profile) => profile.id !== `tag:${tag.id}`)
            .filter((profile) => {
              if (profile.tagIds.includes(tag.id)) return true;
              return profile.keywords.some(
                (keyword) => tagText.includes(keyword) || keyword.includes(tag.label),
              );
            })
            .slice(0, 6);

          return relatedProfiles.length > 0 ? { tag, profiles: relatedProfiles } : null;
        })
        .filter((panel): panel is { tag: InterestTag; profiles: RecommendationProfile[] } => Boolean(panel)),
    [profiles, selectedTagIds, tags],
  );

  const profileComparison = useMemo(() => {
    if (selectedProfiles.length < 2) {
      return {
        common: [] as SubjectLocation[],
        exclusive: [] as Array<{ profile: RecommendationProfile; subjects: SubjectLocation[] }>,
      };
    }

    const common = subjectLocations.filter((location) =>
      selectedProfiles.every((profile) => profileMatches(profile, location.subject, tags)),
    );
    const exclusive = selectedProfiles.map((profile) => ({
      profile,
      subjects: subjectLocations.filter(
        (location) =>
          profileMatches(profile, location.subject, tags) &&
          !selectedProfiles
            .filter((candidate) => candidate.id !== profile.id)
            .some((candidate) => profileMatches(candidate, location.subject, tags)),
      ),
    }));

    return { common, exclusive };
  }, [selectedProfiles, subjectLocations, tags]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    persistSharedState({
      mode,
      cohortYear: cohort?.entranceYear,
      activeGrade,
      selectedTagIds,
      selectedProfileId,
      selectedProfileIds,
      selectedArea,
      selectedCategory,
      profileQuery,
      search,
      selection,
    });
  }, [
    activeGrade,
    cohort?.entranceYear,
    mode,
    profileQuery,
    search,
    selectedArea,
    selectedCategory,
    selectedProfileId,
    selectedProfileIds,
    selectedTagIds,
    selection,
  ]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((current) =>
      current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id],
    );
  };

  const toggleSemesterSection = (id: string) => {
    setCollapsedSemesterIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProfile = (profile: RecommendationProfile) => {
    const active = selectedProfileIds.includes(profile.id);

    setSelectedProfileIds((current) => {
      if (active) {
        const next = current.filter((id) => id !== profile.id);
        setSelectedProfileId(next[0] ?? null);
        return next;
      }

      const next = [...current, profile.id].slice(-3);
      setSelectedProfileId(next[0] ?? null);
      return next;
    });
    setSelectedTagIds((current) => {
      if (active) return current.filter((id) => !profile.tagIds.includes(id));
      return Array.from(new Set([...current, ...profile.tagIds]));
    });
  };

  const handleToggleSubject = (groupId: string, group: ChoiceGroup, subject: CurriculumSubject) => {
    setSelection((current) => {
      const selected = current[groupId] ?? [];
      if (selected.includes(subject.name)) {
        return {
          ...current,
          [groupId]: selected.filter((name) => name !== subject.name),
        };
      }
      if (Object.entries(current).some(([id, names]) => id !== groupId && names.includes(subject.name))) {
        return current;
      }
      if (group.choose === 1) {
        return {
          ...current,
          [groupId]: [subject.name],
        };
      }
      if (selected.length >= group.choose) return current;

      return {
        ...current,
        [groupId]: [...selected, subject.name],
      };
    });
  };

  const selectRecommendation = (location: SubjectLocation) => {
    const id = groupKey(location.cohort, location.grade, location.semester, location.group);
    handleToggleSubject(id, location.group, location.subject);
    setMode("roadmap");
  };

  const handleShare = async () => {
    const url = buildShareUrl({
      mode,
      cohortYear: cohort?.entranceYear,
      activeGrade,
      selectedTagIds,
      selectedProfileId,
      selectedProfileIds,
      selectedArea,
      selectedCategory,
      profileQuery,
      search,
      selection,
    });

    try {
      const browserNavigator = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: Clipboard;
      };

      if (browserNavigator.share) {
        await browserNavigator.share({
          title: `${curriculum.schoolName} 선택과목 로드맵`,
          text: `${cohort ? cohortDisplayLabel(cohort) : ""} 선택과목 로드맵`,
          url,
        });
        return;
      }

      if (!browserNavigator.clipboard) throw new Error("Clipboard API is unavailable.");
      await browserNavigator.clipboard.writeText(url);
      showToast("공유 링크를 복사했습니다.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast("공유 링크를 복사했습니다.");
      } catch {
        showToast("공유 실패 - 주소창의 링크를 복사해 주세요.");
      }
    }
  };

  const handleExport = () => {
    if (!cohort || !summary) return;

    const canvas = document.createElement("canvas");
    const width = 900;
    const height = 780;
    const dpr = 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, 0, width, 92);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 28px Arial, sans-serif";
    ctx.fillText(`${curriculum.schoolName} 선택과목 로드맵`, 40, 56);
    ctx.font = "500 16px Arial, sans-serif";
    ctx.fillText(cohortDisplayLabel(cohort), 40, 80);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 24px Arial, sans-serif";
    ctx.fillText(`예상 이수 학점 ${summary.totalCredits}/${summary.expectedCredits}`, 40, 140);
    let y = 182;
    gradeProgress.forEach((progress, index) => {
      const x = 40 + index * 410;
      ctx.fillStyle =
        progress.totalGroups > 0 && progress.completedGroups >= progress.totalGroups
          ? "#ecfdf5"
          : "#ffffff";
      ctx.fillRect(x, y - 26, 370, 72);
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 18px Arial, sans-serif";
      ctx.fillText(`${progress.grade}학년`, x + 16, y);
      ctx.font = "600 14px Arial, sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText(`${progress.completedGroups}/${progress.totalGroups} 묶음`, x + 16, y + 24);
      ctx.fillStyle = "#2563eb";
      ctx.fillText(`${progress.totalCredits}/${progress.expectedCredits}학점`, x + 190, y + 24);
    });

    y = 290;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText("학기별 선택 현황", 40, y);
    y += 34;
    selectableGrades(cohort).forEach((grade) => {
      grade.semesters.forEach((semester) => {
        const progress = calculateSemesterProgress(cohort, grade, semester, selection);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(40, y - 22, 820, 38);
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 14px Arial, sans-serif";
        ctx.fillText(`${grade.grade}학년 ${semester.semester}학기`, 56, y + 2);
        ctx.fillStyle = "#64748b";
        ctx.fillText(`${progress.completedGroups}/${progress.totalGroups} 묶음`, 270, y + 2);
        ctx.fillStyle = "#2563eb";
        ctx.fillText(`${progress.totalCredits}/${progress.expectedCredits}학점`, 420, y + 2);
        y += 48;
      });
    });

    y += 10;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText("선택 과목", 40, y);
    y += 34;
    ctx.font = "500 16px Arial, sans-serif";
    ctx.fillStyle = "#475569";
    const selected = summary.selectedNames.length > 0 ? summary.selectedNames : ["선택한 과목이 없습니다."];
    selected.slice(0, 10).forEach((name, index) => {
      const x = 40 + (index % 2) * 410;
      const subjectY = y + Math.floor(index / 2) * 34;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, subjectY - 21, 360, 26);
      ctx.fillStyle = "#0f172a";
      ctx.fillText(name, x + 12, subjectY - 3);
    });
    const link = document.createElement("a");
    link.download = `${curriculum.schoolName}-선택과목-로드맵.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("로드맵 이미지를 저장했습니다.");
  };

  if (!cohort || grades.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-950">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-blue-600" />
          <h1 className="mt-4 text-xl font-bold">{curriculum.schoolName}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            학생 선택과목 신청 대상인 2·3학년 편제 데이터가 없습니다. 편제표 검토 화면에서 2·3학년
            선택과목 묶음을 확인해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-blue-600">선택과목 도우미</p>
            <h1 className="truncate text-base font-bold">{curriculum.schoolName}</h1>
          </div>
          <select
            value={cohort.entranceYear}
            onChange={(event) => {
              setCohortYear(event.target.value);
              setSelection({});
              setActiveGrade("all");
              setSelectedArea("전체");
              setSelectedCategory("전체");
              setSearch("");
            }}
            className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none"
          >
            {curriculum.cohorts.map((candidate) => (
              <option key={candidate.entranceYear} value={candidate.entranceYear}>
                {cohortDisplayLabel(candidate)}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {mode === "home" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-bold leading-tight">
                나에게 맞는
                <br />
                <span className="text-blue-600">선택과목</span>을 찾아보자
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                이 화면은 업로드된 학교 편제표에서 2·3학년 선택과목만 사용합니다. 관심 영역을 고르면
                추천 과목을 보고, 로드맵에서 실제 선택 조합을 만들 수 있습니다.
              </p>
            </section>

            <section className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-500">선택 학년</p>
                <p className="mt-1 text-lg font-bold">{grades.map((grade) => grade.grade).join(",")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-500">선택 묶음</p>
                <p className="mt-1 text-lg font-bold">{summary?.totalGroups ?? 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-500">과목 후보</p>
                <p className="mt-1 text-lg font-bold">{subjectLocations.length}</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold">진로·학과로 검색하기</h3>
              </div>
              <input
                value={profileQuery}
                onChange={(event) => setProfileQuery(event.target.value)}
                placeholder="예: 공학, 의생명, 사회, 경제, 예술"
                className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-3 space-y-2">
                {filteredProfiles.map((profile) => {
                  const active = selectedProfileIds.includes(profile.id);

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleProfile(profile)}
                      className={cx(
                        "w-full rounded-lg border px-3 py-2 text-left transition",
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-slate-50 hover:border-blue-200",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-950">{profile.title}</span>
                        {active && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{profile.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold">관심 영역을 골라보기</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cx(
                        "rounded-full border px-3 py-2 text-sm font-semibold transition",
                        active
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700",
                      )}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              {selectedTagPanels.length > 0 && (
                <div className="mt-4 space-y-3">
                  {selectedTagPanels.map((panel) => (
                    <div key={panel.tag.id} className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-blue-700">{panel.tag.label} 관련 진로·학과</p>
                          <p className="mt-0.5 text-xs text-slate-500">선택하지 않아도 추천받을 수 있습니다.</p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 text-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {panel.profiles.map((profile) => {
                          const active = selectedProfileIds.includes(profile.id);

                          return (
                            <button
                              key={`${panel.tag.id}:${profile.id}`}
                              type="button"
                              onClick={() => toggleProfile(profile)}
                              className={cx(
                                "min-h-16 rounded-md border p-2.5 text-left transition",
                                active
                                  ? "border-blue-600 bg-white shadow-sm"
                                  : "border-slate-200 bg-white/70 hover:border-blue-200",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold leading-5 text-slate-950">{profile.title}</p>
                                {active && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                              </div>
                              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{profile.subtitle}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={() =>
                setMode(selectedTagIds.length > 0 || selectedProfiles.length > 0 ? "recommend" : "subjects")
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20"
            >
              {selectedTagIds.length > 0 || selectedProfiles.length > 0 ? "맞춤 과목 추천받기" : "전체 과목 탐색하기"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {(mode === "recommend" || mode === "subjects") && (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    {mode === "recommend" ? "맞춤 과목 추천" : "과목 탐색"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    2·3학년 선택과목만 보여줍니다.
                  </p>
                </div>
                {mode === "recommend" && <Sparkles className="h-5 w-5 text-blue-600" />}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                <label className="relative block">
                  <select
                    value={activeGrade}
                    onChange={(event) => {
                      const value = event.target.value;
                      setActiveGrade(value === "all" ? "all" : Number(value));
                    }}
                    className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-semibold outline-none"
                  >
                    <option value="all">전체 학년</option>
                    {grades.map((grade) => (
                      <option key={grade.grade} value={grade.grade}>
                        {grade.grade}학년
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </label>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="과목명, 영역, 구분 검색"
                    className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 pl-9 text-sm outline-none"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {areaOptions.map((area) => (
                  <button
                    key={`area-filter:${area}`}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={cx(
                      "rounded-full px-2.5 py-1.5 text-xs font-bold",
                      selectedArea === area ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <button
                    key={`category-filter:${category}`}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={cx(
                      "rounded-full px-2.5 py-1.5 text-xs font-bold",
                      selectedCategory === category ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cx(
                        "rounded-full px-2.5 py-1.5 text-xs font-bold",
                        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {mode === "recommend" && selectedProfiles.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">선택한 진로·학과</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      여러 목표를 고르면 공통 추천과 전용 추천을 함께 비교합니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                    {selectedProfiles.length}/3
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfileIds((current) => {
                          const next = current.filter((id) => id !== profile.id);
                          setSelectedProfileId(next[0] ?? null);
                          return next;
                        });
                      }}
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {profile.title} ×
                    </button>
                  ))}
                </div>

                {selectedProfiles.length >= 2 && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs font-bold text-emerald-700">공통 추천 과목</p>
                      <p className="mt-1 text-sm font-bold text-slate-950">
                        {profileComparison.common.length}개
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profileComparison.common.slice(0, 8).map((location) => (
                          <span
                            key={`${location.grade}-${location.semester}-${location.subject.name}`}
                            className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {location.subject.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {profileComparison.exclusive.map((item) => (
                        <div key={item.profile.id} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-600">{item.profile.title} 전용</p>
                          <p className="mt-1 text-sm font-bold text-slate-950">{item.subjects.length}개</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="space-y-3">
              {mode === "recommend"
                ? recommendationSections.map((section) => {
                    const id = semesterKey(section.grade, section.semester);
                    const collapsed = collapsedSemesterIds.has(id);
                    const recommendedCount = section.subjects.filter((location) =>
                      recommendedNames.has(location.subject.name),
                    ).length;

                    return (
                      <section key={id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <button
                          type="button"
                          onClick={() => toggleSemesterSection(id)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <h3 className="text-sm font-bold text-slate-950">
                              {gradeLabel(section.grade, section.semester)}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              추천 후보 {section.subjects.length}개
                              {recommendedCount > 0 ? ` · 맞춤 ${recommendedCount}개` : ""}
                            </p>
                          </div>
                          <ChevronDown
                            className={cx(
                              "h-4 w-4 shrink-0 text-slate-500 transition",
                              collapsed && "-rotate-90",
                            )}
                          />
                        </button>

                        {!collapsed && (
                          <div className="mt-3 space-y-2">
                            {section.subjects.map((location) => {
                              const matchingProfileCount = countMatchingProfiles(
                                selectedProfiles,
                                location.subject,
                                tags,
                              );
                              const recommendationBadge =
                                selectedProfiles.length >= 2 && matchingProfileCount === selectedProfiles.length
                                  ? "공통 추천"
                                  : selectedProfiles.length >= 2 && matchingProfileCount > 0
                                    ? `${matchingProfileCount}개 목표 추천`
                                    : recommendedNames.has(location.subject.name)
                                      ? "추천"
                                      : undefined;

                              return (
                                <SubjectCard
                                  key={`${location.grade}-${location.semester}-${location.group.id}-${subjectKey(location.subject)}`}
                                  location={location}
                                  selected={selectedSubjectSet.has(location.subject.name)}
                                  recommendationBadge={recommendationBadge}
                                  recommendationReason={buildRecommendationReason({
                                    location,
                                    selectedProfiles,
                                    selectedTagIds,
                                    tags,
                                  })}
                                  onClick={() => selectRecommendation(location)}
                                  onDetails={() => setActiveSubject(location)}
                                />
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })
                : filteredSubjects.map((location) => {
                    const matchingProfileCount = countMatchingProfiles(selectedProfiles, location.subject, tags);
                    const recommendationBadge =
                      selectedProfiles.length >= 2 && matchingProfileCount === selectedProfiles.length
                        ? "공통 추천"
                        : selectedProfiles.length >= 2 && matchingProfileCount > 0
                          ? `${matchingProfileCount}개 목표 추천`
                          : recommendedNames.has(location.subject.name)
                            ? "추천"
                            : undefined;

                    return (
                      <SubjectCard
                        key={`${location.grade}-${location.semester}-${location.group.id}-${subjectKey(location.subject)}`}
                        location={location}
                        selected={selectedSubjectSet.has(location.subject.name)}
                        recommendationBadge={recommendationBadge}
                        recommendationReason={buildRecommendationReason({
                          location,
                          selectedProfiles,
                          selectedTagIds,
                          tags,
                        })}
                        onClick={() => selectRecommendation(location)}
                        onDetails={() => setActiveSubject(location)}
                      />
                    );
                  })}
              {filteredSubjects.length === 0 && (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  조건에 맞는 2·3학년 선택과목이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {mode === "roadmap" && summary && (
          <div className="space-y-4">
            <section className="sticky top-[65px] z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">나의 선택 로드맵</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary.completedGroups}/{summary.totalGroups}개 선택 조건 완료
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-right">
                  <p className="text-xs font-bold text-blue-600">예상 학점</p>
                  <p className="text-lg font-bold text-blue-700">
                    {summary.totalCredits}/{summary.expectedCredits}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold"
                >
                  <Share2 className="h-4 w-4" />
                  공유
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold"
                >
                  <Download className="h-4 w-4" />
                  이미지 저장
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {gradeProgress.map((progress) => {
                  const complete =
                    progress.totalGroups > 0 && progress.completedGroups >= progress.totalGroups;

                  return (
                    <div
                      key={progress.grade}
                      className={cx(
                        "rounded-lg px-3 py-2",
                        complete ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{progress.grade}학년</span>
                        <span className="text-xs font-semibold">
                          {progress.completedGroups}/{progress.totalGroups} 묶음
                        </span>
                      </div>
                      <p className="mt-1 text-base font-bold">
                        {progress.totalCredits}/{progress.expectedCredits}학점
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-600">선택한 과목</p>
                  {selectedSubjectNames.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelection({})}
                      className="text-xs font-bold text-red-500"
                    >
                      전체 초기화
                    </button>
                  )}
                </div>
                {selectedSubjectNames.length > 0 ? (
                  <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                    {selectedSubjectNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">아직 선택한 과목이 없습니다.</p>
                )}
              </div>
            </section>

            {filteredGrades.map((grade) => (
              <div key={grade.grade} className="space-y-3">
                {grade.semesters.map((semester: CurriculumSemester) => {
                  const semesterProgress = calculateSemesterProgress(cohort, grade, semester, selection);
                  const semesterComplete =
                    semesterProgress.totalGroups > 0 &&
                    semesterProgress.completedGroups >= semesterProgress.totalGroups;

                  return (
                    <section
                      key={`${grade.grade}-${semester.semester}`}
                      className="rounded-xl border border-slate-200 bg-white/70 p-3"
                    >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <h3 className="text-base font-bold">
                          {gradeLabel(grade.grade, semester.semester)}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        선택 묶음 {semester.choiceGroups.length}개
                      </span>
                    </div>

                    {semester.requiredSubjects.length > 0 && (
                      <div className="mb-3">
                        <h4 className="mb-2 text-xs font-bold text-slate-500">필수 이수</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {semester.requiredSubjects.map((subject) => (
                            <span
                              key={subjectKey(subject)}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                            >
                              {subject.name} · {subject.credits}학점
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {semester.choiceGroups.map((group) => {
                        const id = groupKey(cohort, grade.grade, semester.semester, group);
                        return (
                          <ChoiceGroupRoadmap
                            key={id}
                            cohort={cohort}
                            grade={grade.grade}
                            semester={semester.semester}
                            group={group}
                            selection={selection[id] ?? []}
                            selectedSubjectSet={selectedSubjectSet}
                            selectedSubjectOrigins={selectedSubjectOrigins}
                            recommendedNames={recommendedNames}
                            onToggle={handleToggleSubject}
                          />
                        );
                      })}
                    </div>
                    <div
                      className={cx(
                        "mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold",
                        semesterComplete
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-50 text-slate-600",
                      )}
                    >
                      <span>
                        {semesterProgress.completedGroups}/{semesterProgress.totalGroups} 묶음 완료
                      </span>
                      <span>
                        {semesterProgress.totalCredits}/{semesterProgress.expectedCredits}학점
                      </span>
                    </div>
                  </section>
                );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
      <SubjectDetailPanel
        location={activeSubject}
        selected={activeSubject ? selectedSubjectSet.has(activeSubject.subject.name) : false}
        profiles={profiles}
        tags={tags}
        onClose={() => setActiveSubject(null)}
        onSelect={selectRecommendation}
      />
      <BottomNav mode={mode} setMode={setMode} />
    </main>
  );
}
