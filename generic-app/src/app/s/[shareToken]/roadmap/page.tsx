"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Share2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCohort } from "@/contexts/CohortContext";
import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";
import {
  expandSubjectNames,
  getCohortData,
  getDesignatedSubjects,
  getSelectionGroups,
  getStudentSemesterConfigs,
  type CohortData,
} from "@/lib/hyoja/school-adapter";
import type { SubjectCatalog } from "@/lib/hyoja/subject-catalog";
import { buildShareHref } from "@/lib/hyoja/share-routes";
import {
  decodeRoadmapSelectionState,
  encodeRoadmapSelectionState,
} from "@/lib/roadmap-selection-state";
import {
  interestTags,
  getRecommendedSubjectsByInterest,
} from "@/data/career-mapping";
import { getDepartmentRecommendation } from "@/data/search-index";
import SelectionGroup from "@/components/SelectionGroup";

// ========== 추천 과목명 집합 ==========

function buildRecommendedNames(
  interests: string[],
  catalog: SubjectCatalog,
): Set<string> {
  const names = new Set<string>();
  interests.forEach((interestId) => {
    const rec = getRecommendedSubjectsByInterest(interestId, catalog.getSubjectByName);
    rec["일반선택"].forEach((s) => names.add(s.name));
    rec["진로선택"].forEach((s) => names.add(s.name));
    rec["융합선택"].forEach((s) => names.add(s.name));
  });
  return names;
}

function buildRecommendedNamesFromDept(
  deptName: string,
  catalog: SubjectCatalog,
): Set<string> {
  const names = new Set<string>();
  const deptData = getDepartmentRecommendation(deptName, catalog.getSubjectByName);
  if (!deptData) return names;
  deptData.subjects["일반선택"].forEach((n) => names.add(n));
  deptData.subjects["진로선택"].forEach((n) => names.add(n));
  deptData.subjects["융합선택"].forEach((n) => names.add(n));
  return names;
}

// ========== Main Content ==========

function RoadmapContent() {
  const searchParams = useSearchParams();
  const deptName = searchParams.get("dept");
  const interestParam = searchParams.get("interests");
  const interests = useMemo(
    () => interestParam?.split(",").filter(Boolean) ?? [],
    [interestParam],
  );
  const sParam = searchParams.get("s");
  const { cohort, cohortLabel } = useCohort();
  const { basePath, schoolData, subjectCatalog } = useHyojaRuntime();
  const cohortData = getCohortData(schoolData, cohort);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // 편제에 실재하는 학기 (단일/다중 cohort 모두 동적)
  const semesterConfigs = useMemo(
    () => (cohortData ? getStudentSemesterConfigs(cohortData) : []),
    [cohortData],
  );

  // 편제에 존재하는 학년 목록 (학점요약 표시 정책 결정용)
  const gradeList = useMemo(
    () =>
      Array.from(new Set(semesterConfigs.map((s) => s.grade))).sort(
        (a, b) => a - b,
      ),
    [semesterConfigs],
  );
  const minGrade = gradeList[0] ?? 1;

  const validGroupIds = useMemo(() => {
    if (!cohortData) return new Set<string>();
    return new Set(cohortData.selections.map((group) => group.id));
  }, [cohortData]);

  const recommendedNames = useMemo(() => {
    if (deptName) return buildRecommendedNamesFromDept(deptName, subjectCatalog);
    return buildRecommendedNames(interests, subjectCatalog);
  }, [deptName, interests, subjectCatalog]);

  // 공유 링크 복원 (JSON base64url)
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const decoded = decodeRoadmapSelectionState(sParam, validGroupIds);
    return decoded?.selections ?? {};
  });

  const detailReturnPath = useMemo(() => {
    return buildShareHref(basePath, "/roadmap", {
      dept: deptName ?? undefined,
      interests: !deptName && interests.length > 0 ? interests.join(",") : undefined,
      c: cohort,
      s: encodeRoadmapSelectionState({ cohort, selections }),
    });
  }, [basePath, cohort, deptName, interests, selections]);

  // ========== 충돌 감지 ==========
  const getConflictsForGroup = useCallback(
    (targetGroupId: string, grade: number, semester: number): Map<string, string> => {
      const conflicts = new Map<string, string>();
      if (!cohortData) return conflicts;

      getSelectionGroups(schoolData, cohort, grade, semester).forEach((g) => {
        if (g.id === targetGroupId) return;
        (selections[g.id] || []).forEach((name) => conflicts.set(name, "이미 선택"));
      });

      if (semester === 2) {
        getSelectionGroups(schoolData, cohort, grade, 1).forEach((g) => {
          (selections[g.id] || []).forEach((name) =>
            conflicts.set(name, "1학기 수강"),
          );
        });
      }

      if (grade > minGrade) {
        for (let prevGrade = minGrade; prevGrade < grade; prevGrade++) {
          for (const prevSem of [1, 2]) {
            getSelectionGroups(schoolData, cohort, prevGrade, prevSem).forEach((g) => {
              (selections[g.id] || []).forEach((name) =>
                conflicts.set(name, `${prevGrade}학년 수강`),
              );
            });
          }
        }
      }

      return conflicts;
    },
    [cohortData, schoolData, cohort, selections, minGrade],
  );

  const handleToggle = useCallback(
    (groupId: string, choose: number, subjectName: string) => {
      setSelections((prev) => {
        const current = prev[groupId] || [];
        const isRadio = choose === 1;

        if (current.includes(subjectName)) {
          return { ...prev, [groupId]: current.filter((n) => n !== subjectName) };
        }
        if (isRadio) {
          return { ...prev, [groupId]: [subjectName] };
        }
        if (current.length < choose) {
          return { ...prev, [groupId]: [...current, subjectName] };
        }
        return prev;
      });
    },
    [],
  );

  // 학점 계산
  const getSemesterCredits = useCallback(
    (grade: number, semester: number) => {
      const designated = getDesignatedSubjects(schoolData, cohort, grade, semester);
      const designatedCredits = designated.reduce((sum, d) => sum + d.credits, 0);

      const groups = getSelectionGroups(schoolData, cohort, grade, semester);
      const selectionCredits = groups.reduce((sum, g) => {
        const sel = selections[g.id] || [];
        return sum + sel.length * g.creditsEach;
      }, 0);

      const totalExpected =
        designatedCredits + groups.reduce((sum, g) => sum + g.totalCredits, 0);

      return {
        designatedCredits,
        selectionCredits,
        total: designatedCredits + selectionCredits,
        totalExpected,
      };
    },
    [schoolData, cohort, selections],
  );

  const grandTotal = useMemo(() => {
    return semesterConfigs.reduce(
      (acc, { grade, semester }) => {
        const c = getSemesterCredits(grade, semester);
        return {
          selected: acc.selected + c.total,
          expected: acc.expected + c.totalExpected,
        };
      },
      { selected: 0, expected: 0 },
    );
  }, [semesterConfigs, getSemesterCredits]);

  const gradeTotals = useMemo(() => {
    const byGrade: Record<number, { selected: number; expected: number }> = {};
    semesterConfigs.forEach(({ grade, semester }) => {
      if (!byGrade[grade]) byGrade[grade] = { selected: 0, expected: 0 };
      const c = getSemesterCredits(grade, semester);
      byGrade[grade].selected += c.total;
      byGrade[grade].expected += c.totalExpected;
    });
    return byGrade;
  }, [semesterConfigs, getSemesterCredits]);

  // 학년이 2개 이상이면 학년별, 1개면 전체 합계 표시
  const showByGrade = gradeList.length > 1;

  const interestLabels = useMemo(() => {
    return interests
      .map((id) => interestTags.find((t) => t.id === id)?.label)
      .filter(Boolean) as string[];
  }, [interests]);

  // ========== 공유하기 ==========
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${detailReturnPath}`;
    try {
      await navigator.share({ title: `${schoolData.schoolName} 수강 로드맵`, url });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast("링크가 복사되었습니다!");
      } catch {
        showToast("공유 실패 — 주소창에서 URL을 복사해 주세요");
      }
    }
  }, [detailReturnPath, schoolData.schoolName, showToast]);

  // ========== 이미지 저장 (Canvas 2D) ==========
  const handleExportImage = useCallback(() => {
    showToast("이미지 생성 중...");
    try {
      const DPR = 2;
      const W = 400;
      const PAD = 24;
      const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = W * DPR;
      tmpCanvas.height = 1;
      const tmp = tmpCanvas.getContext("2d")!;

      let totalH = PAD;
      totalH += 28;
      totalH += 20;
      if (deptName) totalH += 32;
      else if (interestLabels.length > 0) totalH += 28;
      totalH += 20;

      const contentW = W - PAD * 2;
      const CHIP_H = 22;
      const CHIP_PAD_H = 9;
      const CHIP_GAP = 4;

      const chipLabel = (text: string) => expandSubjectNames(text).join("/");

      semesterConfigs.forEach(({ grade, semester }) => {
        const designated = getDesignatedSubjects(schoolData, cohort, grade, semester);
        const groups = getSelectionGroups(schoolData, cohort, grade, semester);
        const selected = groups.flatMap((g) => selections[g.id] || []);
        const allChips = [
          ...designated.map((d) => chipLabel(d.subject)),
          ...selected,
        ];

        totalH += 20 + 7;
        tmp.font = `400 11px ${FONT}`;
        let rowX = 0;
        let rows = 1;
        allChips.forEach((text) => {
          const chipW = tmp.measureText(text).width + CHIP_PAD_H * 2;
          if (rowX > 0 && rowX + chipW > contentW) {
            rows++;
            rowX = 0;
          }
          rowX += chipW + CHIP_GAP;
        });
        totalH += rows * (CHIP_H + CHIP_GAP) + 10;
      });

      totalH += 20 + 20 + PAD;

      const canvas = document.createElement("canvas");
      canvas.width = W * DPR;
      canvas.height = totalH * DPR;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(DPR, DPR);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, totalH);

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      let cy = PAD;

      ctx.font = `800 20px ${FONT}`;
      ctx.fillStyle = "#111827";
      ctx.fillText(schoolData.schoolName, PAD, cy + 20);
      cy += 26;

      ctx.font = `400 13px ${FONT}`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(
        `${cohortLabel ? `${cohortLabel} ` : ""}수강 로드맵`,
        PAD,
        cy + 14,
      );
      cy += 18;

      if (deptName) {
        cy += 8;
        ctx.font = `600 12px ${FONT}`;
        const txt = `🎓 ${deptName}`;
        const cw = ctx.measureText(txt).width + 20;
        ctx.fillStyle = "#ede9fe";
        rr(PAD, cy, cw, 22, 11);
        ctx.fill();
        ctx.fillStyle = "#7c3aed";
        ctx.fillText(txt, PAD + 10, cy + 15);
        cy += 30;
      } else if (interestLabels.length > 0) {
        cy += 8;
        ctx.font = `600 11px ${FONT}`;
        let fx = PAD;
        interestLabels.forEach((label) => {
          const cw = ctx.measureText(label).width + 16;
          ctx.fillStyle = "#ede9fe";
          rr(fx, cy, cw, 20, 10);
          ctx.fill();
          ctx.fillStyle = "#7c3aed";
          ctx.fillText(label, fx + 8, cy + 14);
          fx += cw + 6;
        });
        cy += 28;
      }

      cy += 8;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, cy);
      ctx.lineTo(W - PAD, cy);
      ctx.stroke();
      cy += 14;

      semesterConfigs.forEach(({ grade, semester, label }) => {
        const designated = getDesignatedSubjects(schoolData, cohort, grade, semester);
        const groups = getSelectionGroups(schoolData, cohort, grade, semester);
        const selected = groups.flatMap((g) => selections[g.id] || []);
        const credits = getSemesterCredits(grade, semester);

        ctx.font = `700 12px ${FONT}`;
        ctx.fillStyle = "#111827";
        ctx.fillText(label, PAD, cy + 12);

        const creditTxt = `${credits.total}/${credits.totalExpected}학점${credits.total === credits.totalExpected ? " ✓" : ""}`;
        ctx.font = `400 11px ${FONT}`;
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(creditTxt, W - PAD - ctx.measureText(creditTxt).width, cy + 12);
        cy += 27;

        const allChips: { text: string; sel: boolean }[] = [
          ...designated.map((d) => ({ text: chipLabel(d.subject), sel: false })),
          ...selected.map((n) => ({ text: n, sel: true })),
        ];

        if (allChips.length === 0) {
          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = "#d1d5db";
          ctx.fillText("선택 없음", PAD, cy + 15);
          cy += CHIP_H + CHIP_GAP;
        } else {
          let chipX = PAD;
          allChips.forEach(({ text, sel }) => {
            ctx.font = sel ? `600 11px ${FONT}` : `400 11px ${FONT}`;
            const chipW = ctx.measureText(text).width + CHIP_PAD_H * 2;
            if (chipX > PAD && chipX + chipW > W - PAD) {
              chipX = PAD;
              cy += CHIP_H + CHIP_GAP;
            }
            ctx.fillStyle = sel ? "#eef2ff" : "#f3f4f6";
            rr(chipX, cy, chipW, CHIP_H, 6);
            ctx.fill();
            ctx.fillStyle = sel ? "#3730a3" : "#6b7280";
            ctx.fillText(text, chipX + CHIP_PAD_H, cy + 15);
            chipX += chipW + CHIP_GAP;
          });
          cy += CHIP_H + CHIP_GAP;
        }
        cy += 10;
      });

      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, cy);
      ctx.lineTo(W - PAD, cy);
      ctx.stroke();
      cy += 12;

      ctx.font = `600 12px ${FONT}`;
      if (showByGrade) {
        let fx = PAD;
        gradeList.forEach((grade) => {
          const gt = gradeTotals[grade];
          if (!gt) return;
          const t = `고${grade} ${gt.selected}/${gt.expected}학점${gt.selected === gt.expected ? " ✓" : ""}`;
          ctx.fillStyle = gt.selected === gt.expected ? "#059669" : "#6b7280";
          ctx.fillText(t, fx, cy + 14);
          fx += ctx.measureText(t).width + 16;
        });
      } else {
        const t = `전체 ${grandTotal.selected}/${grandTotal.expected}학점${grandTotal.selected === grandTotal.expected ? " ✓" : ""}`;
        ctx.fillStyle = grandTotal.selected === grandTotal.expected ? "#059669" : "#6b7280";
        ctx.fillText(t, PAD, cy + 14);
      }

      ctx.font = `400 11px ${FONT}`;
      ctx.fillStyle = "#d1d5db";
      const wm = `${schoolData.schoolName} 선택과목 도우미`;
      ctx.fillText(wm, W - PAD - ctx.measureText(wm).width, cy + 14);

      const link = document.createElement("a");
      link.download = `${schoolData.schoolName}_로드맵_${cohort}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setToastMsg(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`저장 실패: ${msg.slice(0, 40)}`);
    }
  }, [
    cohort,
    cohortLabel,
    deptName,
    interestLabels,
    semesterConfigs,
    selections,
    gradeList,
    gradeTotals,
    grandTotal,
    showByGrade,
    schoolData,
    getSemesterCredits,
    showToast,
  ]);

  const backHref = deptName
    ? buildShareHref(basePath, "/recommend", { dept: deptName })
    : interests.length > 0
      ? buildShareHref(basePath, "/recommend", { interests: interests.join(",") })
      : buildShareHref(basePath, "/");

  if (!cohortData) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-muted-foreground mb-4">편제 정보를 찾을 수 없습니다</p>
        <Link href={buildShareHref(basePath, "/")}>
          <span className="text-sm font-medium text-[var(--primary)]">홈으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-safe">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href={backHref} className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">나의 수강 로드맵</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {deptName ? `${deptName} · ` : ""}
              {cohortLabel ? `${cohortLabel} · ` : ""}
              {schoolData.schoolName}
            </p>
          </div>
        </div>
      </header>

      {/* Sticky 학점 요약 바 */}
      <div className="sticky top-[49px] z-20 px-4 py-3 mt-1 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto max-w-lg flex items-center justify-center gap-4">
          {showByGrade ? (
            gradeList.map((grade) => {
              const gt = gradeTotals[grade];
              if (!gt) return null;
              const isComplete = gt.selected === gt.expected;
              return (
                <div
                  key={grade}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  <span className="font-semibold">고{grade}</span>
                  <span className="text-base font-bold">
                    {gt.selected}/{gt.expected}
                  </span>
                  <span>학점</span>
                  {isComplete && <span>{"✓"}</span>}
                </div>
              );
            })
          ) : (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                grandTotal.selected === grandTotal.expected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-muted/60 text-muted-foreground",
              )}
            >
              <span className="font-semibold">전체</span>
              <span className="text-base font-bold">
                {grandTotal.selected}/{grandTotal.expected}
              </span>
              <span>학점</span>
              {grandTotal.selected === grandTotal.expected && <span>{"✓"}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white">
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-3 pb-2">
          <div className="flex items-center gap-2 pb-1">
            <div>
              <p className="text-xs font-bold text-foreground">{schoolData.schoolName}</p>
              {cohortLabel && (
                <p className="text-[10px] text-muted-foreground">{cohortLabel} 수강 로드맵</p>
              )}
            </div>
          </div>

          {deptName && (
            <div className="flex items-center gap-2 bg-[var(--cta)]/10 rounded-xl px-4 py-3 border border-[var(--cta)]/20">
              <GraduationCap className="h-4 w-4 text-[var(--cta)]" />
              <span className="text-sm font-medium text-[var(--cta)]">
                {deptName} 추천 기반 로드맵
              </span>
            </div>
          )}

          {!deptName && interestLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-0.5">관심 분야:</span>
              {interestLabels.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="text-[10px] px-2 py-0 h-5 bg-[var(--cta)]/10 text-[var(--cta)] border-0"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            학교지정 과목은 자동으로 포함됩니다. 선택과목군에서 원하는 과목을 골라 나만의 커리큘럼을 완성하세요.
          </p>
        </div>

        <div className="mx-auto max-w-lg px-4 pt-1 space-y-5 pb-6">
          {semesterConfigs.map(({ grade, semester, label }) => {
            const designated = getDesignatedSubjects(schoolData, cohort, grade, semester);
            const groups = getSelectionGroups(schoolData, cohort, grade, semester);
            const credits = getSemesterCredits(grade, semester);

            return (
              <section
                key={`${grade}-${semester}`}
                className="rounded-xl border border-border/50 bg-card/60"
              >
                <div className="flex items-center gap-2 px-3 pb-2">
                  {grade <= minGrade ? (
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h2 className="text-sm font-bold text-foreground">{label}</h2>
                </div>

                <div className="space-y-3 px-3">
                  {designated.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        학교지정 과목
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {designated.map((d, idx) => (
                          <span
                            key={`${d.subject}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                          >
                            <span className="text-[11px]">
                              {expandSubjectNames(d.subject).join("/")}
                            </span>
                            <span className="text-[10px] opacity-60">{d.credits}학점</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {groups.map((group) => (
                    <Card key={group.id} className="border-border/50 shadow-none">
                      <CardContent className="p-3">
                        <SelectionGroup
                          group={group}
                          selected={selections[group.id] || []}
                          onToggle={(name) => handleToggle(group.id, group.choose, name)}
                          getSubjectByName={subjectCatalog.getSubjectByName}
                          basePath={basePath}
                          recommendedSubjects={recommendedNames}
                          conflictSubjects={getConflictsForGroup(group.id, grade, semester)}
                          detailReturnPath={detailReturnPath}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium",
                      credits.total === credits.totalExpected
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <span>학기 학점 합계</span>
                    <span>
                      {credits.total} / {credits.totalExpected}학점
                      {credits.total === credits.totalExpected && " ✓"}
                    </span>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 공유 / 이미지 저장 */}
      <div className="mx-auto max-w-lg px-4 pb-8 pt-2 flex gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm active:scale-[0.98] transition-transform"
        >
          <Share2 className="h-4 w-4" />
          공유하기
        </button>
        <button
          type="button"
          onClick={handleExportImage}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm active:scale-[0.98] transition-transform"
        >
          <Download className="h-4 w-4" />
          이미지 저장
        </button>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <RoadmapContent />
    </Suspense>
  );
}
