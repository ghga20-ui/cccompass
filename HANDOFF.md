# HANDOFF — 작업 인수인계

> 코덱스 ↔ Claude Code 공용 진행 상태 문서.
> **세션 시작 시 이 파일을 먼저 읽고**, **변화가 생길 때마다 즉시 갱신**한다.
> 안 변하는 규칙은 `AGENTS.md` 참고.

**전문교과 추천 보정 (2026-07-09, 서브에이전트 sonnet 7태스크)**
- 문제: `프로그래밍` 같은 전문교과는 일반계고가 개설해도 추천에서 항상 탈락. 원인은 category 필터가 아니라 **추천 후보 목록(career-mapping.json 108과목)에 이름이 없어서**. 전문교과 263개 중 그 목록에 든 건 3개(문학 감상과 비평·문학과 매체·정보과학)뿐. 대교협 자료도 대입 반영과목(보통교과) 안내라 전문교과 미수록 — **자료에 없다 ≠ 권장 안 함**.
- 해법: 새 데이터 없이 기존 `professionalArea`(22계열) 활용. `lib/professional-subjects.ts`(순수, JSON import 금지) — `AREA_TO_TAGS`+`SUBJECT_OVERRIDES`+`resolveTagsForProfessional`. 모호한 area(예술계열 62과목=음악·미술·무용·연극·영화·사진·문예 혼재, 미용·관광·레저, 전문공통)는 **기본값 빈 배열**로 두고 오버라이드로만 채움(오추천 방지, 미분류는 현 동작과 동일 → 회귀 없음). `data/professional-subjects.ts` — `getProfessionalSubjectsForTags(tags)`(개설 필터는 호출자 책임).
- `프로그래밍` 오버라이드는 area(`cs-ai`)를 넓혀 `mechanical-elec` 추가 → 기계공학과 계열별 추천에도 노출.
- 추천 화면: 두 플로우(Dept/Interest)에 **학교 개설분만** 합류(미개설은 미개설 아코디언에도 안 넣음), 「전문교과」 라벨 + "우리 학교 개설 · X 계열", 보통교과 먼저 안정 정렬. 로드맵은 `buildRecommendedNames(+FromDept)`만 수정, **커버리지 게이지 불변(36% 확인)**.
- **`professionalOffered` prop 필요 이유**: `정보과학`은 전문교과이면서 career-mapping에도 있어 미개설 시 아코디언에 렌더됨 → 카드가 subject만 보고 "우리 학교 개설"을 찍으면 거짓 문구. 개설 여부를 호출자가 명시 전달.
- **리뷰가 잡은 버그**: 라벨 `{professionalArea} 계열`이 `계열`로 끝나는 area 5종(과학/예술/체육/외국어/국제)에서 "과학계열 계열" 중복 → `endsWith` 분기로 수정(계획서 예시 코드의 결함).
- FAQ 항목 1개 + `RecommendBasisNote` 문단 추가(양쪽 앱): 대교협 자료 범위와 전문교과 추천의 두 근거를 명시, 대입 반영 주장 안 함.
- 검증: 효자고 빌드+테스트 15/15, 라이브 확인(추천 배지 없음·라벨 정상·중복 없음·미개설 누출 없음·게이지 36%). 커리컴퍼스 빌드 통과, 배포 번들에 라벨 로직 확인. **의정부여고는 편제에 전문교과가 없어 미노출되는 것이 정상 동작.**
- **최종 리뷰가 잡은 Important**: 인라인 근거 문구가 "「전문교과」 라벨이 붙은 과목은 우리 학교가 개설한 전문교과"라고 단언했는데 거짓. `SubjectCard`는 개설 여부와 무관하게 라벨을 그리고("우리 학교 개설 ·" 접두어만 `professionalOffered`로 게이팅), `정보과학`·`문학 감상과 비평`·`문학과 매체`는 career-mapping에도 있어 미개설 시 아코디언에 라벨과 함께 렌더됨(효자고 실제 사례). → 문구를 "라벨은 전문교과라는 표시 / 학기별 목록에 뜬 것은 개설 과목"으로 정확화(양쪽 앱, `cc80eb2`·`e31c373`). **카드는 원래 정직했고 설명문만 과잉주장이었음.**
- 커밋/배포: 효자고 `872f526..cc80eb2`(codex) → main 머지 `369021f`. 커리컴퍼스 clean `e31c373`. 스펙 `docs/superpowers/specs/2026-07-09-...-design.md`, 플랜 `docs/superpowers/plans/2026-07-09-...md`.
- 검증 스크립트 주의: `RecommendBasisNote`는 `{open && ...}` 접이식이라 **curl로 안 잡힘**. 배지·라벨도 하이드레이션 후 클라이언트 렌더. 라이브 확인은 반드시 Playwright로 접이식을 열고 볼 것.
**학과 추천에서 트랙(계열) 과목 병합 제거 (2026-07-10)**
- **원인**: `career-mapping.json`의 `track.recommendedSubjects`는 **그 트랙에 속한 형제 학과들의 합집합**이다. `search-index.ts`의 `getDepartmentRecommendation`이 이걸 학과 목록에 `mergeUnique`로 병합하고 있어서, 학과가 형제 학과의 과목을 통째로 받았다.
  - 예: 「교육 계열」 트랙 = 언어/사회/수학/과학/교육학/초등/유아 교육과 → **수학교육과가 「윤리와 사상」·「세계사」·「정치」·「법과 사회」(사회 교과 교육과), 「생물의 유전」·「세포와 물질대사」(과학 교과 교육과), 「제2외국어」·「한문」(언어 교과 교육과)를 추천받음.**
  - 「기계·전기·전자 계열」 → 기계공학과가 「지구과학」·「지구시스템과학」·「행성우주과학」을 받음.
  - 규모: 119개 학과 평균 **+9.5과목**(최대 +34). 트랙이 응집적인 계열(IT·간호)은 영향 미미, 이질적인 교육 계열이 최악.
- **안전망**: 병합 아래의 university-requirements 보강(`uniScores >= 3`)이 대입 근거 있는 과목을 다시 채운다. 실제로 수학교육과의 「역학과 에너지」·「전자기와 양자」는 학과 목록에 없지만 병합 제거 후에도 남았다. **사라지는 것은 근거 없는 계열 뭉뚱그리기뿐.**
- 전후 대조(라이브 vs 로컬, Playwright): 수학교육과 31→16, 기계공학과 23→17, 컴퓨터공학과 22→21(경제 수학만), 간호학과 20→18. **과목이 늘어난 학과는 없음.**
- `JsonTrack.recommendedSubjects` 인터페이스 필드도 제거(사용처 없음). JSON 데이터는 그대로 두었고 `career-mapping.ts`의 `buildCareerGroupsFromJson`은 계속 사용한다.
- 라이브 검증: 효자고 수학교육과 16과목·형제학과 과목 0·대교협 보강 유지, 커리컴퍼스 18과목·형제학과 과목 0.
- 커밋: 효자고 `b6597c0` → main `b4409b5`. 커리컴퍼스 clean `e320450`.
- ⚠️ 이 변경은 원래 `search-index.ts`에 **커밋 안 된 작업 중 수정**으로 남아 있던 것을 검증 후 채택한 것이다. (2026-07-10 세션에서 발견)
- **검증 함정**: `/recommend` 카드는 클라이언트 렌더라 `curl | grep`으로는 항상 0건이 나온다. 반드시 Playwright로 볼 것. 또 폴링을 자주 하면 Vercel Security Checkpoint에 걸린다.

**추천 목록 구성 로직 순수 모듈화 (2026-07-10)**
- 배경: 중복 제거·공통 제외·개설 필터·학기 그룹핑·정렬 규칙이 `recommend/page.tsx`의 `useMemo` 안에 있어 테스트 불가. `useMemo`를 리팩터링하다 `if (!isAvailable) return;` 한 줄만 지워도 빌드·테스트 다 통과하며 미개설 전문교과가 새어 나감.
- `lib/recommend-items.ts` 신설(**import 없음** — tests/*.mjs가 직접 import). `buildRecommendItems({baseSubjects, professionalSubjects, selectableMap, allSchoolNames, excludedNames, semesterOrder})` → `{bySemester, unavailable}`. 두 플로우(Dept/Interest)가 공유하며, 페이지는 baseSubjects 조립만 담당.
- **`professionalOffered`를 아이템 필드로 계산**(`isAvailable && isProfessionalSubject`). "미개설 아코디언 카드엔 넘기지 말 것"이라는 암묵 규칙이 사라지고 네 호출부 모두 `item.professionalOffered`를 동일하게 넘긴다. 오표기 구조적 차단.
- `isProfessionalSubject`가 data/lib 두 곳에 중복 정의돼 있어 `lib/recommend-items.ts`를 단일 출처로 두고 data는 재수출. generic-app의 `groupSubjectsBySemester` 헬퍼는 제거(동일 기능).
- 테스트 9건 추가(총 26). 원본의 `placed` Set은 `seen`이 이미 id 중복을 막아 제거(동작 동일).
- **동작 보존 검증**: 로컬 prod 빌드 vs 리팩터링 전 라이브를 Playwright로 대조 — 관심사·계열별 두 플로우의 학기 배치·과목 순서·전문교과 라벨·개설 표기·대교협 배지가 완전 일치.
- ⚠️ **검증 중 발견**: `app/src/data/search-index.ts`에 **커밋 안 된 작업 중 수정**이 있음(세션 이전부터). `getDepartmentRecommendation`에서 track 레벨 추천 과목 병합을 제거하는 변경이라 계열별 추천 결과가 줄어든다(배포된 적 없음). 리팩터링 등가 비교 시 이것 때문에 차이가 나 보였음 — HEAD 버전으로 되돌려 비교 후 원상 복구함. **커밋 여부는 사용자 판단 필요.**
- 커밋: 효자고 `b848ded`(추출)·`ac17634`(단일 출처화) → main `f1ae24f`. 커리컴퍼스 clean `14b2daf`.

**국제계열 법·정치 오버라이드 (2026-07-09, 후속)**
- `국제법`·`국제 정치`·`국제 관계와 국제기구` → `["global","law-politics"]`. 기존엔 area 기본값 `global`만 받아 법학/정치/행정 관심 학생에게 안 뜸. **오버라이드는 area 기본값을 대체하므로 `global`을 함께 명시**해야 유실 안 됨(테스트로 고정).
- 검증: 테스트 2건 추가(17/17), 양쪽 빌드 통과, 두 앱 `lib/professional-subjects.ts` 바이트 동일 확인. 태그 커버리지 재검(오타 0, 공백 태그 4→3).
- **라이브 관찰 불가**: 효자고는 국제계열 중 `현대 세계의 변화`만 개설 → 화면 변화 없음이 정상. 이 과목들을 개설한 학교에서만 노출됨.
- 커밋: 효자고 `844082d` → main `d54bf5d`. 커리컴퍼스 clean `756a910`.

- **후속 백로그(미착수)**: ① `SUBJECT_OVERRIDES` 커버리지 공백 — 태그 21개 중 `education`·`humanities`·`literature` 3개엔 전문교과가 아직 0개. 특히 예술계열의 문예창작·문학 과목(문예 창작의 이해·문장론·시 창작·소설 창작·문학 개론·고전문학 감상·현대문학 감상 등)은 `literature` 오버라이드 후보. `국제 경제`는 `business` 후보. 추천 결과가 바뀌므로 사용자 확인 후 진행할 것. ② 추천 페이지 통합 로직(dedup·개설 필터·안정 정렬·`professionalOffered` 게이팅)에 자동 테스트 없음 — 현재 Playwright 수동 검증에만 의존. ③ `AREA_TO_TAGS` 키의 `·`(U+00B7)/`･`(U+FF65) 혼용 — subjects.json 원본과 일치 확인됨, 다른 원본과 대조 시에만 주의.

**계열별(학과) 플로우에도 합의도 뱃지/커버리지 노출 (2026-07-08, Claude Code)**
- 증상: 효자고에서 배지(핵심 N개교·권장 M개교)·로드맵 게이지(대학 핵심과목 N%)가 안 보임. 원인: 이 기능들이 **관심사별(`?interests=`) 플로우에만** 연결돼 있고 **계열별(`?dept=`) 플로우(DeptRecommendContent/roadmap)엔 처음부터 미적용**(위 2026-07-07 항목 27줄에 명시된 원설계 갭). 배포/데이터 문제 아님 — 관심사 플로우는 라이브 정상.
- 수정(양쪽 앱 각 3파일): `career-mapping.ts`에 `getInterestTagsByDept(deptName)` 역매핑(getDepartmentsByTagId 역방향, 캐시) 추가 → 학과를 소속 관심분야 태그로 환산 → 기존 `getConsensusBadges`/커버리지 재사용. recommend DeptRecommendContent에 consensusBadges + SubjectCard 2곳 배지 + Summary 각주(배지 있을 때만, "해당 계열 모집단위 기준"). roadmap coverage는 `effectiveInterests = interests ?? getInterestTagsByDept(deptName)`로 계열별에도 게이지 계산(deps에 deptName 추가).
- 검증: 효자고 build 통과+로컬 prod 서버 Playwright 확인, 커리컴퍼스 build 통과. **라이브 4곳 전수 확인**: 효자고 recommend?dept(배지·각주)·roadmap?dept(36%), 커리컴퍼스 cccompass.xyz `/s/cYrKU6tM…` recommend?dept(배지·각주)·roadmap?dept(43%).
- 커밋/배포: 효자고 `2356406`(codex) → main 머지 `b3906d0` 푸시. 커리컴퍼스 clean `5a1b567` 푸시. 둘 다 Vercel 자동배포 완료.

**추천 근거 설명 + FAQ 페이지 (2026-07-08, 서브에이전트 sonnet 4태스크)**
- 스펙 `docs/superpowers/specs/2026-07-08-faq-source-reliability-design.md` / 플랜 `.../plans/2026-07-08-faq-source-reliability.md`.
- 신규 `/faq` 페이지(효자고 Q1~Q6, 커리컴퍼스 Q1변형+Q7): 자료 출처·신뢰도 문의 대응. 아코디언, 페이지 내 배열 상수.
- 추천 화면 인라인 접이식 `RecommendBasisNote`(Dept/Interest 양쪽): "이 추천은 어떤 근거로?" → 3문단 + /faq 링크. 기존 CompetencyAccordion 패턴 재사용.
- 푸터에 /faq 링크(양쪽 앱). 최종 리뷰 머지 가능(카피 사실 정확성·링크 일관성 확인, Minor만).
- 커밋: 효자고 5aa8370(FAQ)·e64abd6(인라인) / 커리컴퍼스 clean 3e796dc. **배포**: 효자고 codex→main 머지, 커리컴퍼스 clean 푸시(아래 진행).

**계열-과목 매핑 교차 검증 (2026-07-08, analyze_mapping_vs_kcue.py)**
- 목적: career-mapping.json(효자고 안내서 기반)의 추천이 대교협 2028 권장과목과 정합하는지 21개 관심태그 전수 대조.
- **결론: 매핑 수정 불필요 — 정합 확인.**
  - [누락] 대교협 핵심 5개교↑인데 매핑에 없는 과목은 5건뿐(간호: 대수·미적분Ⅰ / 심리·사회: 화법과 언어·독서와 작문 / 국제: 중국어)이고, **전부 런타임 보강(3개교↑ booster)이 이미 화면에 추가 중** — 실질 누락 0.
  - [의심] "대학 근거 0" 항목 다수는 융합선택·탐구류(수학과제 탐구, 사회문제 탐구, 독서 토론과 글쓰기 등) — 대교협 자료가 국수영탐 반영과목 위주라 근거가 안 잡히는 게 정상이고, 세특·역량용 추천으로 정당. UI상 뱃지 유무로 자연 구분됨.
  - 예체능(arts) 트랙의 국영수사 과목 다수 포함은 원본 안내서의 의도된 설계(예체능 입시 기초교과 병행)로 확인.
- 스크립트 `analyze_mapping_vs_kcue.py` 리포에 보존(태그 키워드 테이블은 university-recommendations.ts와 수기 동기화 필요 — 테이블 변경 시 스크립트도 갱신할 것).

_최종 갱신: 2026-07-07 (Claude Code) — **합의도 뱃지 + 로드맵 커버리지 게이지 구현(서브에이전트 주도, 5태스크).**_

**합의도 뱃지 + 커버리지 게이지 (2026-07-07)**
- 스펙: `docs/superpowers/specs/2026-07-07-consensus-badge-coverage-design.md`, 플랜: `docs/superpowers/plans/2026-07-07-consensus-badge-coverage.md`
- `app/src/lib/consensus.ts` 신설(순수 로직, JSON import 금지 유지 — node:test .mjs가 직접 import): `buildBadgeMap`(명시 과목명만, areas 제외, 대학 dedup), `computeCoverage`(threshold 3, 미개설 분모 제외+notOffered 분리), `normalizeSubjectName`(로마숫자 Ⅱ/II 흡수). 테스트 `app/tests/consensus.test.mjs` 6건.
- `getConsensusBadges(interests)` 래퍼(`university-recommendations.ts`) → SubjectCard `consensus` prop(optional) → InterestRecommendContent 두 섹션에서 정규화 키로 lookup. **DeptRecommendContent는 미적용(관심계열 매핑 없음).** Summary 카드에 대교협 출처 각주.
- 로드맵: `CoverageGauge.tsx` + sticky 학점 바 내부 게이지. 분자=designated 자동+selections, 게이지 숨김 조건(관심계열 없음/분모 0) 적용.
- 검증: lint 0에러·build 통과·테스트 9건 pass. **주의: `node --test tests/`는 Node 24에서 디렉터리 인자 오해석 — `node --test tests/*.mjs`로 실행할 것.**
- 최종 전체 브랜치 리뷰 통과(머지 가능). **백로그 4건**(머지 비차단, 최종 리뷰 처분): ① consensus.test.mjs 정렬 desc 실증 테스트 추가(2원소 케이스) ② Math.round 비정수 비율 테스트 ③ 정규화 키 충돌 시 뱃지 max 병합(현 데이터 충돌 없음) ④ **roadmap taken에 ↔결합 확장 미적용 — school.json 선택군에 STEM ↔조합이 생기면 커버리지 과소집계 회귀. `getExpandedSubjectNames` 적용으로 해소** (회귀 트리거 명확).
- 커밋: 메인 3c4c4b3·34a83e1·fbf09c8·f1b66be(+HANDOFF 68a2c88, 푸시됨) / clean 브랜치 포팅 d2099f9+각주픽스 9dac1bf(2회 리뷰 통과, 푸시됨). 스펙 각주는 두 버전 모두 InterestRecommendContent summary에 존재.
- **커리컴퍼스 라이브 확인 완료**: 의정부여고 게시본(/s/cYrKU6tM…/recommend?interests=cs-ai)에서 뱃지("핵심과목 지정 6개교" 등)+각주 렌더 확인.
- **효자고 배포 경로 발견·해결 (2026-07-07)**: hyoja-curriculum.vercel.app은 **main 브랜치**에서 빌드됨 — codex 브랜치 푸시만으론 효자고 사이트 반영 안 됨(어제 e187461도 미반영이었음). 계보상 main=효자고가 맞다는 사용자 확인에 따라 **codex→main 머지 실행**: 워크트리 ../p2c-main-merge에서 충돌 15개 해소(전시관 자산 5개는 main 6/2 교정본 우선 — world_culture jpg·manifest·exhibition-subjects.ts/tests / 나머지 10개는 codex 우선), build+테스트 9/9 통과 후 머지 커밋 96e078c 푸시. **앞으로 효자고 반영 필요 시마다 codex→main 머지할 것.**

_이전 갱신: 2026-07-06 (Claude Code) — **대입 반영과목 데이터 대교협 2/20 확장판으로 업그레이드(신규 파서+합의도 재계산+중복 교정).**_

**대입 반영과목 대교협 확장판 도입 (2026-07-06)**
- 배경: 기존 `university-requirements.json`의 원본("2028학년도 계열별 대표 모집단위별 반영과목.xlsx", 42개교×16개 대표 모집단위)의 출처를 워크플로 리서치로 추적 → **대교협 대입상담센터 공식 자료**(2026-02-12 어디가 탑재본의 직전판)로 확인. 8일 뒤 확장 개정판 **「2028학년도 권역별 대학별 권장과목」(2026-02-20, 47개교·1,358개 모집단위, 핵심/권장 2단 구분)** 존재 확인 → 네이버 블로그 재게시본에서 원본 xlsx 확보(`260220-2028학년도 권역별 대학별 권장과목.xlsx`, 리포 루트 — `.gitignore`의 `*.xlsx` 규칙으로 **커밋엔 미포함**, 로컬에만 존재).
- 신규 파서 `parse_kwonjang_2028.py` → `data/university-recommendations.json` + app 복사본. 셀 서식이 대학별 제각각(중첩 괄호·줄바꿈·서술형·오탈자)이라 **subjects.json 과목명 사전 최장일치 스캔** 방식. 우산 용어(수학·과학 등)는 `areas`로 분리, 서술형("적성 고려 자율")은 `isFlexible` 플래그. 오탈자 별칭 처리(물리과 에너지→역학과 에너지, 사화와 문화→사회와 문화 등). 잔여 미매칭은 서술형 조각뿐.
- `app/src/data/university-recommendations.ts` 신설: 관심태그→모집단위 키워드 매칭(`tagToUnitKeywords` + crosstalk 차단 `tagToUnitExcludes` — 예: 산림경영학과가 business에 잡히던 문제), `getSubjectConsensusByInterests(interests, {coreOnly, expandAreas})` 대학 중복 제거 합의도 카운트, `getEntriesByUniversity`(향후 목표 대학 오버레이용).
- `career-mapping.ts` 추천 보강 단계를 새 함수로 교체 — **핵심과목 명시 지정만 집계(coreOnly+expandAreas:false)**해 보수적으로. 임계값 3개교 유지.
- 기존 파서 중복 교정: `parse_all.py`에 동일 대학 중복 행 병합(base name 기준, requiredSubjects union) + summary 배열 dedup 추가. 컴퓨터공학 35→30개교, 미적분Ⅱ 카운트 30→27. **주의: parse_all.py 실행 시 school.json도 재생성되는데 커밋본과 달라져서 checkout으로 되돌림** — school.json 재생성 전 원본 엑셀 상태 확인 필요.
- 출처 표기: Footer에 "대입 반영과목 · 한국대학교육협의회 「2028학년도 권역별 대학별 권장과목」(2026.2.) — 필수 이수 기준이 아닌 참고자료" 추가.
- 검증: next build 통과(기존 exhibition-subjects.test.ts implicit-any 1건만, 무관).
- **배포 (2026-07-06)**: ① 이 브랜치 커밋 e187461 푸시(효자고 버전) ② clean 브랜치에 포팅 커밋 b53ec66 푸시(커리컴퍼스 prod, generic-app 빌드 통과 확인 후). generic-app도 동일 스택(career-mapping 보강+university-requirements)이라 같은 방식 적용, Footer 출처 표기는 커리컴퍼스 푸터 형식에 맞춰 추가.
- 다음 후보: ① 합의도 뱃지 UI(핵심 N개교/권장 M개교) ② 로드맵 커버리지 점수 ③ 목표 대학 오버레이 — 데이터 기반은 이번에 마련됨.

_이전 갱신: 2026-07-03 (Claude Code) — **전문교과 professionalArea 계열 오류 전면 교정(파서 수정+재생성).** 이전: PDF 업로드 3쪽 제한(편제표만 받기) 구현·검증 완료, push→prod 배포(커밋 d87fad9·f4bed10). 이전: 편제표 수정 리디자인+검수, 브랜드 커리컴퍼스, 전시관→과목, 집중이수 자동분리·선택군 이동, 문의(mailto)·학교명 강조/정규화·로드맵 배경, 학생 홈 생동감 리디자인. push→prod 배포(…c07f48e·0eae144·7a75dc0)._

**전문교과 professionalArea 계열 오류 교정 (2026-07-03, 커밋·푸시됨)**
- 발견: 전문교과 263과목 중 다수의 `professionalArea`(계열)가 엉터리 — 108과목이 전부 '농림·수산', '심화 수학Ⅱ'가 예술계열 등. 파생 필드 `keyContents`·`relatedDepartments`와 fallback description에도 동일 오류 전파.
- 근본 원인 2건 (`parse_excel_subjects.py`):
  ① `전문 교과 데이터(목록만 살려)` 시트 86~96행(국제 정치~사회과제 연구, 국제계열)의 계열 셀이 원본에서 비어 있어 forward-fill로 직전 값 '외국어계열'이 채워짐.
  ② `목록 데이터` 시트의 계열 열(4·6열)은 과목과 행 정렬된 표가 아니라 **드롭다운용 독립 목록**(계열명이 위에서부터 한 줄씩)인데, 파서가 (과목열, 계열열)을 행 단위로 짝지어 forward-fill → 전문교과Ⅰ 39과목·전문교과Ⅱ 124과목 계열 전멸.
- 수정: ① `PROFESSIONAL_AREA_OVERRIDES`(국제계열 11과목 명시 보정) ② 행 짝짓기 제거, `PROFESSIONAL_LIST_GROUPS`(2015 개정 편제 기반 계열→과목 명시 매핑, 시트 순서·그룹 수 합계 124로 교차검증) 도입 + 미매핑 시 경고 출력. 재생성 시 경고 0.
- 재생성: `data/subjects.json`·`app/src/data/json/subjects.json`·`school-selected-subjects.json` 2종. diff는 `professionalArea`/`keyContents`/`relatedDepartments`/fallback `description`/`generatedAt`만 변경(필드 단위 diff 집계로 확인). 학교 편성 과목 중 관광 일본어·중국어(미용·관광·레저), 식품과 영양(음식조리), 프로그래밍(정보·통신), 현대 세계의 변화(국제계열) 등 8과목 교정됨.
- 검증: 기대 매핑 39건 검증 스크립트 수정 전 FAIL(56건 실패) → 수정 후 PASS. tsc는 기존 `exhibition-subjects.test.ts` implicit-any 1건만(무관). `tests/roadmap-selection-state.test.mjs` 3/3 통과. **주의: 이 체크아웃 app에는 vitest 미설치**(HANDOFF의 88개 테스트는 clean 브랜치 기준) — package.json에 test 스크립트 없음.
- 참고: 원본 명칭 '내동 공조 일반'(냉동 오타)·반각 가운뎃점(･) 표기는 학교 데이터 이름 매칭 보호를 위해 의도적으로 보존.
- **프로덕션 반영(중요)**: 이 브랜치(docs) 커밋 0a89b97만으로는 배포 안 됨 — **실서비스는 `codex/generic-curriculum-assistant-clean` 브랜치의 `generic-app/`**(워크트리 `~/.config/superpowers/worktrees/project2_curriculum/generic-curriculum-assistant-impl`). 해당 브랜치에 교정 subjects.json+파서 커밋 323fdd9 푸시 → Vercel prod 배포 완료. 라이브(cccompass.xyz 공유 링크)에서 '프로그래밍'=정보·통신 표시 확인함. 공유 뷰 과목 상세는 Supabase가 아니라 앱 정적 subjects.json(createSubjectCatalog)에서 옴.

**전문교과 7과목 세부정보 보강 (2026-07-03, docs 3e88ed9 / prod 922b05e)**
- 배경: 전문교과 과목 상세 카드에 세부정보가 없음(계열명만 반복). 효자고 시절 수기 작성분이 git 히스토리에 있었음.
- 소스 발굴: ① 커밋 97bdcae — 프로그래밍·정보과학·식품과 영양·관광 일본어/중국어 수기 작성(설명·keyContents·직업·학과) ② 커밋 429a739 — 경기도교육청 2022개정 과목선택안내 PDF 추출분(합창·합주·드로잉·정보과학, PDF 파싱 잔재 있음).
- 구현: `data/subject-detail-supplements.json` 신설(7과목, 두 소스 병합·잔재 정리) + 파서 `apply_detail_supplements`(과목명 canonical 매칭, 재생성 시 자동 병합, 대상 누락 경고). **JSON 직접 수정이 아니라 파서 병합이라 재생성해도 유지됨.**
- 정리한 잔재: 합창·합주 careers의 PDF 표 혼입 2건 제거·병합된 직업명 분리, 드로잉 careers에 학과명 혼입 3건 제거, '예 술'·'조형 활 동' 등 띄어쓰기, '커푸 전문가' 오타 회피(97bdcae 목록 사용).
- 검증: 재생성 후 7과목 병합 확인·professionalArea 유지·검증 스크립트 PASS. 라이브 계열 표시 5과목 재확인(관광 일본어=미용·관광·레저, 드로잉·합창·합주=예술계열, 식품과 영양=음식조리, 정보과학=과학계열). prod 배포 후 상세 카드 확인.

**PDF 업로드 3쪽 제한 (2026-06-26, 커밋 d87fad9 / 배포됨)**
- 배경: 로그 확인 결과 유저들이 50쪽짜리 교육과정 도움자료집·총론(2022 개정 총론 등)을 통째로 업로드 → 입력 토큰·비용·지연 폭증, 정확도 저하. 편제표는 많아야 3쪽이고, **교육과정부 교사는 순수 편제표 파일을 따로 보유**(사용자 확인)하므로 친절한 우회 없이 하드 차단이 맞다는 결론.
- 검토 과정: ① 앞 N쪽 캡 → "편제표가 앞에 있다는 보장 없음"으로 기각 ② kordoc(전체 텍스트, 페이지 경계 없음)+pdf.js(페이지 탐지)+pdf-lib(자르기) **자동탐지(A안)** 설계 → ③ 사용자가 **"초과 업로드 자체를 막자"**로 단순화 결정(상한 5→최종 3쪽) → **A안 폐기**.
- 구현: `src/lib/curriculum/pdf-limit.ts` 신설 — `MAX_PDF_PAGES=3`, `isPdfUpload(name,mime)`, `countPdfPages(bytes)`(pdf-lib `PDFDocument.load`, **동적 import**라 클라 초기 번들 제외), `pdfPageLimitMessage(n)`(실제 쪽수 포함 안내). **PDF만** 검사(HWPX·엑셀은 페이지 개념 달라 제외).
  - 클라(`app/create/page.tsx`): `acceptFile`을 async로, PDF면 페이지 카운트 → 초과 시 파일 거부+안내. 핸들러 `void` 처리. 드롭존 헬프텍스트에 'PDF는 편제표 페이지만(3쪽 이내)' 추가.
  - 서버(`app/api/curricula/upload/route.ts`): 버퍼 읽은 뒤 파싱 전에 PDF 페이지 카운트 → 초과 시 400. 카운트 실패(암호화·손상)는 **fail-open**(막지 않고 통과).
- 의존성: **pdf-lib 1.17.1** 추가(pnpm).
- **부수 수정(기존 회귀, 이 작업 무관)**: ① `components/Reveal.tsx` — `window.matchMedia`를 무방비 호출해 jsdom에서 throw(바로 다음 줄 IntersectionObserver는 이미 feature-detect 중) → 같은 스타일로 matchMedia도 `typeof===function` 가드. ② `tests/unit/hyoja-home-page.test.tsx` — 홈 리라이트로 검색 placeholder가 '예) 간호학과…'로 바뀌었는데 테스트는 옛 `/학과를 검색/`를 찾아 실패 → 현재 카피 `/간호학과/`로 갱신. (이 둘로 전체 스위트 4 실패→0)
- 검증: tsc 0 · lint 0(에러; 기존 경고 2건만) · **vitest 88 통과**(신규 유닛테스트 3건: PDF 판별/실제 쪽수 카운트/한도 메시지). 유닛으로 검증 가능한 범위까지. **전체 파이프라인 실업로드(kordoc+Gemini)는 키·실파일 필요라 사용자 실측 권장**(인터페이스 불변이라 위험 낮음).

**학생 홈 생동감 리디자인 (2026-06-24, 커밋 7a75dc0 / 분석 workflow wvexmvp1n)**
- 진단: 색 리듬 0·모션/브랜드 시그널 부재·균질 회색 태그. 사용자 결정: 퀵윈+히어로(B1)+CTA 오렌지틴트(STEP·태그색상화는 보류).
- 적용: 히어로 `bg-secondary` 틴트존+CompassMotif 배경+학교명 Black Han Sans+부제 '3분 안에' 오렌지 / 전 섹션 Reveal / 관심분야 틴트 카드 그룹핑 / 검색 placeholder 예시화·코호트 라벨·hr 제거 / CTA 오렌지틴트+상태카피.
- `CompassMotif`를 `components/CompassMotif.tsx`로 추출(랜딩 import 교체, 모티프 3개 회귀 확인). 좌측바 없음·토큰 4색·모바일·흐름 유지. tsc0·lint0·tests 85.
- 후속(커밋 250193b): 학교명·'관심 분야' 헤딩을 **Pretendard**(특별 디스플레이체)로. 학교명 extrabold(800)·헤딩 bold. **주의: Tailwind v4는 `@import "tailwindcss"`를 인라인 확장해 globals.css의 원격 `@import url(폰트)`가 뒤로 밀려 'must precede' 500 발생 → 외부 폰트는 layout.tsx `<link>`로 로드(Pretendard variable dynamic-subset CDN). `--font-pretendard` 변수.**

**문의 창구·학교명·로드맵 배경 (2026-06-24, 커밋 c07f48e·0eae144)**
- 개발자 문의: Footer에 '개발자에게 문의하기' = `mailto:ghga20@gmail.com`(제목·본문 템플릿). 전역 노출.
- 학생 홈 학교명 강조(text-3xl md:text-4xl + 아이콘 확대).
- `normalizeSchoolName`(school-adapter): 'xx고'→'xx고등학교', 고등학교면 유지, 고로 안 끝나면 그대로(영문명 보호). 학생 어댑터에서 적용 → 모든 학생 출력·기존 게시본 커버.
- 로드맵 콘텐츠 `bg-white` 제거 → 다른 학생 페이지와 동일하게 크림(#FFFBEB) 배경 통일.

**선택군 다른 학년·학기로 이동 (2026-06-24, 커밋 e0a36c7)**
- 배경: 파싱이 선택군을 엉뚱한 학년/학기로 잡는 경우가 있음.
- 선택군 헤더에 '다른 학기로 이동…' 드롭다운(같은 코호트 전 학년·학기, 현재 위치 isCurrent로 제외). 선택 시 통째 이동.
- `CurriculumReviewForm.moveChoiceGroup` — 원본 splice + 대상 push, **대상 학기 내 group.id 재발급**(generateGroupId, React key·학생측 selection id 충돌 방지), '○○학기로 옮겼어요' 안내. `ChoiceGroupEditor`에 moveTargets/onMove props.
- 검증: dev에서 2학년 1학기 '제2외국어 선택' → 1학년 2학기 교차이동 확인(원본 제거·대상 배치·메시지). tsc0·lint0·tests 85.

**집중이수 ↔ 자동분리로 단순화 (2026-06-24, 커밋 fd89e89)**
- 사용자 결정: '집중이수 묶기' 대신 **↔를 파싱 단계에서 1·2학기로 자동분리**, 잘 안 되는 건 수동. (지금 방식이 과해서)
- post-process에 `splitConcentratedAcrossSemesters` 추가 — ↔ 지정과목을 **앞→1학기 / 뒤→2학기**로 결정적·손실 없이 분리(한쪽만 있어도 반대편에 채움, 중복 방지). 선택군 옵션 ↔는 그 학기 기준 제자리 해석. 구조화 프롬프트도 학기 분리 지시 명확화.
- **제거**: 집중이수 묶기(ReviewForm 모드·핸들러·툴바), `concentrated`/`concentratedPartner` 스키마 필드, school-adapter 전달, 로드맵 '집중이수' 배지, SubjectRow 체크박스/페어배지.
- **유지**: 잔여 ↔용 칩 선택(1클릭 수정). 안 맞으면 이름 직접 수정.
- 검증: post-process ↔ 분리 유닛테스트 2건 추가(앞→1/뒤→2, 양학기 중복 비중복). tsc0·lint0·tests 85. 튜토리얼 카피 갱신.

**배포 전 전반 감사 + 반영 (2026-06-24, 워크플로 wkbq03n5p / 커밋 5da299a·11e0f26)**
- 4관점(교사흐름/학생흐름/내비·구조/UX·위생) 병렬 감사. 결론: **진짜 P0(빌드/렌더 깨짐) 0건 → 조건부 배포 가능.** 사용자와 범위 합의 = "P0 + 핵심 P1 + 죽은코드", 푸터 유지(효자고/과목나침반 보조는 의도된 것), 카피는 '약 1분'만.
- 반영: ① **전시관 라우트 직접 URL 접근 차단** — `exhibition/page.tsx` default를 `notFound()` 스텁으로, 구현은 `ExhibitionPageImpl`(미사용·eslint-disable)로 보존(추후 복원). ② 업로드 카피 '약 55초'→'약 1분'(랜딩·튜토리얼 4곳). ③ `app/error.tsx`·`app/not-found.tsx` 브랜드 에러/404 추가. ④ a11y: 로드맵 토스트 `role=status aria-live`, dialog/sheet 닫기 'Close'→'닫기'. ⑤ 죽은코드: `ExhibitionMediaPanel` 삭제, `split-subjects`의 과목나누기 잔재(splitMergedSubjectName·expandSubjectBySplit·parseManualSplit)+테스트 제거. tsc0·lint0·tests 83.
- **미반영(후속 백로그, P1/P2)**: revalidatePath 실패 무음→응답 경고 플래그, 게시 데이터 손상 시 학생 안내 메시지, 배지색 디자인 토큰화, focus-ring 투명도/20→/40·키보드 포커스 전수, 로드맵 범위(택N~M) 최소충족 검증, 비교기능 진입점, 모바일 터치타깃<44px·초소형 폰트·scrollbar-hide, cohort 전환 시 선택 초기화. (감사 거짓양성: 선택군 마지막삭제 가드 존재/hero 이미지 존재/side-accent 위반 없음). **운영: .env 키 로테이션 별도 필요.**

**전시관 통합 + 튜토리얼 정비 (2026-06-24, 커밋 2954cc9·2d3001a)**
- 전시관 탭 내림: '과목'과 내용이 겹치고 포스터에 효자고 브랜딩이 박혀 공용 부적합 → 하단 4탭(홈·추천·로드맵·과목). 과목 상세의 전시 포스터 패널도 제거. **s/[shareToken]/exhibition 라우트·ExhibitionMediaPanel·posters는 보존**(추후 '진짜 전시관'으로 재정의해 재노출). 사용자: "지금은 과목으로 통일, 전시관은 추후 진짜 전시관처럼".
- 튜토리얼(/guide) 정비: 교사 — 제거된 '과목 나누기' 단계/버튼 삭제 → '확인 필요·미확인 과목 점검·수정', 선택군 mockup을 헤더바+택1~2(범위)+과목당 학점+집중이수(칩/묶기)로 갱신. 학생 — 선택군 라벨 '택N·과목당 N학점'(범위 안내)로 정정. 학생 mockup엔 하단 내비가 없어 전시관 제거 영향 없음.

**편집/학생 UX 다듬기 + 전시 포스터 복원 (2026-06-24, 커밋 16ba821·a5022bb·9c8cc58)**
- A1 선택군 카드 테두리 강조(border-2+ring+shadow, 좌측바 없음) / A2 '과목당 학점·선택 수' 우측 정렬 / A3 검토 헤드라인 sm+ 한 줄(모바일 keep-all).
- B1 추천 과목 카드 간격 space-y-2→3. / B2 로드맵 선택군 범위(택N~M) 선택 수정 — SelectionGroup이 choose 대신 maxChoose를 캡으로(min/maxChoose는 school-adapter에서 전달, 옵셔널+폴백). '택N~M' 라벨/카운터. 유닛 테스트 기댓값 갱신(90/90).
- B3 전시관 전용 과목 페이지 복원: **조사(workflow wgxuonrph) 결론 — 효자고 원본엔 전용 라우트가 없고 subjects/[id]에 ExhibitionMediaPanel(포스터/영상)이 들어있었음.** generic-app은 이게 미포팅이라 전시관→과목에서 포스터가 안 보였던 것. → ExhibitionMediaPanel(포스터 중심, 영상 데이터 없음) 신설해 subjects/[id] 헤더 카드 아래 통합, 포스터 있는 과목만 렌더(hasExhibitionPoster). 효자고 공식 포스터는 전국 공유(posterSubjectIds)라 멀티스쿨에서도 동작.


**편집 페이지 3차 개선 + 리브랜딩 (2026-06-24, 커밋 2ee43eb·ef5b95d·6d1eff7 / 브랜치 codex/generic-curriculum-assistant-clean)**
- 수정 페이지 레이아웃 확정(사용자 승인 "이대로 좋은데"): 2행(학기)·좁은 중앙 컬럼(max-w-3xl)·콤팩트 한 줄 행, 선택군 헤더바 구분(**좌측 컬러바 절대 금지**), 과목 나누기 제거, 교과군→과목 드롭다운(AddSubjectControl).
- ① 선택군 학점 단일화: 옵션별 학점란 제거 → 선택군 '과목당 학점'(creditsEach) 하나, 옵션 추가/합계 동기화. SubjectRow `hideCredits`.
- ② 유연 택N: 선택군 범위 선택(택N~M). 기존 minChoose/maxChoose 활용 → 스키마 변경/마이그레이션 없음. 연계 그룹 하드강제는 비목표(범위로 흡수 — 사용자 확정).
- ③ 미확인 과목: 마스터 카탈로그(@/data/subjects) 외 과목명 = 학생 런타임에서 빈추천 fallback이 되는 케이스 → '미확인 과목' 플래그(isKnownSubjectName, 학생 subject-catalog와 동일 normalize). 오타·고시외·전문교과 미수록 사전 경고.
- ④ 집중이수(↔): 학기순 자동배정(모호·순서가정 오류) → 파싱된 과목을 '선택 칩'으로 제시, 교사가 이 학기 열리는 과목 직접 선택(학기순은 '추천' 표시만). split-subjects.splitConcentratedNames.
- ⑤ 학기교차 집중이수 묶기(커밋 760de2a): ↔ 마커가 없어도 집중이수인 편제표 대응. 스키마에 `concentrated`/`concentratedPartner`(옵션·하위호환) 추가. 편집 페이지 '집중이수 묶기' 모드(지정과목 체크박스 → 서로 다른 학기 2개 선택 → 묶기), 페어 배지 + '묶기 해제'(양쪽 동시). 학생 배치는 학기 그대로 유지, school-adapter로 필드 전달 → 로드맵 지정과목 칩에 '집중이수' 배지. 사용자 결정: 단일표시 X, 두 과목 학기교차 묶기 O(연계 그룹 하드강제 비목표).
- 브랜드: 워드마크 '커리컴퍼스' + 'CurriCompass'(sm+ 표기), 과목나침반은 툴팁/푸터 보조. Logo·Footer·layout(타이틀)·가이드·튜토리얼·로드맵 워터마크 일괄.
- 줄넘김: globals.css body `word-break:keep-all` + `overflow-wrap:break-word`, h1~4 `text-wrap:balance`, p `pretty` (한두 글자 고아 제거). 모바일 헤더 영문 sm+·링크 nowrap.
- 검증: tsc 0, lint 0(에러), dev E2E(범위 토글·미확인 플래그·집중이수 칩 클릭·로고·헤드라인) 스크린샷 확인. SubjectRow effect-setState 제거(빌드 lint 통과).

**파싱 엔진 Gemini(비전) 전환 (2026-06-23, 커밋 d238aa4)**
- 배경: 학교별 서식이 달라 파싱 품질 불만. OpenAI(텍스트) 역할 = kordoc 추출물(text/tables)을 스키마 JSON으로 재구성(파일 직접 안 봄). 병목 = kordoc 텍스트화 손실(특히 PDF의 셀 병합/rowspan).
- 벤치마크(`data/parse-test/` 샘플 02~09, `harness-gemini.mjs` + `harness.mjs` + `compare-ab.mjs`): 집계 수치는 비슷(양쪽 뭉침0·무학점0 — '뭉친 이름' 참사는 2022 교육과정 파일엔 거의 없음, 그건 한민고 2015 PDF 이슈였음). **단 PDF의 rowspan 병합셀(택N) 해석에서 Gemini 비전이 명확히 정확**(09 북일고: 제2외국어 일/중/한문·예술 음악/미술을 OpenAI는 전부 '필수'로 오인, Gemini는 '택1'로 정확 — kordoc HTML의 rowspan 학점셀로 원본 검증).
- 구현(`generic-app/src/lib/llm/`): `gemini-structurer.ts`(GeminiStructurerProvider, **gemini-3.5-flash**) — PDF는 inlineData 네이티브 비전 + kordoc text/tables 하이브리드, HWPX/엑셀 등은 텍스트만. `StructurerProvider`에 원본 file 전달 추가(upload route base64 동봉). 'JSON 뒤 잡텍스트' 버그 → balanced-JSON 추출. OpenAI provider는 폴백 유지(provider 추상화).
- **운영 전환**: Vercel env `CURRICULUM_STRUCTURER_PROVIDER=openai→gemini`(prod+dev), `GEMINI_API_KEY` 생성. 되돌리려면 env만 openai로.
- 측정 도구는 `data/parse-test/`에 보존(harness-gemini.mjs, compare-ab.mjs). 정답 라벨 기반 정밀 채점은 미실시(추후, 사용자 샘플로).
- **업로드 행(hang) 버그 원인 확정+수정 (커밋 d5032a6)**: kordoc/Gemini fetch에 타임아웃이 없어, Render(무료티어) 콜드스타트 시 함수가 응답 없이 무한 대기(draft 0·로그 0). + Vercel 서버리스에서 Gemini 호출이 느림(~52초, 로컬 18초 대비). → fetch에 `AbortSignal.timeout`(kordoc 45s·Gemini 90s) + 단계 로그 + 스키마 `.default([])` 추가. **워밍 상태 E2E 성공 확인**(HTTP 200, 55초, draft 생성, 집중이수 ↔ 정상 분리). maxDuration=300은 정상 동작(함수가 55초+ 완주).
- **남은 신뢰성 과제(미적용)**: Render 무료티어가 15분 유휴 시 잠들어 콜드스타트 지연 → **외부 핑(UptimeRobot/cron-job.org 등)으로 Render `/` 10~14분마다 keep-warm** 권장(Vercel Hobby 크론은 1일 1회 한계라 부적합). 선택적으로 Vercel Fluid Compute 활성화. 콜드일 때도 이제 무한대기 대신 45초 후 명확한 502 에러로 빠르게 실패.
- **주의**: OpenAI 키·Gemini 키·Vercel 토큰이 세션 로그 노출 → 회전 권장.

**랜딩 생동감 리디자인 (2026-06-22, 커밋 b009124)**: ui-ux-pro-max 스킬 점검("Muted colors + Low energy" 안티패턴)으로 흰 카드+크림 일색의 밋밋함 해소(신뢰감 유지, side-accent 바·비대칭 배치 제외). 색 리듬(블루 스탯밴드/딥블루 차별점 풀블리드 블록/틴트 카드/라이트블루 CTA), 컴퍼스 로즈 배경 모티프, 히어로 타이포 확대+키워드 컬러, `components/Reveal.tsx` 스크롤 페이드업(SSR-safe: 화면 밖만 숨김)+카드 hover+로고 settle 모션(globals.css, 전부 reduced-motion 존중). build/lint OK, 콘솔 0, 초기로드/전체렌더 브라우저 검증.

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

**랜딩 재설계 + 인터랙티브 튜토리얼 완료 (2026-06-22, 워크플로 wf_c4d4de53, 커밋 9f5b0c8 — 로컬검증·미배포)**
사용자 피드백: 랜딩이 산만하고 핵심가치 전달 약함, 후킹 문구 별로, 우측 학생 미리보기 카드 빼기, NEIS 데모식 인터랙티브 튜토리얼 추가.
- 랜딩(`src/app/page.tsx`) 전면 재구성: 우측 '학생 공개 화면' 미리보기 카드 제거, 2컬럼→**단일 컬럼 6섹션**(브랜드바·히어로·3단계흐름·차별점띠·효익3카드·마무리CTA+푸터).
- 후킹 헤드라인(사용자 지정 문구 "추천과 3년 로드맵을 제공합니다"): **"편제표 한 장으로, / 진로 맞춤 추천과 / 3년 로드맵을 제공합니다"**. 주 CTA 오렌지 1개('편제표 올리고 시작하기') + 보조 '사용법 둘러보기'(→/guide) 블루 링크. CTA 색 위계 일관(오렌지=주행동, 블루=링크).
- `/guide`(`src/app/guide/page.tsx`): **교사/학생 탭**으로 두 인터랙티브 튜토리얼 호스팅(효자고 예시).
- 튜토리얼 엔진(`src/components/tutorial/`, 데이터 주도): `TutorialPlayer`+`useTutorial`+`types.ts`, `screens/`(teacher·student 모의화면 + `_shared.hot()`), `data/`(teacher·student 스텝 스크립트). **모의 화면 위 스포트라이트 디밍 + 화살표 + 코치 패널**; 진행 점/카운터, 좌측 '이전' + 우측 forward 버튼은 **모든 단계 '다음'으로 일관**(마지막만 '처음부터'). 클릭형(interactive) 스텝은 강조 요소를 직접 클릭해도 진행(필수 아님, 힌트로 안내) — 이전엔 설명형='다음'/클릭형='건너뛰기'로 갈려 혼란스러워 통일함(커밋 a351104).
- 교사 10스텝(랜딩→/create 업로드→진행모달→/review 검토:학년탭·과목나누기·선택군·게시→공유링크), 학생 10스텝(홈 학년·관심분야→/recommend→/roadmap 담기→공유).
- `Button`에 `cta`(오렌지) variant 추가. `SubjectRow` set-state-in-effect는 정당 패턴이라 eslint-disable 주석.
- 검증: `npm run build`(`/`,`/guide` 정적생성) OK · `typecheck` OK · `lint` 0 errors(기존 img/unused 경고만) · Playwright로 양 탭 인터랙션·스포트라이트·콘솔에러 0 확인.
- 후속(커밋 a351104): 튜토리얼 진행 버튼 일관화('건너뛰기' 제거 → 모든 단계 '다음', 마지막 '처음부터'). 클릭형 요소 클릭 진행은 유지.
- **로고/워드마크 리브랜딩(커밋 ff4e3fb)**: ① `CompassMark`(Logo.tsx) 점선 링/납작 바늘 → **가는 링 + 슬림 4방위 컴퍼스 로즈**(북침 오렌지, 나머지 currentColor) + 허브. ② 워드마크('과목나침반') 폰트 Noto → **Black Han Sans**(`--font-brand`, layout.tsx next/font 배선; BrandLogo/Footer 적용). ③ 파비콘 `app/icon.svg`도 새 컴퍼스 로즈로 통일. 사용자가 logo-lab.html 비교 후 Black Han Sans 선택(임시 lab 페이지는 삭제). build/lint OK, 콘솔 0.
- **배포 반영 완료(2026-06-22)**: 아래 '배포 구조' 참조. 라이브 검증 OK(`/guide` 200, 새 헤드라인·Black Han Sans 반영).

**[중요] generic 사이트 배포 구조 (2026-06-22 규명)**:
- 라이브 `generic-curriculum-assistant.vercel.app` = Vercel 프로젝트 **`generic-curriculum-assistant`**(team `team_PCu4d9FAk5Vh8RkcJXQNd3tf`, projectId `prj_EeUKasJ56q8Oly5asLobBux2N5Qo`). 그동안 **git 연결 없이 `vercel --prod` CLI 수동 배포**만 해와서, GitHub push로는 안 바뀌었음.
- GitHub 저장소(`ghga20-ui/curriculum_hyoja`)의 자동배포는 **별개 프로젝트 `hyoja-curriculum`(sejunpark 개인 계정)** 에만 걸려 있음(효자고 `app/` 빌드). 헷갈리지 말 것.
- **`generic-app/` 코드는 `codex/generic-curriculum-assistant-clean` 브랜치에만 존재**(main·다른 codex 브랜치엔 없음).
- 이번에 API로 세팅함: ① generic 프로젝트에 GitHub 저장소 **연결**(link), ② **Root Directory = `generic-app`**, ③ `-clean` ref로 **프로덕션 배포 1회 트리거**(라이브 반영).
- **자동배포 완료(2026-06-22)**: 사용자가 대시보드에서 Production Branch를 **`codex/generic-curriculum-assistant-clean`** 로 변경함(공개 API로는 불가, 대시보드 전용). 빈 커밋 push로 E2E 검증 완료 — `via=git` 트리거로 production 배포 QUEUED→BUILDING→READY 확인. **이제 `-clean`에 push하면 자동으로 프로덕션 배포됨.**
- 수동 배포가 필요하면(토큰 보유 시): generic 프로젝트는 이제 rootDirectory=generic-app이라 **CLI는 저장소 루트에서** 쓰거나, API로 `POST /v13/deployments`(gitSource ref=-clean, target=production) 트리거.

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
