import {
  getSubjectById as getStaticSubjectById,
  getSubjectByName as getStaticSubjectByName,
  subjectAreaMatches as staticSubjectAreaMatches,
  subjectAreas as staticSubjectAreas,
  subjects as staticSubjects,
  type Subject,
} from "@/data/subjects";
import { expandSubjectNames, type StudentSchoolData } from "@/lib/hyoja/school-adapter";

export interface SubjectCatalog {
  subjects: Subject[];
  subjectAreas: string[];
  getSubjectByName(name: string): Subject | undefined;
  getSubjectById(id: string): Subject | undefined;
  subjectAreaMatches(subjectArea: string, selectedArea: string): boolean;
}

type FallbackCategory = Subject["category"];

interface UploadedSubjectSeed {
  name: string;
  area: string;
  category: string;
  credits: number;
}

const fallbackCategoryByUploadedCategory = new Map<string, FallbackCategory>([
  ["공통", "공통"],
  ["일반선택", "일반선택"],
  ["진로선택", "진로선택"],
  ["융합선택", "융합선택"],
]);

function normalizeSubjectName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "subject";
}

function shortHash(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function fallbackCategory(category: string): FallbackCategory {
  return fallbackCategoryByUploadedCategory.get(category) ?? "일반선택";
}

function createFallbackSubject(
  seed: UploadedSubjectSeed,
  schoolName: string,
): Subject {
  const normalized = normalizeSubjectName(seed.name);

  return {
    id: `uploaded-${slugify(seed.name)}-${shortHash(normalized)}`,
    name: seed.name,
    category: fallbackCategory(seed.category),
    area: seed.area || "기타",
    credits: String(seed.credits || ""),
    description: `${schoolName} 편제표에 포함된 ${seed.area || "기타"} 영역의 선택 과목입니다.`,
    keywords: [seed.name, seed.area].filter(Boolean),
    relatedCareers: [],
    relatedDepartments: [],
    recommendedFor: [],
  };
}

function collectUploadedSubjectSeeds(data: StudentSchoolData) {
  const seeds = new Map<string, UploadedSubjectSeed>();

  Object.values(data.cohorts).forEach((cohort) => {
    cohort.designated.forEach((subject) => {
      // 묶음 과목명("A↔B")은 개별 과목으로 분해해 각각 카탈로그에 등록
      expandSubjectNames(subject.subject).forEach((name) => {
        const key = normalizeSubjectName(name);
        if (seeds.has(key)) return;
        seeds.set(key, {
          name,
          area: subject.area,
          category: subject.category,
          credits: subject.credits,
        });
      });
    });

    cohort.selections.forEach((group) => {
      group.options.forEach((option) => {
        expandSubjectNames(option).forEach((name) => {
          const key = normalizeSubjectName(name);
          if (seeds.has(key)) return;
          seeds.set(key, {
            name,
            area: "",
            category: "",
            credits: group.creditsEach,
          });
        });
      });
    });
  });

  return seeds;
}

export function createSubjectCatalog(
  studentSchoolData: StudentSchoolData,
): SubjectCatalog {
  const subjectsByName = new Map<string, Subject>();
  const subjectsById = new Map<string, Subject>();

  staticSubjects.forEach((subject) => {
    subjectsByName.set(normalizeSubjectName(subject.name), subject);
    subjectsById.set(subject.id, subject);
  });

  collectUploadedSubjectSeeds(studentSchoolData).forEach((seed, key) => {
    if (subjectsByName.has(key)) return;

    const subject = createFallbackSubject(seed, studentSchoolData.schoolName);
    subjectsByName.set(key, subject);
    subjectsById.set(subject.id, subject);
  });

  const mergedSubjects = Array.from(subjectsByName.values());
  const subjectAreas = Array.from(
    new Set([
      ...staticSubjectAreas,
      ...mergedSubjects.map((subject) => subject.area).filter(Boolean),
    ]),
  );

  return {
    subjects: mergedSubjects,
    subjectAreas,
    getSubjectByName(name) {
      return (
        subjectsByName.get(normalizeSubjectName(name)) ??
        getStaticSubjectByName(name)
      );
    },
    getSubjectById(id) {
      return subjectsById.get(id) ?? getStaticSubjectById(id);
    },
    subjectAreaMatches(subjectArea, selectedArea) {
      return (
        staticSubjectAreaMatches(subjectArea, selectedArea) ||
        subjectArea === selectedArea
      );
    },
  };
}
