"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/Logo";

type UploadResponse = {
  reviewUrl?: string;
  error?: string;
};

const fallbackError = "업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const ALLOWED_EXTENSIONS = [".pdf", ".hwp", ".hwpx", ".xlsx", ".xlsm", ".docx"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// 진행 단계와 각 단계가 끝나는 누적 예상 시간(초). 진행감을 주기 위한 추정값.
const PROGRESS_STEPS = [
  { label: "파서 서버 준비 중", until: 6 },
  { label: "문서 읽는 중", until: 15 },
  { label: "편제표 표 구조 분석 중", until: 35 },
  { label: "AI가 과목 정보를 정리하는 중", until: Infinity },
] as const;

const EXPECTED_SECONDS = 55;

// 업로드 → 검토·수정 → 게시 (실제 3단계 흐름)
const FLOW = ["파일 올리기", "검토·수정", "학생에게 공유"] as const;

async function readUploadResponse(response: Response): Promise<UploadResponse> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      return payload as UploadResponse;
    }
  } catch {
    return {};
  }
  return {};
}

function getActiveStepIndex(elapsedSeconds: number) {
  const index = PROGRESS_STEPS.findIndex((step) => elapsedSeconds < step.until);
  return index === -1 ? PROGRESS_STEPS.length - 1 : index;
}

function getExtension(fileName: string) {
  const start = fileName.lastIndexOf(".");
  return start === -1 ? "" : fileName.slice(start).toLowerCase();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function CreatePage() {
  const [schoolName, setSchoolName] = useState("");
  const [entranceYears, setEntranceYears] = useState("");
  const [cohortMode, setCohortMode] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const errorId = "curriculum-upload-error";

  // 페이지 진입 시 Render 파서를 미리 깨운다(콜드스타트 완화, fire-and-forget).
  useEffect(() => {
    fetch("/api/warm").catch(() => {});
  }, []);

  useEffect(() => {
    if (!isUploading) return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 250);
    return () => window.clearInterval(timer);
  }, [isUploading]);

  const activeStep = getActiveStepIndex(elapsed);
  const progress = done
    ? 100
    : Math.min(95, Math.round((1 - Math.exp(-elapsed / EXPECTED_SECONDS)) * 100));

  function acceptFile(next: File | null) {
    if (!next) return;
    const extension = getExtension(next.name);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setFileError("지원하지 않는 형식이에요. PDF·HWP·HWPX·엑셀·워드 파일만 올릴 수 있어요.");
      return;
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setFileError("파일이 너무 커요. 5MB 이하 파일만 올릴 수 있어요.");
      return;
    }
    setFileError("");
    setFile(next);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) return;

    if (!schoolName.trim()) {
      setError("학교명을 입력해 주세요.");
      return;
    }
    if (!file) {
      setFileError("편제표 파일을 올려 주세요.");
      return;
    }

    setError("");
    setDone(false);
    setElapsed(0);
    startedAtRef.current = Date.now();
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("schoolName", schoolName);
      formData.set("entranceYears", entranceYears);
      formData.set("cohortMode", cohortMode);
      formData.set("file", file);

      const response = await fetch("/api/curricula/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await readUploadResponse(response);

      if (!response.ok || !payload.reviewUrl) {
        setError(payload.error || fallbackError);
        setIsUploading(false);
        return;
      }

      setDone(true);
      window.location.href = payload.reviewUrl;
    } catch {
      setError(fallbackError);
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8 sm:py-12">
        {/* Header */}
        <Link href="/" className="inline-flex">
          <BrandLogo size="lg" />
        </Link>
        <h1 className="mt-7 text-3xl font-bold tracking-normal sm:text-4xl">
          학교 편제표 업로드
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          편제표 파일을 올리면 과목·학점·선택과목군을 자동으로 정리해 드려요. 정리된
          내용을 검토·수정한 뒤 게시하면, 학생들이 쓰는 선택과목 안내 페이지가
          만들어집니다.
        </p>

        {/* Flow steps */}
        <ol className="mt-6 flex items-center gap-2 text-xs font-medium sm:text-sm">
          {FLOW.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  index === 0
                    ? "flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-white"
                    : "flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-[var(--border)]"
                }
              >
                <span
                  className={
                    index === 0
                      ? "flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]"
                      : "flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500"
                  }
                >
                  {index + 1}
                </span>
                {label}
              </span>
              {index < FLOW.length - 1 ? (
                <span className="text-slate-300" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-[var(--border)] bg-white/70 p-6 shadow-sm sm:p-8"
        >
          {/* 학교명 */}
          <div className="space-y-2">
            <label htmlFor="school-name" className="block text-sm font-semibold text-slate-800">
              학교명 <span className="text-red-500">*</span>
            </label>
            <input
              id="school-name"
              type="text"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              required
              placeholder="예: 효자고등학교"
              disabled={isUploading}
              className="block w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          {/* 파일 (드래그앤드롭) */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-slate-800">
              편제표 파일 <span className="text-red-500">*</span>
            </span>

            <input
              ref={inputRef}
              id="curriculum-file"
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              disabled={isUploading}
              onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />

            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                <FileText className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isUploading}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={isUploading}
                  aria-label="선택한 파일 제거"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openFilePicker();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isUploading) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  if (!isUploading) acceptFile(event.dataTransfer.files?.[0] ?? null);
                }}
                aria-label="편제표 파일을 끌어다 놓거나 눌러서 선택"
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragActive
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-white hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
                } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <Upload className="h-7 w-7 text-[var(--primary)]" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-700">
                  여기로 파일을 끌어다 놓거나, 눌러서 선택하세요
                </span>
                <span className="text-xs text-slate-400">
                  PDF · HWP · HWPX · 엑셀 · 워드 · 최대 5MB
                </span>
              </div>
            )}

            {fileError ? (
              <p role="alert" className="text-xs text-red-600">
                {fileError}
              </p>
            ) : null}

            <p className="flex items-start gap-1.5 rounded-md bg-[var(--primary)]/5 px-3 py-2 text-xs leading-relaxed text-slate-600">
              <span aria-hidden="true">💡</span>
              <span>
                되도록 <b>한 학년도 입학생 편제표</b>만 올려 주세요. (예: &lsquo;2026학년도
                입학생 교육과정 편제표&rsquo;) 여러 학년도가 한 파일에 섞여 있으면 정확도가
                떨어질 수 있어요.
              </span>
            </p>
          </div>

          {/* 고급 설정 (접힘) */}
          <div className="rounded-xl border border-[var(--border)] bg-white">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-slate-800">
                고급 설정 <span className="font-normal text-slate-400">(선택 · 대부분 그대로 두셔도 돼요)</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {advancedOpen ? (
              <div className="space-y-5 border-t border-[var(--border)] px-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="entrance-years" className="block text-sm font-medium text-slate-800">
                    입학생 학년도
                  </label>
                  <input
                    id="entrance-years"
                    type="text"
                    value={entranceYears}
                    onChange={(event) => setEntranceYears(event.target.value)}
                    placeholder="예: 2025, 2026"
                    disabled={isUploading}
                    className="block w-full rounded-md border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-70"
                  />
                  <p className="text-xs text-slate-500">
                    특정 입학연도만 콕 집어 인식시키고 싶을 때 입력하세요. 비워두면 AI가
                    파일에서 자동으로 찾아요.
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-800">편제 포함 범위</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["auto", "자동 인식"],
                      ["single", "한 학년도"],
                      ["multiple", "여러 학년도"],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition ${
                          cohortMode === value
                            ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                            : "border-[var(--border)] bg-white text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cohortMode"
                          value={value}
                          checked={cohortMode === value}
                          onChange={() => setCohortMode(value)}
                          disabled={isUploading}
                          className="h-4 w-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    여러 입학연도가 한 파일에 들어 있으면 &lsquo;여러 학년도&rsquo;를,
                    한 학년만 있으면 &lsquo;한 학년도&rsquo;를 고르세요. 잘 모르겠으면
                    &lsquo;자동 인식&rsquo;으로 두면 돼요.
                  </p>
                </fieldset>
              </div>
            ) : null}
          </div>

          {error ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isUploading}
            aria-busy={isUploading}
            aria-describedby={error ? errorId : undefined}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {isUploading ? "분석 중" : "업로드하고 분석하기"}
          </button>
        </form>
      </section>

      {isUploading ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">편제표를 분석하고 있어요</h2>

            <div className="mt-5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-sm font-semibold text-slate-700">{progress}%</p>
            </div>

            <ul className="mt-5 space-y-3">
              {PROGRESS_STEPS.map((step, index) => {
                const isComplete = done || index < activeStep;
                const isActive = !done && index === activeStep;
                return (
                  <li key={step.label} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isComplete ? (
                        <Check className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" aria-hidden="true" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <span
                      className={
                        isComplete
                          ? "text-slate-500 line-through decoration-slate-300"
                          : isActive
                            ? "font-semibold text-slate-900"
                            : "text-slate-400"
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 text-xs text-slate-400">
              경과 {Math.floor(elapsed)}초 · 보통 1분 내외 걸려요. 처음 업로드는 서버를
              깨우느라 조금 더 걸릴 수 있어요.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
