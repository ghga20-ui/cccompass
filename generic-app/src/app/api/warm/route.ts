import { NextResponse } from "next/server";

// 업로드 페이지 진입 시 호출되어 Render 파서(무료티어, 15분 유휴 시 슬립)를 미리 깨운다.
// 깨우는 게 목적이므로 응답 내용/실패는 신경 쓰지 않고, 연결을 트리거하면 Render가 spin-up 시작.
export const maxDuration = 30;

export async function GET() {
  const url = process.env.PARSER_SERVICE_URL;

  if (!url) {
    return NextResponse.json({ ok: false, reason: "parser-url-missing" });
  }

  try {
    const base = new URL(url);
    base.pathname = "/"; // 루트로 핑 → 슬립한 서비스 spin-up 트리거
    const startedAt = Date.now();
    const res = await fetch(base, {
      method: "GET",
      signal: AbortSignal.timeout(25000),
    });
    return NextResponse.json({
      ok: true,
      status: res.status,
      ms: Date.now() - startedAt,
    });
  } catch {
    // 타임아웃/에러여도 연결 시도만으로 spin-up이 시작되므로 성공으로 간주.
    return NextResponse.json({ ok: true, warming: true });
  }
}
