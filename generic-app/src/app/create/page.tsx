"use client";

import { FormEvent, useState } from "react";
import { Upload } from "lucide-react";

type UploadResponse = {
  reviewUrl?: string;
  error?: string;
};

const fallbackError = "업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

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

export default function CreatePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cohortMode, setCohortMode] = useState("auto");
  const errorId = "curriculum-upload-error";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) {
      return;
    }

    setError("");
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
    </main>
  );
}
