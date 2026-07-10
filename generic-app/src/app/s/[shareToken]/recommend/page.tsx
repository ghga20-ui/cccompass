"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ChevronDown,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubjectCard from "@/components/SubjectCard";
import {
  interestTags,
  getRecommendedSubjectsByInterest,
  getInterestTagsByDept,
} from "@/data/career-mapping";
import { getProfessionalSubjectsForTags } from "@/data/professional-subjects";
import { buildRecommendItems, type RecommendItem } from "@/lib/recommend-items";
import type { Subject } from "@/data/subjects";
import { getDepartmentRecommendation } from "@/data/search-index";
import { getConsensusBadges, type ConsensusBadge } from "@/data/university-recommendations";
import { normalizeSubjectName } from "@/lib/consensus";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  expandSubjectNames,
  getCohortData,
  getStudentSemesterConfigs,
  type CohortData,
} from "@/lib/hyoja/school-adapter";
import { buildShareHref } from "@/lib/hyoja/share-routes";

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
            「전문교과」 라벨은 보통교과가 아닌 전문교과라는 표시입니다. 학기별 목록에 뜬 전문교과는
            우리 학교가 개설한 과목이며, 카드에 <b>&apos;우리 학교 개설&apos;</b>이 함께 표시됩니다.
            대교협 자료는 보통교과 위주라 전문교과를 다루지 않으므로, 대학별 반영과목 배지가 붙지
            않습니다.
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

// ========== 편제 기반 헬퍼 (단일/다중 cohort 모두 동적 처리) ==========

/** 편제에 존재하는 학기 순서 ("2-1", "3-2" 등) */
function buildSemesterOrder(cohortData: CohortData | undefined): string[] {
  if (!cohortData) return [];
  return getStudentSemesterConfigs(cohortData).map(
    (s) => `${s.grade}-${s.semester}`,
  );
}

/** 선택과목 → 개설 학기 라벨 매핑 (묶음과목 확장) */
function buildSelectableSubjectMap(
  cohortData: CohortData | undefined,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!cohortData) return map;

  const addName = (name: string, label: string) => {
    const existing = map.get(name) || [];
    if (!existing.includes(label)) existing.push(label);
    map.set(name, existing);
  };

  cohortData.selections.forEach((g) => {
    const label = `${g.grade}-${g.semester}`;
    g.options.forEach((o) => {
      expandSubjectNames(o).forEach((name) => addName(name, label));
    });
  });

  return map;
}

/** 우리 학교에 개설되는 전체 과목 (지정+선택, 전 학년) */
function buildAllSchoolSubjectNames(
  cohortData: CohortData | undefined,
): Set<string> {
  const names = new Set<string>();
  if (!cohortData) return names;

  cohortData.designated.forEach((d) =>
    expandSubjectNames(d.subject).forEach((name) => names.add(name)),
  );
  cohortData.selections.forEach((g) =>
    g.options.forEach((o) =>
      expandSubjectNames(o).forEach((name) => names.add(name)),
    ),
  );

  return names;
}

/** 추천에서 제외할 과목: 학교지정 과목(필수라 추천 불필요) */
function buildExcludedNames(cohortData: CohortData | undefined): Set<string> {
  const names = new Set<string>();
  if (!cohortData) return names;

  cohortData.designated.forEach((d) =>
    expandSubjectNames(d.subject).forEach((name) => names.add(name)),
  );

  return names;
}

type SubjectWithMeta = RecommendItem<Subject>;

// ========== Department-based recommendation view ==========
function DeptRecommendContent({ deptName }: { deptName: string }) {
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const deptData = useMemo(
    () => getDepartmentRecommendation(deptName, subjectCatalog.getSubjectByName),
    [deptName, subjectCatalog],
  );

  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohortData), [cohortData]);
  const allSchoolNames = useMemo(() => buildAllSchoolSubjectNames(cohortData), [cohortData]);
  const excludedNames = useMemo(() => buildExcludedNames(cohortData), [cohortData]);
  const semesterOrder = useMemo(() => buildSemesterOrder(cohortData), [cohortData]);

  // 과목명 정규화 키 → 대교협 합의도 뱃지 (학과가 속한 관심분야 계열 기준)
  const consensusBadges = useMemo(() => {
    const tags = getInterestTagsByDept(deptName);
    const raw = getConsensusBadges(tags);
    const normalized = new Map<string, ConsensusBadge>();
    raw.forEach((badge, name) => normalized.set(normalizeSubjectName(name), badge));
    return normalized;
  }, [deptName]);

  const { bySemester, unavailable } = useMemo(() => {
    if (!deptData) {
      return {
        bySemester: new Map<string, SubjectWithMeta[]>(),
        unavailable: [] as SubjectWithMeta[],
      };
    }

    const baseSubjects: Subject[] = [];
    (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
      deptData.subjects[cat].forEach((subjectName) => {
        const subject = subjectCatalog.getSubjectByName(subjectName);
        if (subject) baseSubjects.push(subject);
      });
    });

    return buildRecommendItems({
      baseSubjects,
      professionalSubjects: getProfessionalSubjectsForTags(
        getInterestTagsByDept(deptName),
        subjectCatalog.getSubjectByName,
      ),
      selectableMap,
      allSchoolNames,
      excludedNames,
      semesterOrder,
    });
  }, [deptData, selectableMap, allSchoolNames, excludedNames, semesterOrder, subjectCatalog, deptName]);

  const [openSemesters, setOpenSemesters] = useState<Set<string>>(
    () => new Set(semesterOrder),
  );
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
    (sum, items) => sum + items.length,
    0,
  );
  const detailReturnPath = buildShareHref(basePath, "/recommend", { dept: deptName });

  if (!deptData) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-muted-foreground mb-4">해당 학과를 찾을 수 없습니다</p>
        <Link href={buildShareHref(basePath, "/")}>
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={buildShareHref(basePath, "/")} className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">학과별 추천 과목</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {deptName}
              {cohortLabel ? ` · ${cohortLabel}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
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

          <div className="rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3.5 mb-3">
            <p className="text-sm text-foreground leading-relaxed">
              {deptData.department.description}
            </p>
          </div>

          {/* 추천 근거 설명 (접이식) */}
          <RecommendBasisNote />

          {deptData.department.recommendedStudents.length > 0 && (
            <CompetencyAccordion items={deptData.department.recommendedStudents} />
          )}
        </div>

        <div className="mb-4 rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3">
          <p className="text-sm text-foreground">
            우리 학교에서 수강 가능한 추천 과목{" "}
            <span className="font-bold text-[var(--primary)]">{availableCount}개</span>
          </p>
          {consensusBadges.size > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              개교 수는 대교협 「2028학년도 권역별 대학별 권장과목」 중 해당 계열 모집단위 기준
            </p>
          )}
        </div>

        {semesterOrder.map((sem) => {
          const items = bySemester.get(sem) || [];
          if (items.length === 0) return null;
          const [g, s] = sem.split("-");
          return (
            <section key={sem} className="mb-3 rounded-xl border border-border/50 bg-card/60">
              <button
                onClick={() => toggleSemester(sem)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <h2 className="text-sm font-bold text-foreground">{g}학년 {s}학기</h2>
                <span className="text-xs text-muted-foreground ml-auto mr-1">
                  {items.length}개 추천
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${openSemesters.has(sem) ? "rotate-180" : ""}`}
                />
              </button>
              {openSemesters.has(sem) && (
                <div className="flex flex-col gap-3 px-3 pb-3">
                  {items.map((item) => (
                    <SubjectCard
                      key={item.subject.id}
                      subject={item.subject}
                      basePath={basePath}
                      suneung={item.suneung}
                      semesters={item.semesters}
                      detailReturnPath={detailReturnPath}
                      consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                      professionalOffered={item.professionalOffered}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

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
                className={`h-4 w-4 text-muted-foreground transition-transform ${showUnavailable ? "rotate-180" : ""}`}
              />
            </button>
            {showUnavailable && (
              <div className="mt-2.5 flex flex-col gap-2 opacity-60">
                {unavailable.map((item) => (
                  <SubjectCard
                    key={item.subject.id}
                    subject={item.subject}
                    basePath={basePath}
                    suneung={item.suneung}
                    detailReturnPath={detailReturnPath}
                    consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                    professionalOffered={item.professionalOffered}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-4 mb-2">
          <Link href={buildShareHref(basePath, "/roadmap", { dept: deptName })}>
            <Button className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25">
              이 추천으로 로드맵 만들기
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mb-2">
          <Link href={buildShareHref(basePath, "/")}>
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

// ========== Interest-based recommendation view ==========
function InterestRecommendContent({ interests }: { interests: string[] }) {
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohortData), [cohortData]);
  const allSchoolNames = useMemo(() => buildAllSchoolSubjectNames(cohortData), [cohortData]);
  const excludedNames = useMemo(() => buildExcludedNames(cohortData), [cohortData]);
  const semesterOrder = useMemo(() => buildSemesterOrder(cohortData), [cohortData]);

  // 과목명 정규화 키 → 뱃지 (학교 과목명의 로마숫자 변형 흡수)
  const consensusBadges = useMemo(() => {
    const raw = getConsensusBadges(interests);
    const normalized = new Map<string, ConsensusBadge>();
    raw.forEach((badge, name) => normalized.set(normalizeSubjectName(name), badge));
    return normalized;
  }, [interests]);

  const { bySemester, unavailable } = useMemo(() => {
    const baseSubjects: Subject[] = [];
    interests.forEach((interestId) => {
      const byCategory = getRecommendedSubjectsByInterest(
        interestId,
        subjectCatalog.getSubjectByName,
      );
      (["일반선택", "진로선택", "융합선택"] as const).forEach((cat) => {
        byCategory[cat].forEach((subject) => baseSubjects.push(subject));
      });
    });

    return buildRecommendItems({
      baseSubjects,
      professionalSubjects: getProfessionalSubjectsForTags(
        interests,
        subjectCatalog.getSubjectByName,
      ),
      selectableMap,
      allSchoolNames,
      excludedNames,
      semesterOrder,
    });
  }, [interests, selectableMap, allSchoolNames, excludedNames, semesterOrder, subjectCatalog]);

  const [openSemesters, setOpenSemesters] = useState<Set<string>>(
    () => new Set(semesterOrder),
  );
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
    (sum, items) => sum + items.length,
    0,
  );
  const detailReturnPath = buildShareHref(basePath, "/recommend", {
    interests: interests.join(","),
  });

  if (interests.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-muted-foreground mb-4">관심 분야를 먼저 선택해주세요</p>
        <Link href={buildShareHref(basePath, "/")}>
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={buildShareHref(basePath, "/")} className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">맞춤 과목 추천</h1>
            <p className="text-[11px] text-muted-foreground">
              {schoolData.schoolName}
              {cohortLabel ? ` · ${cohortLabel}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-[var(--cta)]" />
          {selectedLabels.map((label) => (
            <Badge key={label} className="bg-[var(--primary)]/10 text-[var(--primary)]">
              {label}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">기반 추천 결과</span>
        </div>

        <div className="mb-4 rounded-xl bg-gradient-to-r from-[var(--primary)]/5 to-[var(--cta)]/5 border border-border/50 p-3">
          <p className="text-sm text-foreground">
            우리 학교에서 수강 가능한 추천 과목{" "}
            <span className="font-bold text-[var(--primary)]">{availableCount}개</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            개교 수는 대교협 「2028학년도 권역별 대학별 권장과목」 중 선택한 계열 모집단위 기준
          </p>
        </div>

        {/* 추천 근거 설명 (접이식) */}
        <RecommendBasisNote />

        {semesterOrder.map((sem) => {
          const items = bySemester.get(sem) || [];
          if (items.length === 0) return null;
          const [g, s] = sem.split("-");
          return (
            <section key={sem} className="mb-3 rounded-xl border border-border/50 bg-card/60">
              <button
                onClick={() => toggleSemester(sem)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <h2 className="text-sm font-bold text-foreground">{g}학년 {s}학기</h2>
                <span className="text-xs text-muted-foreground ml-auto mr-1">
                  {items.length}개 추천
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${openSemesters.has(sem) ? "rotate-180" : ""}`}
                />
              </button>
              {openSemesters.has(sem) && (
                <div className="flex flex-col gap-3 px-3 pb-3">
                  {items.map((item) => (
                    <SubjectCard
                      key={item.subject.id}
                      subject={item.subject}
                      basePath={basePath}
                      suneung={item.suneung}
                      semesters={item.semesters}
                      detailReturnPath={detailReturnPath}
                      consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                      professionalOffered={item.professionalOffered}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

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
                className={`h-4 w-4 text-muted-foreground transition-transform ${showUnavailable ? "rotate-180" : ""}`}
              />
            </button>
            {showUnavailable && (
              <div className="mt-2.5 flex flex-col gap-2 opacity-60">
                {unavailable.map((item) => (
                  <SubjectCard
                    key={item.subject.id}
                    subject={item.subject}
                    basePath={basePath}
                    suneung={item.suneung}
                    detailReturnPath={detailReturnPath}
                    consensus={consensusBadges.get(normalizeSubjectName(item.subject.name))}
                    professionalOffered={item.professionalOffered}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-4 mb-2">
          <Link href={buildShareHref(basePath, "/roadmap", { interests: interests.join(",") })}>
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
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const selectableMap = useMemo(() => buildSelectableSubjectMap(cohortData), [cohortData]);
  const excludedNames = useMemo(() => buildExcludedNames(cohortData), [cohortData]);

  const deptData = useMemo(() => {
    return deptNames.map((name) => {
      const data = getDepartmentRecommendation(name, subjectCatalog.getSubjectByName);
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
  }, [deptNames, excludedNames, selectableMap, subjectCatalog]);

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

  const commonSubjects = useMemo(() => {
    const result: string[] = [];
    subjectCoverage.forEach((depts, name) => {
      if (depts.size === deptNames.length) result.push(name);
    });
    return result;
  }, [subjectCoverage, deptNames.length]);

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

  const getCategory = (name: string) =>
    subjectCatalog.getSubjectByName(name)?.category ?? "";

  const catColor: Record<string, string> = {
    일반선택: "bg-blue-100 text-blue-700",
    진로선택: "bg-purple-100 text-purple-700",
    융합선택: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="min-h-dvh pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={buildShareHref(basePath, "/")} className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">학과 비교</h1>
            <p className="text-[11px] text-muted-foreground">
              {schoolData.schoolName}
              {cohortLabel ? ` · ${cohortLabel}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {deptNames.map((name) => (
            <Badge key={name} className="bg-[var(--primary)]/10 text-[var(--primary)] text-sm px-3 py-1">
              {name}
            </Badge>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">공통 추천 과목</h2>
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
                    <span className="flex-1 text-sm font-medium text-foreground">{name}</span>
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

        <div className="mt-5 space-y-2">
          {commonSubjects.length > 0 && (
            <Link href={buildShareHref(basePath, "/roadmap", { dept: deptNames[0] })}>
              <Button className="w-full h-12 rounded-xl text-base font-semibold bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25">
                공통 과목 기반 로드맵 만들기
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          )}
          {deptNames.map((name) => (
            <Link key={name} href={buildShareHref(basePath, "/roadmap", { dept: name })}>
              <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium mt-1">
                {name} 로드맵 만들기
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          ))}
          <Link href={buildShareHref(basePath, "/")}>
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
  const interests = searchParams.get("interests")?.split(",").filter(Boolean) ?? [];

  if (compare) {
    const deptNames = compare.split(",").filter(Boolean).slice(0, 3);
    if (deptNames.length >= 2) {
      return <CompareContent deptNames={deptNames} />;
    }
  }

  if (deptName) {
    return <DeptRecommendContent deptName={deptName} />;
  }

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
