# HANDOFF — 작업 인수인계

> 코덱스 ↔ Claude Code 공용 진행 상태 문서.
> **세션 시작 시 이 파일을 먼저 읽고**, **변화가 생길 때마다 즉시 갱신**한다.
> 안 변하는 규칙은 `AGENTS.md` 참고.

_최종 갱신: 2026-06-20 (Claude Code)_

## 지금 작업 중인 것

generic-app(범용 교육과정 도우미) — 편제표 업로드 → 파싱 → AI 구조화 → 공유.
코드 작업 위치: worktree `generic-curriculum-assistant-impl`, 브랜치 `codex/generic-curriculum-assistant-clean`.

## 현재 상태: 전체 파이프라인 동작 ✅ (2026-06-20 end-to-end 검증 완료)

- `/create`에서 편제표 PDF 업로드 → 진행 UI(단계별 %) → `/review/{draftId}` 도착까지 정상.
- 파서: Render로 이전 완료 (Vercel 함수 50MB 한도 + kordoc OCR 의존성 447MB 문제 해결).
- 배포 주소: 앱 https://generic-curriculum-assistant.vercel.app / 파서 https://generic-curriculum-assistant.onrender.com
- Vercel 환경변수 전부 설정됨: PARSER_SERVICE_URL(Render), CURRICULUM_PARSER_PROVIDER=kordoc, CURRICULUM_STRUCTURER_PROVIDER=openai, OPENAI_API_KEY, DATABASE_URL(Supabase pooler).

## 다음 할 일 (TODO)

- [ ] **cold start 방지 ping** — Render 무료 티어가 15분 미사용 시 슬림. GitHub Actions cron으로 14분마다 `/health` 핑해서 상시 가동(무료 750시간 내). _사용자가 "나중에 반영하자, 잊지마"라고 명시한 항목._
- [ ] **보안: 키/비번 회전** — OpenAI 키, Supabase DB 비번, Vercel 토큰이 세션 로그(.jsonl)에 평문 노출됨. 재발급 권장.

## 함정 / 주의사항

- **Vercel 환경변수는 Bash `printf`로 설정**. PowerShell 파이프는 BOM/CRLF 오염 → 502/500. (AGENTS.md 참고)
- parser-worker는 Render에서 돌리므로 Vercel 함수 크기 문제는 더 이상 없음. (kordoc optionalDependencies 건드릴 필요 없음)
- upload 라우트 maxDuration=300 (gpt-5.5 구조화가 느려서 60초로는 504남).
- 작은 편제표(수 페이지)는 파싱 ~5초, 큰 안내서(400p)는 ~80초 걸림.

## 최근 커밋 (codex/generic-curriculum-assistant-clean)

- `fix(upload)`: maxDuration 300 + DB 저장 에러 처리
- `feat(create)`: 편제표 분석 진행상황 UI
- `feat(parser)`: Render 배포 설정(render.yaml) + Node 22
