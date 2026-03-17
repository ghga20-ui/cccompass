import careerData from "./json/career-mapping.json";
import { getSubjectByName } from "./subjects";
import { getSubjectPriorityScores } from "./university-requirements";

// ========== Types ==========
export interface SearchResult {
  type: "department";
  label: string;           // display name
  departmentName: string;  // the department this maps to
  fieldName: string;       // e.g., "보건·의약학 분야"
  trackName: string;       // e.g., "의약학 계열"
}

interface IndexEntry extends SearchResult {
  /** lowercase label for fast matching */
  lowerLabel: string;
}

// ========== Build index at module load ==========
const searchIndex: IndexEntry[] = [];

interface JsonDepartment {
  name: string;
  description: string;
  recommendedStudents: string[];
  recommendedSubjects: {
    "일반선택": string[];
    "진로선택": string[];
    "융합선택": string[];
  };
}

interface JsonTrack {
  id: string;
  name: string;
  departments: JsonDepartment[];
}

interface JsonField {
  id: string;
  name: string;
  tracks: JsonTrack[];
}

const fields = careerData.fields as JsonField[];

// Track department names we've already added (for dedup)
const addedDepartments = new Set<string>();

fields.forEach((field) => {
  field.tracks.forEach((track) => {
    track.departments.forEach((dept) => {
      if (!addedDepartments.has(dept.name)) {
        addedDepartments.add(dept.name);
        searchIndex.push({
          type: "department",
          label: dept.name,
          departmentName: dept.name,
          fieldName: field.name,
          trackName: track.name,
          lowerLabel: dept.name.toLowerCase(),
        });
      }
    });
  });
});

// ========== Search function ==========
export function searchDeptAndCareers(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const matches: SearchResult[] = [];

  for (const entry of searchIndex) {
    if (!entry.lowerLabel.includes(q)) continue;

    matches.push({
      type: "department",
      label: entry.label,
      departmentName: entry.departmentName,
      fieldName: entry.fieldName,
      trackName: entry.trackName,
    });

    if (matches.length >= 10) break;
  }

  return matches;
}

// ========== Department recommendation ==========
export function getDepartmentRecommendation(deptName: string): {
  department: {
    name: string;
    description: string;
    recommendedStudents: string[];
    fieldName: string;
    trackName: string;
  };
  subjects: {
    일반선택: string[];
    진로선택: string[];
    융합선택: string[];
  };
} | null {
  for (const field of fields) {
    for (const track of field.tracks) {
      for (const dept of track.departments) {
        if (dept.name === deptName) {
          // career-mapping 기반 과목
          const cmSubjects = {
            일반선택: [...dept.recommendedSubjects["일반선택"]],
            진로선택: [...dept.recommendedSubjects["진로선택"]],
            융합선택: [...dept.recommendedSubjects["융합선택"]],
          };

          // university-requirements 기반 과목 보강
          // 대입에서 요구하지만 career-mapping에 없는 과목을 추가
          const uniScores = getSubjectPriorityScores(deptName);
          const allCmNames = new Set([
            ...cmSubjects["일반선택"],
            ...cmSubjects["진로선택"],
            ...cmSubjects["융합선택"],
          ]);

          uniScores.forEach((score, subjectName) => {
            if (score >= 3 && !allCmNames.has(subjectName)) {
              const subject = getSubjectByName(subjectName);
              if (subject && subject.category !== "공통") {
                const cat = subject.category as "일반선택" | "진로선택" | "융합선택";
                if (cat in cmSubjects) {
                  cmSubjects[cat].push(subjectName);
                }
              }
            }
          });

          return {
            department: {
              name: dept.name,
              description: dept.description,
              recommendedStudents: dept.recommendedStudents,
              fieldName: field.name,
              trackName: track.name,
            },
            subjects: cmSubjects,
          };
        }
      }
    }
  }
  return null;
}
