# HANDOFF — 작업 인수인계

> 코덱스 ↔ Claude Code 공용 진행 상태 문서.
> **세션 시작 시 이 파일을 먼저 읽고**, **변화가 생길 때마다 즉시 갱신**한다.
> 안 변하는 규칙은 `AGENTS.md` 참고.

_최종 갱신: 2026-06-21 (Claude Code) — **효자고 풀 포팅(12단계) + 편집 기능(E1~E5) 전부 완료·배포·검증**_

**포팅 완료 (TaskList #1~12 전부 ✅)**: 게시 페이지(/s/[shareToken]/*)가 효자고 main과 동등.
- 게시 검증 완료: 의정부여고 게시본 `/s/cYrKU6tM1r2EYzxia3ubO_9T7YQkXF13`
- 메인(학교명·관심태그·학과검색, 단일cohort 토글숨김), 전시관(포스터 갤러리 76과목), 추천(3모드), 로드맵(택N·학점·추천배지·묶음과목) 전부 정상 동작 확인.
- 배포됨: https://generic-curriculum-assistant.vercel.app
- next build + tsc 통과, 콘솔 에러 0.

**편집(수정) 기능 완료 (2026-06-21, 편집 E1~E5 전부 ✅ 배포·E2E 검증)**

배경: PDF/HWP 파싱이 자주 틀려 사용자가 직접 고쳐야 함(선택군 오인, 과목명 뭉침, 미인식 과목).

확정 결정 & 구현:
- CRUD: 과목·선택군·선택군내옵션 추가/삭제 (학기/학년 구조는 고정). 스키마 변경 없음.
- 집중이수(정보↔한문 오인): "선택군 → 지정과목으로 전환" 버튼(convertGroupToRequired) — 옵션을 같은 학기 requiredSubjects로 옮기고 그룹 제거(credits 보충). 학기별 부적합은 삭제로 조정.
- 뭉친 과목명: "과목명 분리" 버튼(splitMergedSubjectName, 구분자 /,·・、줄바꿈). 자동 아님, 버튼 트리거.
- 게시 후 재편집: editToken으로 재진입(이미 백엔드 지원). 재게시 시 publish route revalidatePath(layout) + s/[shareToken] layout force-dynamic으로 라이브 즉시 반영. shareToken은 upsert update에서 유지.
- 구현 파일: lib/curriculum/factory.ts, split-subjects.ts(+테스트), components/curriculum/ChoiceGroupEditor.tsx, CurriculumReviewForm.tsx, api/.../publish/route.ts, s/[shareToken]/layout.tsx, published 페이지.
- 정책 변경(1학년 노출)으로 stale됐던 옛 효자고 테스트 6파일 새 정책에 맞게 갱신 → 전체 79개 테스트 통과.
- E2E 검증: 업로드→리뷰에서 선택군 "지정과목 전환"(9→8)→게시→학생 로드맵에 8개 반영 확인. force-dynamic 즉시 반영 OK.

**편집 화면 2차 재구성 완료 (2026-06-21, 편집 R1~R5, 배포·E2E 검증)**
사용자 피드백 4건 반영:
1. 레이아웃: 긴 스크롤 → **학년 탭 + 활성 학년 1·2학기 2열**(A안). 저장/게시 하단 sticky.
2. 집중이수(↔): SubjectRow에 "집중이수 N학기 배정" 버튼 — 1학기=앞 과목, 2학기=뒤 과목으로 해석(resolveConcentratedName). E2E: 정보↔한문 → 1학기 정보 확인.
3. 과목명 분리: 뭉친 과목은 **구분자가 없어** 자동분리 불가 → "과목 나누기" 버튼 → 여러 줄 textarea 수동 입력(parseManualSplit). E2E: 6개 분리 확인.
4. 입력 필드 정리: SubjectRow에서 **영역(area)·분류(category) 입력 제거**(과목명+학점만). 데이터값은 보존(DB 매칭으로 채워짐). SubjectEditor.tsx 삭제.
- 신규: SubjectRow.tsx. 테스트 84개 통과. 적대적 리뷰 워크플로 wf_1b5e35db 진행.

적대적 리뷰(wf_1b5e35db) 13개 확인 이슈 수정 완료(커밋됨):
- 저장/게시 전 `schoolCurriculumSchema.safeParse` 게이트 → raw 400 대신 한글 안내(빈 과목명/0학점/잘못된 선택수).
- choose 입력 정수화+clampGroup(floor), credits 입력 로컬문자열(빈칸 허용·양수만 반영·blur 복원), convertGroupToRequired 양수 가드+빈name 제외, SubjectRow stale split useEffect 리셋.
- 테스트 84개 통과, 배포 완료.

**파싱 견고성 테스트+개선 완료 (2026-06-21, T-A~T-E)**
실제 편제표 5종(한민고·현대청운고·의정부여고·효자고2종, data/parse-test/)으로 테스트.
- 하네스: data/parse-test/harness.mjs (worker kordoc + OpenAI structurer, results/에 v1/v2 저장). 측정: compare-v1-v2.mjs.
- 오류 분석(워크플로): 지배적 오류 = merged(과목명 뭉침)·wrong_choice(지정↔선택 혼동). 원인 다수가 kordoc 표추출에서 구분자 없이 글자 붙음.
- **파서 개선(배포됨)**: ① structurer 프롬프트 강화(분리/↔집중이수/지정vs선택/누락방지/category) ② post-process.ts 결정론적 후처리(마스터리스트 안전분리+공백정규화+중복선택군 제거).
- **효과(v1→v2)**: ↔집중이수 오류 16건→0건(완전 제거), 뭉침 한민고13→6(구형표 kordoc손상 잔여), 누락 회복(한민고 과목 287→379).
- **편집 검수 UI(배포됨, T-E)**: review-flags.ts(↔/뭉침의심/AI불확실 판정) → 상단 "확인 필요 N건" 배너 + 과목별 노란 ⚠️ 배지(평이한 한글 안내) + 학기별 학점합계 배너. 비개발자 친화. E2E 검증 완료.

**파싱 견고성 결론**: LLM 파싱은 임의 레이아웃에서 100% 무오류 불가. 3계층 방어(프롬프트→후처리→편집검수UI)로 대응. 잔여 오류는 검수 배지가 surface → 교사가 편집 도구로 교정.

**업로드 페이지(/create) 전면 개선 완료 (2026-06-22, U1, 배포·E2E)**
- 제목+설명+흐름표시(파일올리기→검토·수정→학생공유 3단계 칩)
- 드래그앤드롭 파일존(형식·용량 안내, 선택파일명·크기·변경·제거 버튼, 인라인 검증)
- 입학생 학년도·편제 포함 범위 → '고급 설정(선택)' 접기 + 평이한 헬프텍스트
- 필수(*) 표시, focus ring. 제출은 controlled state + 수동 FormData(드래그드롭 지원). 진행모달 유지. 기존 정체성(크림·블루) 유지.
- E2E: 파일선택 UI·고급설정 펼침·제출→review 이동 확인.

**브랜딩 + 안정화 완료 (2026-06-22)**:
- 서비스명 **과목나침반** 확정. SVG 나침반 로고(`components/Logo.tsx`의 CompassMark/BrandLogo) + 파비콘(`app/icon.svg`). 메타데이터/랜딩/푸터/create헤더/로드맵워터마크 반영. (이름 임시 — 나중에 바꿔도 됨)
- structurer(OpenAI) 일시 실패 → upload route에 **자동 재시도 3회(지수 백오프)** 적용(해결). 테스트 90개 통과.
- /create에 '되도록 한 학년도 입학생 편제표만 올리세요(예: 2026학년도 입학생 편제표)' 권장 안내 추가.
- 랜딩 옛 문구(2·3학년/효자고) 정리.

**파서 마스터리스트 확충 불필요(사용자 확인)**: 한민고 2023/24 입학생 파싱 약점은 2015 개정(구 과목명) 표를 테스트에 넣어서 생긴 것. 실서비스 대상은 2022 개정이라 현 subjects.json으로 충분. kordoc 표추출 자체 개선은 외부 라이브러리라 통제 불가 → 후처리/편집UI로 커버하는 현 방침 유지.

**남은 잔여 작업(선택, 우선순위 낮음)**:
- structurer 자동 재시도(위 알려진 이슈).
- 수동분리는 area/credits를 각 분리결과에 복제 → 사용자가 학점 재조정 필요(설계 의도).
- 원문(kordoc) 대조 패널, 미게시 변경 배지는 미적용.
- 파서: kordoc 표추출 자체 개선(구형표 글자붙음)은 별도 과제.
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
