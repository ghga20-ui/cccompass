# 전문교과 추천 보정 — 설계

- 날짜: 2026-07-09
- 대상: 효자고(`app/`), 커리컴퍼스(`generic-app/`)
- 상태: 승인됨(사용자), 구현 계획 대기

## 문제

일반계 고등학교는 전문교과를 끌어다 개설할 수 있다. `프로그래밍`은 실제로 다수 학교가 개설하며, 컴퓨터공학·기계공학 지망생에게 권장할 만한 과목이다. 그러나 추천 화면에서는 **항상 탈락한다.**

탈락 지점은 category 필터가 아니다. `프로그래밍`은 `category="진로선택"`이라 필터를 통과한다. 원인은 **추천 후보 목록에 이름이 없다**는 것이다.

| 항목 | 값 |
| --- | --- |
| `subjects.json` 전체 과목 | 406 |
| 그중 `area === "전문교과"` | 263 |
| `career-mapping.json` 추천 과목 총합 | 108 |
| 그중 전문교과 | **3** (문학 감상과 비평, 문학과 매체, 정보과학) |

추천 소스 두 종류가 모두 보통교과 위주다.

- `career-mapping.json` — 서울진로진학정보센터 안내서 기반. 보통교과 중심.
- 대교협 「2028학년도 권역별 대학별 권장과목」 — 국·수·영·탐 반영과목 위주. 전문교과 미수록.

대교협이 전문교과를 뺀 것은 "권장하지 않아서"가 아니라 **자료의 성격(대입 반영과목 안내)** 때문이다. 따라서 전문교과의 부재를 "권장 안 됨"으로 해석해서는 안 된다.

결과적으로 260개 전문교과가 구조적으로 추천 불가 상태다. 효자고가 실제 개설한 전문교과 8개 중 추천 가능한 것은 `정보과학` 하나뿐이다.

| 효자고 개설 전문교과 | professionalArea | 현재 추천 가능? |
| --- | --- | --- |
| 프로그래밍 | 정보·통신 | ✗ |
| 정보과학 | 과학계열 | ✓ |
| 드로잉 | 예술계열 | ✗ |
| 합창·합주 | 예술계열 | ✗ |
| 관광 일본어 | 미용·관광·레저 | ✗ |
| 관광 중국어 | 미용·관광·레저 | ✗ |
| 식품과 영양 | 음식조리 | ✗ |
| 현대 세계의 변화 | 국제계열 | ✗ |

## 활용 가능한 기존 자산

새 데이터를 만들 필요가 없다.

- 모든 전문교과에 **`professionalArea`가 이미 부여**되어 있다(22개 계열).
- `Subject` 타입에 `area: string`, `professionalArea?: string`가 이미 노출된다.
- 직전 작업에서 만든 `getInterestTagsByDept(deptName)`가 학과 → 관심분야 태그 환산을 제공한다. 관심사 플로우와 계열별 플로우 양쪽에 동일 로직을 태울 수 있다.

## 결정 사항

| 결정 | 선택 | 근거 |
| --- | --- | --- |
| 노출 방식 | 기존 학기별 추천 목록에 **통합** + 「전문교과」 라벨 | 학생이 "이 학기에 뭘 고를까"를 한 화면에서 판단해야 한다. 대교협 배지가 없는 과목(융합선택·탐구류)이 이미 목록에 섞여 있어 기존 패턴과 일관된다. |
| 추천 범위 | **학교가 실제 개설한 것만** | 전문교과 개설은 학교마다 천차만별이다. 미개설 과목 추천은 "들을 수 없는 과목" 노이즈다. 학교마다 편제가 다른 커리컴퍼스에서 특히 중요하다. |
| 계열 매핑 | **area 기본값 + 모호한 곳만 과목별 오버라이드** | 22줄 테이블로 대부분을 덮고, 예외만 수기 관리한다. 263개 전수 매핑은 헛수고가 많다. |
| 근거 문구 | **사실만 진술** | 문의가 출처·신뢰도에 집중돼 있다. 근거 없는 권위를 주장하지 않는다. |
| FAQ | **항목 1개 추가** | 이 기능이 정확히 새 문의를 유발할 지점이다. 선제 답변한다. |

## 아키텍처

기존 `consensus` 모듈의 이음새를 그대로 따른다. 순수 로직과 데이터 결합을 분리해, 순수 쪽을 `node:test`에서 직접 import할 수 있게 유지한다.

### `lib/professional-subjects.ts` (순수 — JSON import 금지)

```ts
export const AREA_TO_TAGS: Record<string, string[]>
export const SUBJECT_OVERRIDES: Record<string, string[]>

/** 오버라이드 우선, 없으면 area 기본값. 둘 다 없으면 [] */
export function resolveTagsForProfessional(
  name: string,
  professionalArea: string | undefined
): string[]
```

계약: `professionalArea`가 `undefined`이면 항상 `[]`을 반환한다. 오버라이드는 area 기본값을 **대체**한다(병합하지 않는다).

### `data/professional-subjects.ts` (데이터 결합)

```ts
/** 태그들에 해당하는 전문교과 Subject 목록 (개설 여부는 호출자가 필터) */
export function getProfessionalSubjectsForTags(tags: string[]): Subject[]
```

`subjects.json`에서 `area === "전문교과"`인 항목을 훑어, `resolveTagsForProfessional` 결과가 `tags`와 교집합을 가지면 포함한다.

### 매핑 테이블 초기값

`AREA_TO_TAGS` — 22개 area 전부를 키로 갖는다. 모호한 area는 **빈 배열**로 두고 오버라이드에 위임한다. 빈 배열은 "추천 안 함"을 뜻하며, 이는 현재 동작과 동일하므로 회귀가 없다.

| area | tags |
| --- | --- |
| 정보·통신 | `cs-ai` |
| 기계 | `mechanical-elec` |
| 전기·전자 | `mechanical-elec` |
| 재료 | `mechanical-elec` |
| 건설 | `architecture` |
| 화학공업 | `biotech` |
| 환경·안전 | `environment` |
| 경영·금융 | `business` |
| 음식조리 | `food-nutrition` |
| 식품가공 | `food-nutrition` |
| 농림·수산 | `food-nutrition`, `bio-earth` |
| 보건·복지 | `nursing-health`, `psychology-social` |
| 외국어계열 | `global` |
| 국제계열 | `global` |
| 체육계열 | `sports` |
| 섬유･의류 | `art-design` |
| 인쇄･출판･공예 | `art-design` |
| 디자인·문화콘텐츠 | `art-design`, `media-comm` |
| 과학계열 | `natural-science` |
| 예술계열 | *(빈 배열 — 오버라이드 위임)* |
| 미용·관광·레저 | *(빈 배열 — 오버라이드 위임)* |
| 전문공통 | *(빈 배열 — 계열 무관)* |

`예술계열`(62과목)은 음악·미술·무용·연극·영화·사진·문예창작이 한 area에 섞여 있다. area 기본값을 주면 음악 지망생에게 `드로잉`이 추천되는 오추천이 확정적으로 발생하므로 기본값을 두지 않는다. `미용·관광·레저`도 미용과 관광이 섞여 있어 같다.

`SUBJECT_OVERRIDES` 초기값 — 효자고 개설분과 개설 빈도가 높은 STEM·예술 과목부터 채운다. 나머지는 area 폴백 또는 빈 배열에 맡기고, 실제 개설 사례가 확인될 때 점진적으로 추가한다.

```
프로그래밍          → cs-ai, mechanical-elec   (area는 cs-ai만 주므로 확장)
정보과학            → cs-ai, natural-science
이산 수학           → natural-science, cs-ai
고급 물리학 / 물리학 실험     → natural-science, mechanical-elec
고급 화학 / 화학 실험         → natural-science, biotech
고급 생명과학 / 생명과학 실험 → bio-earth, biotech, medical
고급 지구과학 / 지구과학 실험 → bio-earth

드로잉 / 미술 이론 / 미술사 / 미술 전공 실기 / 조형 탐구
  / 미술 매체 탐구 / 미술과 사회 / 평면 조형 / 입체 조형 / 매체 미술  → art-design
합창·합주 / 합창 / 합주 / 음악 이론 / 음악사 / 시창·청음
  / 음악 전공 실기 / 음악 공연 실습 / 음악과 문화 / 공연 실습        → music-perform

관광 일반 / 관광 사업 / 관광 서비스 / 관광 영어 / 관광 일본어 / 관광 중국어 → global
미용의 기초 / 미용 안전·보건 → art-design
```

`프로그래밍`은 오버라이드가 area 기본값을 넘어서는 대표 사례다. `정보·통신` area는 `cs-ai`만 주지만, 기계공학 지망생에게도 권장할 만하므로 `mechanical-elec`을 더한다.

## 데이터 흐름

```
tags = interests                        (관심사 플로우)
     | getInterestTagsByDept(deptName)  (계열별 플로우)
        ↓
getProfessionalSubjectsForTags(tags)
        ↓
개설 필터: (selectableMap ∪ allSchoolNames) − excludedNames
        ↓
기존 allItems 에 isProfessional=true 로 합류
        ↓
기존 학기별 그룹핑 · 정렬 로직 그대로 통과
```

- 미개설 전문교과는 필터에서 빠지므로 "우리 학교 미개설 과목" 아코디언에도 들어가지 않는다.
- `정보과학`처럼 이미 `career-mapping`에 있는 과목은 기존 `seen` Set(`subject.id` 기준)이 자동으로 중복 제거한다.
- 적용 지점은 `recommend/page.tsx`의 `DeptRecommendContent`와 `InterestRecommendContent` 양쪽이다.

## UI

`SubjectCard`에 optional prop `professionalArea?: string`를 추가한다. 값이 있으면 합의도 배지 자리에 한 줄을 렌더한다.

> **[전문교과]** 우리 학교 개설 · 정보·통신 계열

- 대교협 배지는 데이터가 없으므로 자연히 붙지 않는다. 융합선택·탐구류가 이미 그 상태라 시각적으로 일관된다.
- 좌측 컬러바(side-accent, `border-l`)는 쓰지 않는다.
- 학기 섹션 내부 정렬: 보통교과 먼저, 전문교과 뒤. 안정 정렬(stable sort)로 기존 순서를 보존한다.

## 로드맵

- **커버리지 게이지는 변경하지 않는다.** 전문교과는 대교협 핵심과목 카운트가 0이므로 `coreCounts`에 들어가지 않고, 따라서 분모에도 들어가지 않는다. 게이지의 의미("대학이 핵심으로 지정한 과목 중 내가 이수한 비율")가 흔들리지 않는다.
- **`buildRecommendedNames` / `buildRecommendedNamesFromDept`에는 전문교과를 추가한다.** 그러지 않으면 `/recommend`에서 `프로그래밍`이 추천으로 뜨는데 `/roadmap`에서는 추천 표시가 없는 모순이 생긴다. 두 함수는 양쪽 앱에 같은 이름으로 존재한다(커리컴퍼스 쪽은 `subjectCatalog` 인자를 추가로 받는다).

## FAQ · 인라인 근거

양쪽 앱의 `/faq`에 항목 1개를 추가한다.

> **Q. 프로그래밍 같은 전문교과는 어떤 근거로 추천되나요?**
>
> 대교협 「권장과목」 자료는 대입에 반영되는 보통교과(국어·수학·영어·탐구) 위주로 작성되어 전문교과를 다루지 않습니다. 자료에 없다는 것이 "권장하지 않는다"는 뜻은 아닙니다.
>
> 전문교과 추천은 두 가지 근거로 표시됩니다. ① 우리 학교가 실제로 개설한 과목이고, ② 과목이 속한 전문교과 계열이 선택한 관심 계열과 일치합니다. 대학별 반영과목 근거가 아니므로 「핵심과목 지정 N개교」 배지가 붙지 않습니다.

`RecommendBasisNote`에도 같은 취지의 한 줄을 보강한다.

## 엣지 케이스

| 상황 | 동작 |
| --- | --- |
| 커리컴퍼스 업로드 과목명이 정적 카탈로그에 미매칭 | fallback Subject가 생성되며 `professionalArea`가 `undefined` → `resolveTagsForProfessional`이 `[]` 반환 → 추천 안 함 |
| 학과 → 태그 매핑 실패 (`getInterestTagsByDept`가 `[]`) | 전문교과 0개. 기존 동작과 동일 |
| 오버라이드와 area 기본값이 모두 존재 | 오버라이드가 **대체**한다 (병합 아님) |
| 과목이 `career-mapping`과 전문교과 양쪽에 존재 (`정보과학`) | `seen` Set의 `subject.id` 기준 중복 제거 |
| area가 빈 배열이고 오버라이드도 없음 | 추천 안 함. 현재 동작과 동일하므로 회귀 아님 |

## 테스트

`app/tests/professional-subjects.test.mjs` (기존 `consensus.test.mjs`와 동일 패턴, 순수 모듈만 import)

1. area 기본값으로 태그가 해석된다 (`기계` → `mechanical-elec`)
2. 오버라이드가 area 기본값을 대체한다 (`프로그래밍` → `cs-ai` + `mechanical-elec`)
3. `professionalArea`가 `undefined`이면 `[]`
4. 빈 배열 area(`예술계열`)는 오버라이드 없이는 `[]`
5. 오버라이드가 area와 무관한 태그를 추가할 수 있다 (`고급 생명과학` → `medical`)

데이터 결합 함수와 개설 필터·중복 제거는 페이지 레벨 동작이므로, 로컬 prod 서버 + Playwright로 계열별·관심사별 플로우 양쪽에서 `프로그래밍` 노출을 확인한다.

**주의:** `node --test tests/`는 Node 24에서 디렉터리 인자를 오해석한다. `node --test tests/*.mjs`로 실행할 것.

## 검증 기준

- 효자고 `/recommend?interests=cs-ai` 및 `/recommend?dept=기계공학과`에 `프로그래밍`이 「전문교과」 라벨과 함께 노출된다.
- 같은 화면에서 `프로그래밍`에는 대교협 배지가 붙지 않는다.
- `/roadmap`에서 `프로그래밍`이 추천 과목으로 표시된다.
- 로드맵 커버리지 게이지 백분율이 변경 전과 동일하다.
- 미개설 전문교과(예: `고급 지구과학`)는 어디에도 노출되지 않는다.
- 커리컴퍼스 공유 링크에서 동일하게 동작한다.

## 범위 밖

- 263개 전문교과 전수 매핑
- 전문교과에 대한 대학별 반영 여부 조사
- 공동교육과정으로 수강 가능한 미개설 전문교과 안내
