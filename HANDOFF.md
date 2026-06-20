# HANDOFF — 작업 인수인계

> 코덱스 ↔ Claude Code 공용 진행 상태 문서.
> **세션 시작 시 이 파일을 먼저 읽고**, **변화가 생길 때마다 즉시 갱신**한다.
> 안 변하는 규칙은 `AGENTS.md` 참고.

_최종 갱신: 2026-06-21 (Claude Code) — **효자고 풀 포팅 12단계 전부 완료 + 배포·검증 끝**_

**포팅 완료 (TaskList #1~12 전부 ✅)**: 게시 페이지(/s/[shareToken]/*)가 효자고 main과 동등.
- 게시 검증 완료: 의정부여고 게시본 `/s/cYrKU6tM1r2EYzxia3ubO_9T7YQkXF13`
- 메인(학교명·관심태그·학과검색, 단일cohort 토글숨김), 전시관(포스터 갤러리 76과목), 추천(3모드), 로드맵(택N·학점·추천배지·묶음과목) 전부 정상 동작 확인.
- 배포됨: https://generic-curriculum-assistant.vercel.app
- next build + tsc 통과, 콘솔 에러 0.

**진행 중: 편집(수정) 기능 설계·구현 (2026-06-21 착수)**

배경: PDF/HWP 파싱이 자주 틀린다. 사용자가 게시 전 직접 고칠 수 있어야 함. 실제 발견된 오류 케이스:
- (의정부여고 1학년) "정보↔한문"이 선택군으로 파싱됐는데 실제로는 **집중이수제**(1학기 정보 / 2학기 한문). 선택군 오인.
- (의정부여고 2학년) 여러 과목이 한 칸에 **뭉쳐서** 하나의 긴 과목명으로 파싱됨. 분리 필요.
- 읽어내지 못한 과목/선택군을 **직접 추가**해야 하는 경우도 있음.

현재 편집 화면 한계(`/review/{draftId}`, `/edit/{editToken}` → CurriculumReviewForm + ChoiceGroupEditor + SubjectEditor):
- ✅ 되는 것: 셀 값만 — 학교명/과목명/영역/학점/분류, 선택그룹명/택N
- ❌ 안 되는 것: 과목·선택군·학기 **추가/삭제**, 선택군↔지정 **전환**, 뭉친 과목명 **분리** ← 사용자 요구 전부 여기 해당

설계 결정 사항(사용자 답변 채울 것):
- [ ] CRUD 단위: 과목/선택군/학기 어디까지 추가·삭제 허용?
- [ ] 집중이수(↔) 처리: 데이터 모델에 집중이수 타입 추가 vs 학기별 지정과목으로 분해?
- [ ] 편집 시점: 게시 전 review만 vs 게시 후 editToken 재편집도?
- [ ] 파서 개선 vs 수동 수정 비중?
- [ ] 뭉친 과목명 분리 UX (구분자 입력? 줄바꿈 분리?)

**남은 잔여 작업(선택, 우선순위 낮음)**:
- 메인에 PortalActionCards 미추가(BottomNav 5탭으로 진입 가능).
- 전시관 hero가 effja 박람회 이미지 — 중립 이미지 교체 고려.
- university-requirements 16모집단위는 2025대입 스냅샷.
- roadmap: 선택군 있는 학기만 표시하도록 변경됨(getSelectionSemesterConfigs).

각 step 타입체크 통과 후 커밋. 효자고 원본은 `git show "origin/main:app/src/..."`로 읽음.

## 지금 작업 중인 것

generic-app(범용 교육과정 도우미) — 편제표 업로드 → 파싱 → AI 구조화 → 공유.
코드 작업 위치: worktree `generic-curriculum-assistant-impl`, 브랜치 `codex/generic-curriculum-assistant-clean`.

## 현재 상태: 전체 파이프라인 동작 ✅ (2026-06-20 end-to-end 검증 완료)

- `/create`에서 편제표 PDF 업로드 → 진행 UI(단계별 %) → `/review/{draftId}` 도착까지 정상.
- 파서: Render로 이전 완료 (Vercel 함수 50MB 한도 + kordoc OCR 의존성 447MB 문제 해결).
- 배포 주소: 앱 https://generic-curriculum-assistant.vercel.app / 파서 https://generic-curriculum-assistant.onrender.com
- Vercel 환경변수 전부 설정됨: PARSER_SERVICE_URL(Render), CURRICULUM_PARSER_PROVIDER=kordoc, CURRICULUM_STRUCTURER_PROVIDER=openai, OPENAI_API_KEY, DATABASE_URL(Supabase pooler).

## 진행 중: 효자고 풀 포팅 (2026-06-20 착수)

**목표**: generic 게시 페이지(`/s/[shareToken]/*`)를 효자고 **main 브랜치(전시관 버전)**와 동일한 UI/기능으로 만든다. 현재 generic은 효자고 축약판(recommend 880→151줄 등)이라 풀 포팅 필요.

**원본**: `origin/main`의 `app/` (전시관 exhibition 포함). worktree app/은 구버전이라 원본 아님.

**확정된 결정**:
- 전시관 포함 — 효자고 공통 포스터(`app/public/exhibition/posters/*`)를 모든 학교에 노출 (옵션 b)
- 공통 데이터(subjects/career-mapping/university-requirements/assessment/search-index) 전 학교 재사용 OK
- **단일 cohort 기준** — 범용은 보통 한 학년 편제만 업로드되므로, 효자고의 2025/2026 학년 토글을 단순화해 단일 학년으로 동작해야 함

**데이터 모델 호환 확인됨**: 효자고 `school.ts`(designated/selections) ↔ generic 파싱 schema(requiredSubjects/choiceGroups). school-adapter가 변환 담당.

**작업 단계(잠정)**: ① 공통 데이터 이전 → ② school-adapter 완성(파싱→SchoolData) → ③ 페이지 포팅(school import를 컨텍스트로) → ④ ~~챗봇~~ (**제외 확정**) → ⑤ 전시관 → ⑥ 단일 cohort 단순화 → ⑦ 검증

**챗봇은 구현하지 않음** (사용자 지시 2026-06-20). 진행은 Workflow 멀티에이전트 오케스트레이션으로 (ultracode).

### 분석 완료 — 통합 포팅 스펙 (워크플로 wf_0647f93c, 2026-06-20)

전체 스펙 원본: `.claude/.../tasks/wzgj9gqrb.output` (725줄 JSON). 핵심:

**구현 순서 (의존성 고려, 12단계)**:
1. 전국공통 데이터 4종 이식: career-mapping(.ts+.json), university-requirements(.ts+.json), search-index.ts, assessment.ts → generic/src/data. (subjects는 이미 복사됨. 단 effja subjects.ts의 additionalSubjects 공통과목 14개가 generic엔 빠짐 — subjects.json에 공통과목 있는지 검증 후 보강)
2. **school-adapter 보강(최다 의존·최고위험)**: `expandSubjectNames`(↔/슬래시 분해) 추가, adapt·getAllAvailableSubjectNames·subject-catalog seed에 적용. `isPublicStudentGrade(grade>=2)` 하드코딩 **제거**(결정: 편제 모든 학년 노출). isSubjectAvailable/getAvailableSubjects 동치헬퍼 추가.
3. 누락 ui 부품 복사: dialog/input/scroll-area/sheet/tabs
4. 공통 컴포넌트 포팅: SubjectCard, SelectionGroup (subjectCatalog 경유 + buildSubjectDetailHref 3인자화)
5. career-mapping/search-index의 getSubjectByName 의존부 subjectCatalog 인자화
6. subjects 목록/상세 포팅 (필터·7섹션 복원, 학교명/cohort 동적화)
7. recommend 재작성 (dept/interests/compare 3모드, 동적 order/minGrade)
8. roadmap 확장 (189→831줄: SelectionGroup/충돌감지/학점검증/canvas PNG/공유)
9. 포스터 자산 복사(공식 77개만, 학생제작物 제외) + exhibition-media 헬퍼
10. PortalActionCards + ExhibitionSubjectCard + 전시관 라우트 신설
11. cohort 토글 단일화(cohortOptions.length>1일 때만 노출)
12. 검증(단일+다중 cohort, 학교명/2025·2026 잔존 grep, 3모드+로드맵+전시관)

**확정 결정**:
- 노출 범위: **편제의 모든 학년·학기** (minGrade/grade>=2 하드코딩 제거)
- cohort 토글: 단일이면 숨김, 다중이면 노출 (데이터 손실 방지)
- 학교명/학번 라벨: 전부 `schoolData.schoolName` + `cohortLabel`(파싱 label)로 치환
- 전시관: 공식 포스터 77개만 전 학교 공유(옵션 b), 학생제작물·유튜브 영상 1차 제외, hero는 중립 이미지
- 공유링크: generic JSON base64url 방식 (effja 인덱스 인코딩 폐기)
- 핵심 함정: effja school.json은 'A↔B' 묶음 옵션 표기 → expandSubjectNames 없으면 개설판정 전부 실패

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
