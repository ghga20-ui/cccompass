"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, ChevronDown, GraduationCap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubjectCard from "@/components/SubjectCard";
import {
  interestTags,
  getRecommendedSubjectsByInterest,
  getInterestTagsByDept,
} from "@/data/career-mapping";
import {
  getProfessionalSubjectsForTags,
  isProfessionalSubject,
} from "@/data/professional-subjects";
import { getSubjectByName, type Subject } from "@/data/subjects";
import { getCohortData, getExpandedSubjectNames } from "@/data/school";
import { useCohort } from "@/contexts/CohortContext";
import { getDepartmentRecommendation } from "@/data/search-index";
import { getConsensusBadges, type ConsensusBadge } from "@/data/university-recommendations";
import { normalizeSubjectName } from "@/lib/consensus";

// ========== 권장 역량 접이식 컴포넌트 ==========
function CompetencyAccordion({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-3 text-left"
      >
        <p className="text-xs font-semibold text-[var(--primary)]">권장 역량</p>
        <span className="text-xs text-muted-foreground ml-auto mr-1">{items.length}개</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5">
          <ul className="space-y-1.5">
            {items.map((text, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-[var(--cta)] shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ========== 추천 근거 설명 접이식 ==========
function RecommendBasisNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-3 text-left"
      >
        <p className="text-xs font-semibold text-[var(--primary)]">
          이 추천은 어떤 근거로 만들어졌나요?
        </p>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2 text-sm text-foreground leading-relaxed">
          <p>
            계열별 추천 과목은 <b>2022 개정 교육과정 선택 과목 안내서</b>를 바탕으로,
            대학이 실제 요구하는 과목과 대조해 구성했습니다.
          </p>
          <p>
            과목에 붙은 <b>「핵심 N개교」</b> 뱃지는 한국대학교육협의회(대교협)
            「2028학년도 권역별 대학별 권장과목」(전국 47개 대학)에서 그 과목을 지정한
            대학 수입니다.
          </p>
          <p>
            뱃지가 없는 과목은 대입 반영과목은 아니지만, 탐구활동·세부능력특기사항 등
            역량을 보여주기에 좋은 과목입니다.
          </p>
          <p>
            「전문교과」 라벨이 붙은 과목은 우리 학교가 개설한 전문교과입니다. 대교협 자료는 보통교과
            위주라 전문교과를 다루지 않으므로, 대학별 반영과목 배지가 붙지 않습니다.
          </p>
          <Link
            href="/faq"
            className="inline-block text-[var(--primary)] font-medium underline underline-offset-2"
          >
            자료 출처와 자주 묻는 질문 →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * 앞으로 선택해야 할 과목 → 개설 학기 매핑
 * 2025(현 고2): 고3 선택과목만 / 2026(현 고1): 고2+고3 선택과목
 */
function buildSelectableSubjectMap(cohortYear: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const cohort = getCohortData(cohortYear);
  if (!cohort) return map;

  const minGrade = cohortYear === "2025" ? 3 : 2;

  const addName = (name: string, label: string) => {
    const existing = map.get(name) || [];
    if (!existing.includes(label)) existing.push(label);
    map.set(name, existing);
  };

  cohort.selections.forEach((g) => {
    if (g.grade < minGrade) return;
    const label = `${g.grade}-${g.semester}`;
    g.options.forEach((o) => {
      getExpandedSubjectNames(o).forEach((name) => addName(name, label));
    });
  });

  return map;
}

/** 우리 학교에 개설되는 전체 과목 (지정+선택, 전 학년) */
function buildAllSchoolSubjectNames(cohortYear: string): Set<string> {
  const names = new Set<string>();
  const cohort = getCohortData(cohortYear);
  if (!cohort) return names;

  cohort.designated.forEach((d) =>
    getExpandedSubjectNames(d.subject).forEach((name) => names.add(name))
  );
  cohort.selections.forEach((g) =>
    g.options.forEach((o) => {
      getExpandedSubjectNames(o).forEach((name) => names.add(name));
    })
  );

  return names;
}

/** 추천에서 제외할 과목: 지정과목 + 이미 지난 학년 과목 */
function buildExcludedNames(cohortYear: string): Set<string> {
  const names = new Set<string>();
  const cohort = getCohortData(cohortYear);
  if (!cohort) return names;

  const minGrade = cohortYear === "2025" ? 3 : 2;

  // 학교지정 과목 전체 (필수라 추천 불필요)
  cohort.designated.forEach((d) =>
    getExpandedSubjectNames(d.subject).forEach((name) => names.add(name))
  );

  // 이미 지난 학년의 선택과목 (고2가 이미 고2에서 선택한 과목)
  cohort.selections.forEach((g) => {
    if (g.grade < minGrade) {
      g.options.forEach((o) =>
        getExpandedSubjectNames(o).forEach((name) => names.add(name))
      );
    }
  });

  return names;
}

interface SubjectWithMeta {
  subject: Subject;
  isAvailable: boolean;
  suneung: boolean;
  semesters: string[]; // e.g. ["2-1", "3-2"]
}

type SelectionCategory = "일반선택" | "진로선택" | "융합선택";

// ========== Department-based recommendation view ==========
function DeptRecommendContent({ deptName }: { deptName: string }) {
  const { cohort } = useCohort();

  const deptData = useMemo(() => getDepartmentRecommendation(deptName), [deptName]);

  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohort), [cohort]);
  const allSchoolNames = useMemo(() => buildAllSchoolSubjectNames(cohort), [cohort]);
  const excludedNames = useMemo(() => buildExcludedNames(cohort), [cohort]);

  // 과목명 정규화 키 → 대교협 합의도 뱃지 (학과가 속한 관심분야 계열 기준)
  const consensusBadges = useMemo(() => {
    const tags = getInterestTagsByDept(deptName);
    const raw = getConsensusBadges(tags);
    const normalized = new Map<string, ConsensusBadge>();
    raw.forEach((badge, name) => normalized.set(normalizeSubjectName(name), badge));
    return normalized;
  }, [deptName]);

  const { bySemester, unavailable, semesterOrder } = useMemo(() => {
    if (!deptData) {
      return {
        bySemester: new Map<string, SubjectWithMeta[]>(),
        unavailable: [] as SubjectWithMeta[],
        semesterOrder: [] as string[],
      };
    }

    const allItems: SubjectWithMeta[] = [];
    const seen = new Set<string>();

    (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
      deptData.subjects[cat].forEach((subjectName) => {
        const subject = getSubjectByName(subjectName);
        if (!subject) return;
        if (seen.has(subject.id)) return;
        if (subject.category === "공통") return;
        if (excludedNames.has(subject.name)) return;
        seen.add(subject.id);

        const semesters = selectableMap.get(subject.name) || [];
        const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
        const suneung = subject.suneung === true;

        allItems.push({ subject, isAvailable, suneung, semesters });
      });
    });

    // 전문교과: 학교 개설분만 후보에 추가
    getProfessionalSubjectsForTags(getInterestTagsByDept(deptName)).forEach((subject) => {
      if (seen.has(subject.id)) return;
      if (excludedNames.has(subject.name)) return;
      const semesters = selectableMap.get(subject.name) || [];
      const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
      if (!isAvailable) return; // 미개설 전문교과는 노출하지 않음
      seen.add(subject.id);
      allItems.push({ subject, isAvailable: true, suneung: subject.suneung === true, semesters });
    });

    const unavail = allItems.filter((item) => !item.isAvailable);

    const semMap = new Map<string, SubjectWithMeta[]>();
    const placed = new Set<string>();

    const order = cohort === "2025"
      ? ["3-1", "3-2"]
      : ["2-1", "2-2", "3-1", "3-2"];

    order.forEach((sem) => semMap.set(sem, []));

    allItems
      .filter((item) => item.isAvailable)
      .forEach((item) => {
        if (placed.has(item.subject.id)) return;
        const firstSem = order.find((sem) => item.semesters.includes(sem));
        if (firstSem) {
          semMap.get(firstSem)!.push(item);
          placed.add(item.subject.id);
        }
      });

    const catOrder: Record<string, number> = { "일반선택": 0, "진로선택": 1, "융합선택": 2 };
    semMap.forEach((items) => {
      items.sort((a, b) => {
        const catDiff = (catOrder[a.subject.category] ?? 3) - (catOrder[b.subject.category] ?? 3);
        if (catDiff !== 0) return catDiff;
        return a.suneung === b.suneung ? 0 : a.suneung ? -1 : 1;
      });
    });

    // 보통교과 먼저, 전문교과 뒤 (Array.prototype.sort는 안정 정렬)
    semMap.forEach((list) =>
      list.sort(
        (a, b) => Number(isProfessionalSubject(a.subject)) - Number(isProfessionalSubject(b.subject))
      )
    );

    return { bySemester: semMap, unavailable: unavail, semesterOrder: order };
  }, [deptData, selectableMap, allSchoolNames, excludedNames, cohort, deptName]);

  const [openSemesters, setOpenSemesters] = useState<Set<string>>(() => new Set(semesterOrder));
  const [showUnavailable, setShowUnavailable] = useState(false);

  const toggleSemester = (sem: string) => {
    setOpenSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) next.delete(sem);
      else next.add(sem);
      return next;
    });
  };

  const availableCount = Array.from(bySemester.values()).reduce(
    (sum, items) => sum + items.length, 0
  );
  const detailReturnPath = `/recommend?dept=${encodeURIComponent(deptName)}`;

  if (!deptData) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-muted-foreground mb-4">
          해당 학과를 찾을 수 없습니다
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">
              학과별 추천 과목
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {deptName} · {cohort === "2025" ? "고2" : "고1"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        {/* Department info */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-foreground">
              {deptData.department.name} 추천 과목
            </h2>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <Badge className="bg-[var(--primary)]/10 text-[var(--primary)]">
              {deptData.department.fieldName}
            </Badge>
            <Badge className="bg-[var(--cta)]/10 text-[var(--cta)]">
              {deptData.department.trackName}
            </Badge>
          </div>

          {/* Description */}
          <div className="rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3.5 mb-3">
            <p className="text-sm text-foreground leading-relaxed">
              {deptData.department.description}
            </p>
          </div>

          {/* 추천 근거 설명 (접이식) */}
          <RecommendBasisNote />

          {/* 권장 역량 (접이식) */}
          {deptData.department.recommendedStudents.length > 0 && (
            <CompetencyAccordion items={deptData.department.recommendedStudents} />
          )}
        </div>

        {/* Summary */}
        <div className="mb-4 rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3">
          <p className="text-sm text-foreground">
            우리 학교에서 수강 가능한 추천 과목 <span className="font-bold text-[var(--primary)]">{availableCount}개</span>
          </p>
          {consensusBadges.size > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              개교 수는 대교협 「2028학년도 권역별 대학별 권장과목」 중 해당 계열 모집단위 기준
            </p>
          )}
        </div>

        {/* 학기별 섹션 */}
        {semesterOrder.map((sem) => {
          const items = bySemester.get(sem) || [];
          if (items.length === 0) return null;
          const [g, s] = sem.split("-");
          const semLabel = `${g}학년 ${s}학기`;

          return (
            <section
              key={sem}
              className="mb-3 rounded-xl border border-border/50 bg-card/60"
            >
              <button
                onClick={() => toggleSemester(sem)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <h2 className="text-sm font-bold text-foreground">
                  {semLabel}
                </h2>
                <span className="text-xs text-muted-foreground ml-auto mr-1">
                  {items.length}개 추천
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    openSemesters.has(sem) ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openSemesters.has(sem) && (
                <div className="space-y-2 px-3 pb-3">
                  {items.map((item) => (
                    <SubjectCard
                      key={item.subject.id}
                      subject={item.subject}
                      suneung={item.suneung}
                      semesters={item.semesters}
                      detailReturnPath={detailReturnPath}
                      consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                      professionalOffered
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* 미개설 과목 - 아코디언 */}
        {unavailable.length > 0 && (
          <section className="mb-5">
            <button
              onClick={() => setShowUnavailable(!showUnavailable)}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 bg-muted/50 border border-border/50 transition-colors hover:bg-muted/80"
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="text-sm font-medium text-muted-foreground">
                우리 학교 미개설 과목
              </span>
              <span className="text-xs text-muted-foreground/60 ml-auto mr-1">
                {unavailable.length}개
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  showUnavailable ? "rotate-180" : ""
                }`}
              />
            </button>
            {showUnavailable && (
              <div className="mt-2.5 space-y-2 opacity-60">
                {unavailable.map((item) => (
                  <SubjectCard
                    key={item.subject.id}
                    subject={item.subject}
                    suneung={item.suneung}
                    detailReturnPath={detailReturnPath}
                    consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Roadmap CTA */}
        <div className="mt-4 mb-2">
          <Link href={`/roadmap?dept=${encodeURIComponent(deptName)}`}>
            <Button className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25">
              이 추천으로 로드맵 만들기
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Back to home */}
        <div className="mb-2">
          <Link href="/">
            <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold">
              다른 학과 검색하기
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ========== Interest-based recommendation view (existing) ==========
function InterestRecommendContent({ interests }: { interests: string[] }) {
  const { cohort } = useCohort();

  // 선택해야 할 과목 → 학기 매핑
  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohort), [cohort]);
  // 학교 전체 개설 과목
  const allSchoolNames = useMemo(() => buildAllSchoolSubjectNames(cohort), [cohort]);
  // 추천에서 제외할 과목 (지정 + 이미 지난 학년)
  const excludedNames = useMemo(() => buildExcludedNames(cohort), [cohort]);

  // 과목명 정규화 키 → 뱃지 (학교 과목명의 로마숫자 변형 흡수)
  const consensusBadges = useMemo(() => {
    const raw = getConsensusBadges(interests);
    const normalized = new Map<string, ConsensusBadge>();
    raw.forEach((badge, name) => normalized.set(normalizeSubjectName(name), badge));
    return normalized;
  }, [interests]);

  // 학기별로 그룹핑 + 미개설 분리
  const { bySemester, unavailable, semesterOrder } = useMemo(() => {
    const allItems: SubjectWithMeta[] = [];
    const seen = new Set<string>();

    interests.forEach((interestId) => {
      const byCategory = getRecommendedSubjectsByInterest(interestId);
      (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
        byCategory[cat].forEach((subject) => {
          if (seen.has(subject.id)) return;
          if (subject.category === "공통") return;
          if (excludedNames.has(subject.name)) return;
          seen.add(subject.id);

          const semesters = selectableMap.get(subject.name) || [];
          // 선택 가능한 학기가 있으면 available, 아니면 학교 전체에 있는지 체크
          const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
          const suneung = subject.suneung === true;

          allItems.push({ subject, isAvailable, suneung, semesters });
        });
      });
    });

    // 전문교과: 학교 개설분만 후보에 추가
    getProfessionalSubjectsForTags(interests).forEach((subject) => {
      if (seen.has(subject.id)) return;
      if (excludedNames.has(subject.name)) return;
      const semesters = selectableMap.get(subject.name) || [];
      const isAvailable = semesters.length > 0 || allSchoolNames.has(subject.name);
      if (!isAvailable) return;
      seen.add(subject.id);
      allItems.push({ subject, isAvailable: true, suneung: subject.suneung === true, semesters });
    });

    // 미개설 분리
    const unavail = allItems.filter((item) => !item.isAvailable);

    // 개설 과목을 학기별로 분류 (같은 과목이 여러 학기에 있을 수 있음 → 첫 번째 학기에만 배치)
    const semMap = new Map<string, SubjectWithMeta[]>();
    const placed = new Set<string>();

    // 학기 순서 결정
    const order = cohort === "2025"
      ? ["3-1", "3-2"]
      : ["2-1", "2-2", "3-1", "3-2"];

    order.forEach((sem) => semMap.set(sem, []));

    // 각 과목을 첫 번째 해당 학기에 배치
    allItems
      .filter((item) => item.isAvailable)
      .forEach((item) => {
        if (placed.has(item.subject.id)) return;
        const firstSem = order.find((sem) => item.semesters.includes(sem));
        if (firstSem) {
          semMap.get(firstSem)!.push(item);
          placed.add(item.subject.id);
        }
      });

    // 각 학기 내에서 일반→진로→융합 순 정렬, 그 안에서 수능 우선
    const catOrder: Record<string, number> = { "일반선택": 0, "진로선택": 1, "융합선택": 2 };
    semMap.forEach((items) => {
      items.sort((a, b) => {
        const catDiff = (catOrder[a.subject.category] ?? 3) - (catOrder[b.subject.category] ?? 3);
        if (catDiff !== 0) return catDiff;
        return a.suneung === b.suneung ? 0 : a.suneung ? -1 : 1;
      });
    });

    // 보통교과 먼저, 전문교과 뒤 (Array.prototype.sort는 안정 정렬)
    semMap.forEach((list) =>
      list.sort(
        (a, b) => Number(isProfessionalSubject(a.subject)) - Number(isProfessionalSubject(b.subject))
      )
    );

    return { bySemester: semMap, unavailable: unavail, semesterOrder: order };
  }, [interests, selectableMap, allSchoolNames, excludedNames, cohort]);

  const [openSemesters, setOpenSemesters] = useState<Set<string>>(() => new Set(semesterOrder));
  const [showUnavailable, setShowUnavailable] = useState(false);

  const toggleSemester = (sem: string) => {
    setOpenSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) next.delete(sem);
      else next.add(sem);
      return next;
    });
  };

  const selectedLabels = interests
    .map((id) => interestTags.find((t) => t.id === id)?.label)
    .filter(Boolean);

  const availableCount = Array.from(bySemester.values()).reduce(
    (sum, items) => sum + items.length, 0
  );
  const detailReturnPath = `/recommend?interests=${interests.join(",")}`;

  if (interests.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-muted-foreground mb-4">
          관심 분야를 먼저 선택해주세요
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">
              맞춤 과목 추천
            </h1>
            <p className="text-[11px] text-muted-foreground">
              효자고등학교 · {cohort === "2025" ? "고2" : "고1"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        {/* Selected interests */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-[var(--cta)]" />
          {selectedLabels.map((label) => (
            <Badge
              key={label}
              className="bg-[var(--primary)]/10 text-[var(--primary)]"
            >
              {label}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            기반 추천 결과
          </span>
        </div>

        {/* Summary */}
        <div className="mb-4 rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3">
          <p className="text-sm text-foreground">
            우리 학교에서 수강 가능한 추천 과목 <span className="font-bold text-[var(--primary)]">{availableCount}개</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            개교 수는 대교협 「2028학년도 권역별 대학별 권장과목」 중 선택한 계열 모집단위 기준
          </p>
        </div>

        {/* 추천 근거 설명 (접이식) */}
        <RecommendBasisNote />

        {/* 학기별 섹션 */}
        {semesterOrder.map((sem) => {
          const items = bySemester.get(sem) || [];
          if (items.length === 0) return null;
          const [g, s] = sem.split("-");
          const semLabel = `${g}학년 ${s}학기`;

          return (
            <section
              key={sem}
              className="mb-3 rounded-xl border border-border/50 bg-card/60"
            >
              <button
                onClick={() => toggleSemester(sem)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <h2 className="text-sm font-bold text-foreground">
                  {semLabel}
                </h2>
                <span className="text-xs text-muted-foreground ml-auto mr-1">
                  {items.length}개 추천
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    openSemesters.has(sem) ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openSemesters.has(sem) && (
                <div className="space-y-2 px-3 pb-3">
                  {items.map((item) => (
                    <SubjectCard
                      key={item.subject.id}
                      subject={item.subject}
                      suneung={item.suneung}
                      semesters={item.semesters}
                      detailReturnPath={detailReturnPath}
                      consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                      professionalOffered
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* 미개설 과목 - 아코디언 */}
        {unavailable.length > 0 && (
          <section className="mb-5">
            <button
              onClick={() => setShowUnavailable(!showUnavailable)}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 bg-muted/50 border border-border/50 transition-colors hover:bg-muted/80"
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="text-sm font-medium text-muted-foreground">
                우리 학교 미개설 과목
              </span>
              <span className="text-xs text-muted-foreground/60 ml-auto mr-1">
                {unavailable.length}개
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  showUnavailable ? "rotate-180" : ""
                }`}
              />
            </button>
            {showUnavailable && (
              <div className="mt-2.5 space-y-2 opacity-60">
                {unavailable.map((item) => (
                  <SubjectCard
                    key={item.subject.id}
                    subject={item.subject}
                    suneung={item.suneung}
                    detailReturnPath={detailReturnPath}
                    consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* CTA to roadmap */}
        <div className="mt-4 mb-2">
          <Link href={`/roadmap?interests=${interests.join(",")}`}>
            <Button className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25">
              3년 로드맵 만들기
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ========== Compare view ==========
function CompareContent({ deptNames }: { deptNames: string[] }) {
  const { cohort } = useCohort();
  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohort), [cohort]);
  const excludedNames = useMemo(() => buildExcludedNames(cohort), [cohort]);

  // Per-dept subject sets (available subjects only)
  const deptData = useMemo(() => {
    return deptNames.map((name) => {
      const data = getDepartmentRecommendation(name);
      if (!data) return { name, subjects: new Set<string>() };
      const subjects = new Set<string>();
      (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
        data.subjects[cat].forEach((subjectName) => {
          if (!excludedNames.has(subjectName) && selectableMap.has(subjectName)) {
            subjects.add(subjectName);
          }
        });
      });
      return { name, subjects };
    });
  }, [deptNames, excludedNames, selectableMap]);

  // Build union: subjectName → set of deptNames that recommend it
  const subjectCoverage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    deptData.forEach(({ name, subjects }) => {
      subjects.forEach((s) => {
        if (!map.has(s)) map.set(s, new Set());
        map.get(s)!.add(name);
      });
    });
    return map;
  }, [deptData]);

  // Common subjects (all depts recommend)
  const commonSubjects = useMemo(() => {
    const result: string[] = [];
    subjectCoverage.forEach((depts, name) => {
      if (depts.size === deptNames.length) result.push(name);
    });
    return result;
  }, [subjectCoverage, deptNames.length]);

  // Subjects exclusive to each dept
  const exclusiveSubjects = useMemo(() => {
    const result: Record<string, string[]> = {};
    deptNames.forEach((name) => (result[name] = []));
    subjectCoverage.forEach((depts, subjectName) => {
      if (depts.size < deptNames.length) {
        depts.forEach((deptName) => {
          if (result[deptName]) result[deptName].push(subjectName);
        });
      }
    });
    return result;
  }, [subjectCoverage, deptNames]);

  const [showExclusive, setShowExclusive] = useState<Record<string, boolean>>({});

  const toggleExclusive = (name: string) =>
    setShowExclusive((prev) => ({ ...prev, [name]: !prev[name] }));

  const getCategory = (name: string) => getSubjectByName(name)?.category ?? "";

  const catColor: Record<string, string> = {
    "일반선택": "bg-blue-100 text-blue-700",
    "진로선택": "bg-purple-100 text-purple-700",
    "융합선택": "bg-teal-100 text-teal-700",
  };

  return (
    <div className="min-h-dvh pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">학과 비교</h1>
            <p className="text-[11px] text-muted-foreground">
              효자고등학교 · {cohort === "2025" ? "고2" : "고1"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        {/* Dept chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {deptNames.map((name) => (
            <Badge key={name} className="bg-[var(--primary)]/10 text-[var(--primary)] text-sm px-3 py-1">
              {name}
            </Badge>
          ))}
        </div>

        {/* Common subjects */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">
              공통 추천 과목
            </h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {commonSubjects.length}개
            </span>
          </div>
          {commonSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">공통 추천 과목이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {commonSubjects.map((name) => {
                const cat = getCategory(name);
                return (
                  <div
                    key={name}
                    className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5"
                  >
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {name}
                    </span>
                    {cat && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catColor[cat] ?? ""}`}>
                        {cat}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-dept exclusive subjects */}
        {deptNames.map((deptName) => {
          const excl = exclusiveSubjects[deptName] || [];
          if (excl.length === 0) return null;
          const isOpen = showExclusive[deptName];
          return (
            <section key={deptName} className="mb-3">
              <button
                onClick={() => toggleExclusive(deptName)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 bg-muted/50 border border-border/50 transition-colors hover:bg-muted/80"
              >
                <span className="text-sm font-medium text-foreground truncate">{deptName} 전용</span>
                <span className="text-xs text-muted-foreground ml-auto mr-1">{excl.length}개</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="mt-2 space-y-1.5 px-1">
                  {excl.map((name) => {
                    const cat = getCategory(name);
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-foreground">{name}</span>
                        {cat && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catColor[cat] ?? ""}`}>
                            {cat}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {/* CTAs */}
        <div className="mt-5 space-y-2">
          {commonSubjects.length > 0 && (
            <Link href={`/roadmap?dept=${encodeURIComponent(deptNames[0])}`}>
              <Button className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25">
                공통 과목 기반 로드맵 만들기
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          )}
          {deptNames.map((name) => (
            <Link key={name} href={`/roadmap?dept=${encodeURIComponent(name)}`}>
              <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium mt-1">
                {name} 로드맵 만들기
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          ))}
          <Link href="/">
            <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium mt-1">
              다른 학과 검색하기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ========== Router component ==========
function RecommendContent() {
  const searchParams = useSearchParams();
  const deptName = searchParams.get("dept");
  const compare = searchParams.get("compare");
  const interests = searchParams.get("interests")?.split(",") ?? [];

  // Compare mode
  if (compare) {
    const deptNames = compare.split(",").filter(Boolean).slice(0, 3);
    if (deptNames.length >= 2) {
      return <CompareContent deptNames={deptNames} />;
    }
  }

  // Department-based mode
  if (deptName) {
    return <DeptRecommendContent deptName={deptName} />;
  }

  // Interest-based mode (existing behavior)
  return <InterestRecommendContent interests={interests} />;
}

export default function RecommendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <RecommendContent />
    </Suspense>
  );
}
