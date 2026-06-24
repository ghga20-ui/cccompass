import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { CompassMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { MockScreenProps } from "../types";
import { hot, hotClass } from "./_shared";

/* 1) 랜딩 ----------------------------------------------------------------- */
export function LandingScreen(p: MockScreenProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <span
        {...hot("logoWordmark", p)}
        className="inline-flex items-center gap-2"
      >
        <CompassMark className="h-7 w-7 text-[var(--primary)]" />
        <span className="text-lg font-bold">커리컴퍼스</span>
      </span>
      <p className="mt-6 text-xs font-semibold text-[var(--primary)]">
        학교 편제표 업로드 기반
      </p>
      <h2
        {...hot("heroHeadline", p)}
        className="mt-2 text-lg font-bold leading-snug sm:text-xl"
      >
        편제표 한 장으로,
        <br />
        진로 맞춤 추천과 3년 로드맵을 제공합니다
      </h2>
      <button
        {...hot("startCtaBtn", p)}
        className={cn(
          "mt-6 inline-flex items-center justify-center rounded-lg bg-[var(--cta)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm",
          hotClass("startCtaBtn", p),
        )}
      >
        편제표 올리고 시작하기
      </button>
      <p
        {...hot("fileTypesHint", p)}
        className="mt-3 text-xs font-medium text-slate-500"
      >
        PDF · HWP · HWPX · 엑셀 · 워드 · 5MB
      </p>
    </div>
  );
}

/* 2) 업로드 (createEmpty / createFilled) --------------------------------- */
export function CreateScreen(p: MockScreenProps) {
  const filled = p.screen === "createFilled" || p.ui.fileChip === true;
  const flow = ["파일 올리기", "검토·수정", "학생에게 공유"];
  return (
    <div className="mx-auto max-w-md">
      <div
        {...hot("stepIndicator", p)}
        className="flex items-center justify-center gap-2"
      >
        {flow.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                i === 0
                  ? "bg-[var(--primary)] text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}. {label}
            </span>
            {i < flow.length - 1 && <span className="text-muted-foreground">›</span>}
          </span>
        ))}
      </div>

      <label className="mt-5 block text-xs font-semibold text-slate-700">
        학교명
      </label>
      <div
        {...hot(filled ? "schoolNameFilled" : "schoolNameInput", p)}
        className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-sm"
      >
        {filled ? (
          <span className="text-foreground">효자고등학교</span>
        ) : (
          <span className="text-muted-foreground">학교명을 입력하세요</span>
        )}
      </div>

      <div
        {...hot(filled ? "dropzoneFilled" : "dropzone", p)}
        className={cn(
          "mt-4 rounded-xl border-2 border-dashed p-5 text-center transition-colors",
          filled
            ? "border-[var(--primary)]/40 bg-[var(--secondary)]"
            : "border-border bg-white",
          hotClass(filled ? "dropzoneFilled" : "dropzone", p),
        )}
      >
        {filled ? (
          <span
            {...hot("fileChip", p)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            효자고_2026_편제표.hwpx
            <span className="text-xs text-muted-foreground">· 1.2MB</span>
          </span>
        ) : (
          <>
            <Upload className="mx-auto h-6 w-6 text-[var(--primary)]" />
            <p className="mt-2 text-sm font-medium text-foreground">
              편제표를 끌어다 놓거나 눌러서 선택
            </p>
            <p
              {...hot("oneCohortTip", p)}
              className="mt-1 text-xs text-muted-foreground"
            >
              한 학년도 입학생 편제표를 올리면 가장 정확해요
            </p>
          </>
        )}
      </div>

      <div
        {...hot("advancedToggle", p)}
        className="mt-3 flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-slate-600"
      >
        고급 설정 (입학연도 · 코호트)
        <ChevronDown className="h-4 w-4" />
      </div>

      <div
        {...hot("uploadBtn", p)}
        className={cn(
          "mt-4 rounded-lg py-2.5 text-center text-sm font-semibold text-white",
          filled
            ? cn("bg-[var(--cta)] shadow-sm", hotClass("uploadBtn", p))
            : "bg-muted text-muted-foreground",
        )}
      >
        업로드하고 분석하기
      </div>
    </div>
  );
}

/* 3) 진행 모달 ----------------------------------------------------------- */
export function ProgressModalScreen(p: MockScreenProps) {
  const steps = [
    { label: "파서 서버 준비", done: true },
    { label: "문서 읽는 중", done: true },
    { label: "표 구조 분석", done: false, active: true },
    { label: "AI가 과목 정리", done: false },
  ];
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-bold">편제표를 분석하고 있어요</p>
      <div
        {...hot("progressBar", p)}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full w-3/5 rounded-full bg-[var(--primary)]" />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            {s.done ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : s.active ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-border" />
            )}
            <span
              className={cn(
                s.done || s.active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        약 55초 걸려요 · 끝나면 검토 화면으로 이동합니다
      </p>
    </div>
  );
}

/* 4) 검토 (reviewBanner / reviewDesignated / reviewSelectionGroup / reviewActions) */
export function ReviewScreen(p: MockScreenProps) {
  const view = p.screen;
  const activeGrade =
    view === "reviewDesignated" || view === "reviewSelectionGroup" ? 2 : 1;

  return (
    <div className="mx-auto max-w-md">
      <p className="text-xs font-semibold text-[var(--primary)]">교육과정 검토</p>
      <div
        {...hot("schoolNameField", p)}
        className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium"
      >
        효자고등학교
      </div>

      {/* 학년 탭 */}
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3].map((g) => (
          <span
            key={g}
            {...hot(`gradeTab${g}`, p)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition-colors",
              g === activeGrade
                ? "bg-[var(--primary)] text-white"
                : "bg-muted text-muted-foreground",
              hotClass(`gradeTab${g}`, p),
            )}
          >
            {g}학년
          </span>
        ))}
      </div>

      {view === "reviewBanner" && (
        <>
          <div
            {...hot("checkBanner", p)}
            className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            확인이 필요한 항목이 7개 있어요
          </div>
          <div
            {...hot("semester1Card", p)}
            className="mt-3 rounded-xl border border-border bg-white p-3"
          >
            <p className="text-xs font-semibold text-slate-500">1학년 1학기</p>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>국어</span>
                <span className="text-muted-foreground">4학점</span>
              </div>
              <div className="flex justify-between">
                <span>통합사회</span>
                <span className="text-muted-foreground">3학점</span>
              </div>
            </div>
          </div>
        </>
      )}

      {view === "reviewDesignated" && (
        <>
          <p
            {...hot("designatedHeading", p)}
            className="mt-3 text-xs font-semibold text-slate-500"
          >
            지정 과목 · 2학년 1학기
          </p>
          <div className="mt-2 space-y-2">
            <SubjectRow name="확률과 통계" credit="4" />
            <div
              {...hot("flaggedRow", p)}
              className="rounded-lg border border-amber-300 bg-amber-50 p-2"
            >
              <div className="flex items-center gap-2">
                <input
                  {...hot("subjectNameField", p)}
                  readOnly
                  value="스포츠 문화*"
                  className="min-w-0 flex-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm"
                />
                <span className="rounded-md border border-border bg-white px-2 py-1 text-sm text-muted-foreground">
                  2
                </span>
                <span className="text-[11px] text-slate-400">학점</span>
                <button
                  {...hot("deleteBtn", p)}
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-100/70 px-2 py-1 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <b>미확인 과목</b> · 2022 보통교과 목록에 없어요. 표준 과목명으로
                  고치면 학생 화면 추천에 반영돼요. (오타·고시외·전문교과일 수 있어요)
                </span>
              </div>
            </div>
          </div>
          <button
            {...hot("addDesignatedBtn", p)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
          >
            <Plus className="h-3 w-3" /> 지정 과목 추가
          </button>
        </>
      )}

      {view === "reviewSelectionGroup" && (
        <>
          <p
            {...hot("selectionGroupHeading", p)}
            className="mt-3 text-xs font-semibold text-slate-500"
          >
            선택 과목군 · 2학년 1학기
          </p>
          <button
            {...hot("addGroupBtn", p)}
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--primary)]/40 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--primary)]",
              hotClass("addGroupBtn", p),
            )}
          >
            <Plus className="h-4 w-4" /> 선택군 추가
          </button>
          <div
            {...hot("groupSubjectList", p)}
            className="mt-3 overflow-hidden rounded-xl border-2 border-[var(--primary)]/40 bg-[var(--secondary)]/40 shadow-sm"
          >
            {/* 헤더 바 — 선택군 구분 + 택N(범위) + 과목당 학점 */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--primary)]/15 bg-[var(--secondary)] px-2.5 py-1.5">
              <span className="text-xs font-bold text-[var(--primary)]">선택 그룹 1</span>
              <span
                {...hot("pickNControl", p)}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)] ring-1 ring-[var(--primary)]/20"
              >
                택1~2
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                과목당 3학점
              </span>
            </div>
            <div className="p-2.5">
              <input
                {...hot("groupNameField", p)}
                readOnly
                value="제2외국어 선택"
                className="w-full rounded-md border border-border bg-white px-2 py-1 text-sm font-medium"
              />
              <div className="mt-2 space-y-1 text-sm text-foreground">
                <div className="rounded-md border border-border bg-white px-2 py-1">일본어</div>
                <div className="rounded-md border border-border bg-white px-2 py-1">중국어</div>
                <div className="rounded-md border border-border bg-white px-2 py-1">한문</div>
              </div>
            </div>
          </div>
          {/* 집중이수 안내 */}
          <div
            {...hot("intensiveSwap", p)}
            className="mt-2 flex items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-[11px] leading-relaxed text-slate-600"
          >
            <ArrowLeftRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--primary)]" />
            <span>
              <b>집중이수</b> — ‘정보↔한문’처럼 학기를 번갈아 여는 과목은 칩으로 이 학기 과목을
              고르고, ↔ 표시가 없으면 ‘집중이수 묶기’로 1·2학기 과목을 묶어요.
            </span>
          </div>
        </>
      )}

      {view === "reviewActions" && (
        <div className="mt-6 flex items-center gap-2">
          <button
            {...hot("saveBtn", p)}
            className="flex-1 rounded-lg border border-border bg-white py-2.5 text-sm font-semibold text-foreground"
          >
            <Save className="mr-1 inline h-4 w-4" /> 저장
          </button>
          <button
            {...hot("publishBtn", p)}
            className={cn(
              "flex-1 rounded-lg bg-[var(--cta)] py-2.5 text-sm font-semibold text-white shadow-sm",
              hotClass("publishBtn", p),
            )}
          >
            <Send className="mr-1 inline h-4 w-4" /> 게시
          </button>
        </div>
      )}
    </div>
  );
}

function SubjectRow({ name, credit }: { name: string; credit: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-2">
      <span className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm">
        {name}
      </span>
      <span className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
        {credit}
      </span>
    </div>
  );
}

/* 5) 공유 링크 ----------------------------------------------------------- */
export function ShareScreen(p: MockScreenProps) {
  const copied = p.ui.linkCopied === true;
  return (
    <div className="mx-auto max-w-sm text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-6 w-6 text-emerald-600" />
      </span>
      <h2 {...hot("publishedTitle", p)} className="mt-3 text-base font-bold">
        학생 안내 페이지가 만들어졌어요
      </h2>
      <div
        {...hot("shareLinkField", p)}
        className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
          gwamok.app/s/hyoja-2026
        </span>
      </div>
      <button
        {...hot("copyLinkBtn", p)}
        className={cn(
          "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cta)] py-2.5 text-sm font-semibold text-white shadow-sm",
          hotClass("copyLinkBtn", p),
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> 복사됨
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> 링크 복사
          </>
        )}
      </button>
      <span
        {...hot("previewStudentLink", p)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
      >
        <ExternalLink className="h-3 w-3" /> 학생 화면 미리보기
      </span>
    </div>
  );
}
