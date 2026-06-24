import { subjects } from "@/data/subjects";
import {
  hasConcentratedMarker,
  resolveConcentratedName,
  splitConcentratedNames,
} from "@/lib/curriculum/split-subjects";
import type {
  ChoiceGroup,
  CurriculumGrade,
  CurriculumSubject,
  SchoolCurriculum,
} from "@/lib/curriculum/schema";

// 과목명 마스터리스트 (공백 제거 키 → 표준 과목명). 가장 긴 이름부터 매칭하기 위해 정렬.
const canonicalByCompact = new Map<string, string>();
for (const subject of subjects) {
  const compact = subject.name.replace(/\s+/g, "");
  if (compact.length > 0 && !canonicalByCompact.has(compact)) {
    canonicalByCompact.set(compact, subject.name);
  }
}
const compactKeysByLength = Array.from(canonicalByCompact.keys()).sort(
  (a, b) => b.length - a.length,
);
const maxKeyLength = compactKeysByLength[0]?.length ?? 0;

/**
 * 공백 없이 붙은 과목명을 마스터리스트 기준 greedy longest-match로 분해한다.
 * 전체가 알려진 과목명으로 완전히 소비될 때만 분리하고(안전), 잔재가 남으면 분리하지 않는다.
 * 단일 과목으로 끝나면(분리 불가) null 반환.
 */
export function splitByMasterList(name: string): string[] | null {
  const compact = name.replace(/\s+/g, "");
  if (compact.length === 0) return null;

  const result: string[] = [];
  let i = 0;
  while (i < compact.length) {
    let matched: string | null = null;
    const upper = Math.min(compact.length, i + maxKeyLength);
    for (let j = upper; j > i; j -= 1) {
      const slice = compact.slice(i, j);
      const canonical = canonicalByCompact.get(slice);
      if (canonical) {
        matched = canonical;
        i = j;
        break;
      }
    }
    if (!matched) return null; // 잔재 → 안전하게 분리 포기
    result.push(matched);
  }

  return result.length > 1 ? result : null;
}

/** 공백만 사라진 과목명을 표준 표기로 정규화 (예: '생활과과학' → '생활과 과학') */
function normalizeName(name: string): string {
  const canonical = canonicalByCompact.get(name.replace(/\s+/g, ""));
  return canonical ?? name;
}

function expandSubjectList(list: CurriculumSubject[]): CurriculumSubject[] {
  const out: CurriculumSubject[] = [];
  for (const subject of list) {
    const parts = splitByMasterList(subject.name);
    if (parts) {
      // 뭉친 과목 분해: credits는 분해된 각 과목에 그대로 복제(검수에서 조정), confidence 하향
      parts.forEach((name) =>
        out.push({ ...subject, name, confidence: Math.min(subject.confidence ?? 0.5, 0.5) }),
      );
    } else {
      out.push({ ...subject, name: normalizeName(subject.name) });
    }
  }
  return out;
}

function expandGroup(group: ChoiceGroup): ChoiceGroup {
  const subjectsExpanded = expandSubjectList(group.subjects);
  // 분해로 옵션 수가 늘면 choose 상한은 유지(불변식: choose <= subjects.length는 자동 충족)
  return { ...group, subjects: subjectsExpanded };
}

function groupSignature(group: ChoiceGroup): string {
  return group.subjects
    .map((s) => s.name)
    .sort()
    .join("|");
}

/**
 * 집중이수(↔) 학기 교차 분리: 앞→1학기, 뒤→2학기. (손실 없이 양쪽 학기에 배치)
 * 1·2학기가 모두 있으면 지정과목 ↔를 쪼개 각 학기로 이동, 한 학기뿐이면 그 학기 기준 제자리 해석.
 * 선택군 옵션의 ↔는 선택군이 단일 학기 구성이므로 그 학기 기준 제자리 해석.
 */
function splitConcentratedAcrossSemesters(grade: CurriculumGrade): CurriculumGrade {
  // 1) 선택군 옵션의 ↔는 각 학기 기준 제자리 해석
  const semesters = grade.semesters.map((semester) => ({
    ...semester,
    choiceGroups: semester.choiceGroups.map((group) => ({
      ...group,
      subjects: group.subjects.map((s) =>
        hasConcentratedMarker(s.name)
          ? { ...s, name: resolveConcentratedName(s.name, semester.semester) }
          : s,
      ),
    })),
  }));

  const sem1 = semesters.find((s) => s.semester === 1);
  const sem2 = semesters.find((s) => s.semester === 2);

  // 2) 1·2학기 둘 다 없으면 지정과목 ↔를 그 학기 기준 제자리 해석
  if (!sem1 || !sem2) {
    return {
      ...grade,
      semesters: semesters.map((semester) => ({
        ...semester,
        requiredSubjects: semester.requiredSubjects.map((s) =>
          hasConcentratedMarker(s.name)
            ? { ...s, name: resolveConcentratedName(s.name, semester.semester) }
            : s,
        ),
      })),
    };
  }

  // 3) 지정과목 ↔를 앞→1학기 / 뒤→2학기로 분리(원본 제거 후 양쪽에 추가, 이름 중복 방지)
  const toSem1: CurriculumSubject[] = [];
  const toSem2: CurriculumSubject[] = [];
  const stripped = semesters.map((semester) => {
    const requiredSubjects: CurriculumSubject[] = [];
    for (const subject of semester.requiredSubjects) {
      if (hasConcentratedMarker(subject.name)) {
        const parts = splitConcentratedNames(subject.name);
        if (parts.length >= 2) {
          toSem1.push({ ...subject, name: parts[0] });
          toSem2.push({ ...subject, name: parts[parts.length - 1] });
          continue;
        }
      }
      requiredSubjects.push(subject);
    }
    return { ...semester, requiredSubjects };
  });

  const addUnique = (list: CurriculumSubject[], additions: CurriculumSubject[]) => {
    const have = new Set(list.map((s) => s.name));
    for (const addition of additions) {
      if (!have.has(addition.name)) {
        list.push(addition);
        have.add(addition.name);
      }
    }
  };

  return {
    ...grade,
    semesters: stripped.map((semester) => {
      const requiredSubjects = [...semester.requiredSubjects];
      if (semester.semester === 1) addUnique(requiredSubjects, toSem1);
      if (semester.semester === 2) addUnique(requiredSubjects, toSem2);
      return { ...semester, requiredSubjects };
    }),
  };
}

/**
 * 구조화 결과 후처리:
 *  1) 뭉친 과목명 분해(required/choice 옵션 모두) + 공백 정규화
 *  2) 같은 학기 내 동일 구성 선택군 중복 제거
 *  3) 집중이수(↔) 학기 교차 분리(앞→1학기, 뒤→2학기)
 */
export function postProcessCurriculum(curriculum: SchoolCurriculum): SchoolCurriculum {
  return {
    ...curriculum,
    cohorts: curriculum.cohorts.map((cohort) => ({
      ...cohort,
      grades: cohort.grades.map((grade) => {
        const expandedGrade: CurriculumGrade = {
          ...grade,
          semesters: grade.semesters.map((semester) => {
            const requiredSubjects = expandSubjectList(semester.requiredSubjects);
            const seenGroup = new Set<string>();
            const choiceGroups: ChoiceGroup[] = [];
            for (const group of semester.choiceGroups) {
              const expanded = expandGroup(group);
              const sig = groupSignature(expanded);
              if (seenGroup.has(sig)) continue; // 동일 구성 중복 선택군 제거
              seenGroup.add(sig);
              choiceGroups.push(expanded);
            }
            return { ...semester, requiredSubjects, choiceGroups };
          }),
        };
        return splitConcentratedAcrossSemesters(expandedGrade);
      }),
    })),
  };
}
