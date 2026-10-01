import { subjects } from "@/data/subjects";
import {
  hasConcentratedMarker,
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

// 원본 편제표와 대조해 확인한 인식 오류만 교정한다. 유사도/부분 일치는 사용하지 않는다.
const verifiedRecognitionAliases = new Map<string, string>([
  ["세포의 물질대사", "세포와 물질대사"],
  ["행성과 우주과학", "행성우주과학"],
]);

function normalizeRecognizedSubject(subject: CurriculumSubject): CurriculumSubject {
  const canonical = canonicalByCompact.get(subject.name.replace(/\s+/g, ""));
  // 실제 카탈로그에 있는 이름은 별칭 규칙보다 우선한다.
  if (canonical) return { ...subject, name: canonical };

  const aliasTarget = verifiedRecognitionAliases.get(subject.name);
  const corrected = aliasTarget && canonicalByCompact.get(aliasTarget.replace(/\s+/g, ""));
  if (!corrected) return { ...subject };

  return {
    ...subject,
    name: corrected,
    rawText: subject.rawText ?? subject.name,
    confidence: Math.min(subject.confidence ?? 0.49, 0.49),
  };
}

function expandSubjectList(list: CurriculumSubject[]): CurriculumSubject[] {
  const out: CurriculumSubject[] = [];
  for (const subject of list) {
    const parts = splitByMasterList(subject.name);
    if (parts) {
      // 학점 배분은 추측하지 않는다. 복제한 학점은 원문과 함께 검수하도록
      // review-flags의 경고 기준(< 0.5) 아래로 confidence를 낮춘다.
      parts.forEach((name) =>
        out.push({
          ...subject,
          name,
          rawText: subject.rawText ?? subject.name,
          confidence: Math.min(subject.confidence ?? 0.49, 0.49),
        }),
      );
    } else {
      out.push(normalizeRecognizedSubject(subject));
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
  // 과목명만 같아도 선택 수·학점·이수 조건이 다르면 별도 선택군이다.
  // 생성 ID와 옵션 순서만 무시하고, 의미가 같은 그룹만 중복 제거한다.
  return JSON.stringify({
    label: group.label,
    choose: group.choose,
    minChoose: group.minChoose,
    maxChoose: group.maxChoose,
    creditsEach: group.creditsEach,
    notes: group.notes ?? [],
    subjects: group.subjects
      .map((subject) => JSON.stringify([
        subject.name,
        subject.credits,
        subject.area,
        subject.category,
      ]))
      .sort(),
  });
}

function concentratedPair(name: string): [string, string] | null {
  if (!hasConcentratedMarker(name) || name.split("↔").length !== 2) return null;
  const parts = splitConcentratedNames(name).map(normalizeName);
  return parts.length === 2 && parts[0] !== parts[1] ? [parts[0], parts[1]] : null;
}

function resolveConcentratedSubject(subject: CurriculumSubject, semester: number): CurriculumSubject {
  const pair = concentratedPair(subject.name);
  return pair ? {
    ...subject,
    name: pair[semester === 2 ? 1 : 0],
    rawText: subject.rawText ?? subject.name,
  } : subject;
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
      subjects: group.subjects.map((subject) => resolveConcentratedSubject(subject, semester.semester)),
    })),
  }));

  // 2) 학기별 원본을 함께 비교한다. 단일 과목 명시 > 해당 학기의 쌍 > 반대 학기 추론.
  type PairEntry = {
    subject: CurriculumSubject;
    semester: number;
    names: [string, string];
    key: string;
  };
  const pairs = new Map<CurriculumSubject, PairEntry>();
  semesters.forEach((semester) => {
    semester.requiredSubjects.forEach((subject) => {
      const names = concentratedPair(subject.name);
      if (names) pairs.set(subject, { subject, semester: semester.semester, names, key: JSON.stringify(names) });
    });
  });
  const entries = [...pairs.values()];
  const ambiguousPairs = new Set<string>();
  for (const target of new Set(semesters.map((semester) => semester.semester))) {
    const explicitNames = new Set(semesters
      .filter((semester) => semester.semester === target)
      .flatMap((semester) => semester.requiredSubjects.filter((subject) => !pairs.has(subject)))
      .map((subject) => subject.name));
    const candidates = new Map<string, PairEntry[]>();
    entries.forEach((entry) => {
      const name = entry.names[target - 1];
      candidates.set(name, [...(candidates.get(name) ?? []), entry]);
    });
    candidates.forEach((options, name) => {
      if (explicitNames.has(name)) return;
      const local = options.filter((entry) => entry.semester === target);
      const preferred = local.length > 0 ? local : options;
      if (new Set(preferred.map((entry) => entry.subject.credits)).size > 1) {
        // 동등한 원본끼리 충돌하면 쌍 전체를 그대로 남겨 집중이수 검수를 요청한다.
        options.forEach((entry) => ambiguousPairs.add(entry.key));
      }
    });
  }

  return {
    ...grade,
    semesters: semesters.map((semester) => {
      const requiredSubjects = semester.requiredSubjects.filter((subject) => {
        const pair = pairs.get(subject);
        return !pair || ambiguousPairs.has(pair.key);
      });
      const have = new Set(requiredSubjects.map((subject) => subject.name));
      entries
        .filter((entry) => !ambiguousPairs.has(entry.key))
        .sort((a, b) => Number(b.semester === semester.semester) - Number(a.semester === semester.semester))
        .forEach((entry) => {
          const resolved = resolveConcentratedSubject(entry.subject, semester.semester);
          if (have.has(resolved.name)) return;
          requiredSubjects.push(resolved);
          have.add(resolved.name);
        });
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
