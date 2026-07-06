import careerData from "./json/career-mapping.json";
import { getSubjectByName, type Subject } from "./subjects";
import { getSubjectConsensusByInterests } from "./university-recommendations";

// ========== 기존 CareerGroup 인터페이스 (하위 호환) ==========
export interface CareerGroup {
  id: string;
  name: string;
  icon: string;
  careers: string[];
  recommendations: {
    subjectId: string;
    priority: "필수" | "권장" | "추천";
    reason: string;
  }[];
}

// ========== JSON 기반 새 타입 ==========
interface TrackRecommendedSubjects {
  "일반선택": string[];
  "진로선택": string[];
  "융합선택": string[];
}

interface Department {
  name: string;
  description: string;
  recommendedStudents: string[];
  recommendedSubjects: TrackRecommendedSubjects;
}

interface Track {
  id: string;
  name: string;
  recommendedSubjects: TrackRecommendedSubjects;
  tip: string;
  departments: Department[];
}

interface CareerField {
  id: string;
  name: string;
  tracks: Track[];
}

// JSON 데이터를 typed로 사용
export const careerFields: CareerField[] = careerData.fields as CareerField[];

// ========== interestTags (홈 화면 UI) ==========
export const interestTags = [
  // 의약·보건
  { id: "medical", label: "의대/약대/치대" },
  { id: "nursing-health", label: "간호/보건" },
  // 공학
  { id: "cs-ai", label: "컴퓨터/AI" },
  { id: "mechanical-elec", label: "기계/전자/전기" },
  { id: "architecture", label: "건축/토목/환경" },
  { id: "biotech", label: "생명공학/화학공학" },
  // 자연과학
  { id: "natural-science", label: "자연과학(수학/물리/화학)" },
  { id: "bio-earth", label: "생명과학/지구과학" },
  // 사회
  { id: "business", label: "경영/경제/금융" },
  { id: "law-politics", label: "법학/정치/행정" },
  { id: "media-comm", label: "미디어/광고/언론" },
  { id: "psychology-social", label: "심리/사회/복지" },
  // 인문
  { id: "literature", label: "어문학/문학" },
  { id: "humanities", label: "철학/사학/문화" },
  { id: "global", label: "국제/외교/통상" },
  // 교육
  { id: "education", label: "교육/교직" },
  // 예체능
  { id: "art-design", label: "미술/디자인" },
  { id: "music-perform", label: "음악/공연" },
  { id: "sports", label: "체육/스포츠" },
  // 기타
  { id: "environment", label: "환경/에너지" },
  { id: "food-nutrition", label: "식품/영양/농학" },
] as const;

export type InterestTag = (typeof interestTags)[number];

// ========== interestTag -> 세부 track 매핑 (2-level 선택용) ==========
const trackMapping: Record<string, string[]> = {
  "medical": ["medicine_pharmacy"],
  "nursing-health": ["health"],
  "cs-ai": ["it_software"],
  "mechanical-elec": ["mechanical_electrical"],
  "architecture": ["architecture_environment"],
  "biotech": ["chemical_bio"],
  "natural-science": ["natural_science"],
  "bio-earth": ["natural_science"],
  "business": ["business_economics"],
  "law-politics": ["law_administration"],
  "media-comm": ["media_communication"],
  "psychology-social": ["social_science"],
  "literature": ["language_literature"],
  "humanities": ["humanities_science"],
  "global": ["social_science", "language_literature"],
  "education": ["education"],
  "art-design": ["arts"],
  "music-perform": ["arts"],
  "sports": ["physical_education"],
  "environment": ["architecture_environment", "natural_science"],
  "food-nutrition": ["life_science_track", "agriculture"],
};

// ========== interestTag -> career-mapping.json field 매핑 ==========
// 각 태그가 어떤 JSON field(분야)의 어떤 track(계열)에 매핑되는지
const fieldMapping: Record<string, string[]> = {
  "medical": ["health_medicine"],
  "nursing-health": ["health_medicine"],
  "cs-ai": ["engineering"],
  "mechanical-elec": ["engineering"],
  "architecture": ["engineering"],
  "biotech": ["engineering", "natural_sciences"],
  "natural-science": ["natural_sciences"],
  "bio-earth": ["natural_sciences"],
  "business": ["social_sciences"],
  "law-politics": ["social_sciences"],
  "media-comm": ["social_sciences"],
  "psychology-social": ["social_sciences"],
  "literature": ["humanities"],
  "humanities": ["humanities"],
  "global": ["humanities", "social_sciences"],
  "education": ["education"],
  "art-design": ["arts_sports"],
  "music-perform": ["arts_sports"],
  "sports": ["arts_sports"],
  "environment": ["natural_sciences"],
  "food-nutrition": ["natural_sciences"],
};

// ========== 기존 careerGroups (하위 호환 - JSON 기반으로 동적 생성) ==========
// JSON의 field/track 구조에서 CareerGroup 형태로 변환
function buildCareerGroupsFromJson(): CareerGroup[] {
  const groupIconMap: Record<string, string> = {
    health_medicine: "Stethoscope",
    engineering: "Wrench",
    natural_sciences: "FlaskConical",
    social_sciences: "TrendingUp",
    humanities: "BookOpen",
    education: "GraduationCap",
    arts_sports: "Palette",
    interdisciplinary: "BookOpen",
  };

  const groupNameMap: Record<string, string> = {
    health_medicine: "의학/보건",
    engineering: "공학/기술",
    natural_sciences: "자연과학/연구",
    social_sciences: "사회/경제/법",
    humanities: "인문/글로벌",
    education: "교육/학술",
    arts_sports: "예술/체육",
    interdisciplinary: "자율전공",
  };

  return careerFields.map((field) => {
    // 모든 트랙에서 추천 과목을 수집
    const subjectNames = new Set<string>();
    field.tracks.forEach((track) => {
      const rs = track.recommendedSubjects;
      rs["일반선택"].forEach((n) => subjectNames.add(n));
      rs["진로선택"].forEach((n) => subjectNames.add(n));
      rs["융합선택"].forEach((n) => subjectNames.add(n));
    });

    // 과목명 -> subject ID를 찾아서 recommendation으로 변환
    const recommendations: CareerGroup["recommendations"] = [];
    subjectNames.forEach((name) => {
      const subject = getSubjectByName(name);
      if (subject) {
        const category = subject.category;
        const priority: "필수" | "권장" | "추천" =
          category === "일반선택" ? "필수" : category === "진로선택" ? "권장" : "추천";
        recommendations.push({
          subjectId: subject.id,
          priority,
          reason: `${field.name} 관련 추천 과목`,
        });
      }
    });

    return {
      id: field.id,
      name: groupNameMap[field.id] || field.name,
      icon: groupIconMap[field.id] || "BookOpen",
      careers: field.tracks.flatMap((t) =>
        t.departments.slice(0, 3).map((d) => d.name)
      ),
      recommendations,
    };
  });
}

export const careerGroups: CareerGroup[] = buildCareerGroupsFromJson();

// ========== 기존 호환 함수들 ==========
export function getCareerGroupById(id: string): CareerGroup | undefined {
  return careerGroups.find((g) => g.id === id);
}

export function getCareerGroupsByInterest(interestId: string): CareerGroup[] {
  const tag = interestTags.find((t) => t.id === interestId);
  if (!tag) return [];

  const fieldIds = fieldMapping[interestId] || [];
  return fieldIds
    .map((fid) => careerGroups.find((g) => g.id === fid))
    .filter((g): g is CareerGroup => g !== undefined);
}

// ========== 새 함수: JSON 기반 트랙/학과 탐색 ==========
export function getTracksByField(fieldId: string): Track[] {
  const field = careerFields.find((f) => f.id === fieldId);
  return field?.tracks ?? [];
}

// ========== 2-level 태그 선택: 태그 → 학과 목록 ==========
export function getDepartmentsByTagId(tagId: string): { name: string; description: string; trackName: string }[] {
  const trackIds = trackMapping[tagId] || [];
  const depts: { name: string; description: string; trackName: string }[] = [];

  careerFields.forEach(field => {
    field.tracks.forEach(track => {
      if (trackIds.includes(track.id)) {
        track.departments.forEach(dept => {
          depts.push({
            name: dept.name,
            description: dept.description.slice(0, 60) + "...",
            trackName: track.name,
          });
        });
      }
    });
  });

  return depts;
}

export function getRecommendedSubjectsByInterest(
  interestId: string,
  // 업로드 편제 과목까지 매칭하려면 subjectCatalog.getSubjectByName 주입.
  // 미전달 시 전국공통 정적 카탈로그로 폴백.
  resolveSubject: (name: string) => Subject | undefined = getSubjectByName,
): {
  일반선택: Subject[];
  진로선택: Subject[];
  융합선택: Subject[];
} {
  // trackMapping 기반으로 더 정밀한 추천
  const trackIds = trackMapping[interestId] || [];
  const result: { 일반선택: Subject[]; 진로선택: Subject[]; 융합선택: Subject[] } = {
    일반선택: [],
    진로선택: [],
    융합선택: [],
  };

  const seen = new Set<string>();

  careerFields.forEach((field) => {
    field.tracks.forEach((track) => {
      if (!trackIds.includes(track.id)) return;

      (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
        track.recommendedSubjects[cat].forEach((name) => {
          const key = `${cat}-${name}`;
          if (seen.has(key)) return;
          seen.add(key);

          const subject = resolveSubject(name);
          if (subject) {
            result[cat].push(subject);
          }
        });
      });
    });
  });

  // 대교협 「2028학년도 권역별 대학별 권장과목」 기반 보강:
  // 대입에서 요구하지만 career-mapping에 없는 과목 추가.
  // 핵심과목 명시 지정만 집계해 보수적으로 판단한다.
  const uniScores = getSubjectConsensusByInterests([interestId], {
    coreOnly: true,
    expandAreas: false,
  });
  const allSeen = new Set(seen);

  uniScores.forEach((score, subjectName) => {
    if (score < 3) return; // 3개교 미만 요구는 무시
    const subject = resolveSubject(subjectName);
    if (!subject || subject.category === "공통") return;
    const cat = subject.category as "일반선택" | "진로선택" | "융합선택";
    if (!(cat in result)) return;
    const key = `${cat}-${subjectName}`;
    if (allSeen.has(key)) return;
    allSeen.add(key);
    result[cat].push(subject);
  });

  return result;
}
