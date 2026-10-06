import { NextResponse } from "next/server";
import { checkParserReadiness, ParserServiceError } from "@/lib/parser/service-readiness";

// Cold starts may exceed the parser's processing timeout. This read-only phase
// gets a separate bounded budget and never submits the document or calls AI.
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await checkParserReadiness(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ParserServiceError ? error.status : 503;
    const code = error instanceof ParserServiceError ? error.code : "parser-not-ready";
    return NextResponse.json({ ok: false, ready: false, code }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
