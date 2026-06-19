"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";

type UploadResponse = {
  reviewUrl?: string;
  error?: string;
};

const fallbackError = "업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

// 진행 단계와 각 단계가 끝나는 누적 예상 시간(초).
// 실측이 아니라 "멈춰있지 않다"는 진행감을 주기 위한 추정값입니다.
const PROGRESS_STEPS = [
  { label: "파서 서버 준비 중", until: 6 },
  { label: "문서 읽는 중", until: 15 },
  { label: "편제표 표 구조 분석 중", until: 35 },
  { label: "AI가 과목 정보를 정리하는 중", until: Infinity },
] as const;

// 진행바가 이 시간(초)에 걸쳐 약 95%까지 차오릅니다. 실제 완료 시 100%.
const EXPECTED_SECONDS = 55;

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

export default function CreatePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cohortMode, setCohortMode] = useState("auto");
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const errorId = "curriculum-upload-error";
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isUploading) {
      return;
    }

    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) {
        return;
      }

      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 250);

    return () => window.clearInterval(timer);
  }, [isUploading]);

  const activeStep = getActiveStepIndex(elapsed);
  const progress = done
    ? 100
    : Math.min(95, Math.round((1 - Math.exp(-elapsed / EXPECTED_SECONDS)) * 100));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) {
      return;
    }

    setError("");
    setDone(false);
    setElapsed(0);
    startedAtRef.current = Date.now();
    setIsUploading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/curricula/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await readUploadResponse(response);

      if (!response.ok) {
        setError(payload.error || fallbackError);
        setIsUploading(false);
        return;
      }

      if (!payload.reviewUrl) {
        setError(fallbackError);
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
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
            학교 편제표 업로드
          </h1>

          <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="school-name"
                  className="block text-sm font-semibold text-slate-800"
                >
                  학교명
                </label>
                <input
                  id="school-name"
                  name="schoolName"
                  type="text"
                  required
                  placeholder="예: 효자고등학교"
                  disabled={isUploading}
                  className="block w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="entrance-years"
                  className="block text-sm font-semibold text-slate-800"
                >
                  입학생 학년도
                </label>
                <input
                  id="entrance-years"
                  name="entranceYears"
                  type="text"
                  placeholder="예: 2025, 2026"
                  disabled={isUploading}
                  className="block w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800">편제 포함 범위</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ["auto", "자동 인식"],
                  ["single", "한 학년도"],
                  ["multiple", "여러 학년도"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-800"
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
            </fieldset>

            <div className="space-y-2">
              <label
                htmlFor="curriculum-file"
                className="block text-sm font-semibold text-slate-800"
              >
                편제표 파일
              </label>
              <input
                id="curriculum-file"
                name="file"
                type="file"
                required
                accept=".pdf,.hwp,.hwpx,.xlsx,.xlsm,.docx"
                disabled={isUploading}
                aria-describedby={error ? errorId : undefined}
                className="block w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              />
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {isUploading ? "분석 중" : "업로드하고 분석하기"}
            </button>
          </form>
        </div>
      </section>

      {isUploading ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              편제표를 분석하고 있어요
            </h2>

            <div className="mt-5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-sm font-semibold text-slate-700">
                {progress}%
              </p>
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
                        <Loader2
                          className="h-4 w-4 animate-spin text-[var(--primary)]"
                          aria-hidden="true"
                        />
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
