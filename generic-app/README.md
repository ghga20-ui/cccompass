# 커리컴퍼스 · CurriCompass

**학교 편제표만 올리면, 그 학교 학생을 위한 선택과목 안내 화면이 만들어집니다.**

2022 개정 교육과정에서 학생은 고2·고3에 걸쳐 수십 개의 선택과목을 골라야 합니다. 커리컴퍼스는 교사가 올린 **학교 편제표**를 읽어, 그 학교에 실제로 개설된 과목만으로 학생에게 계열·관심분야별 추천과 3년 로드맵을 제공합니다.

- 서비스: <https://cccompass.xyz>
- 만든 이: 효자고등학교 박세준 · <ghga20@gmail.com>
- 원형: 효자고등학교 선택과목 도우미(`../app`). 그 앱을 전국 어느 학교나 쓸 수 있게 일반화한 것이 이 앱입니다.

## 무엇을 하는가

**교사** — 편제표 파일을 올리면 과목·학점·선택과목군이 자동으로 정리됩니다. 검토·수정한 뒤 게시하면 학생용 공유 링크가 나옵니다.

**학생** — 공유 링크로 들어가 관심 계열이나 희망 학과를 고르면, **우리 학교에 개설된 과목 중에서** 추천을 받고 3년 로드맵을 짭니다.

추천 과목에는 근거가 함께 붙습니다. 「핵심과목 지정 12개교」 같은 배지는 대교협 자료에서 그 과목을 지정한 대학 수이고, 배지가 없는 과목은 대입 반영과목은 아니지만 세특·탐구활동에 좋은 과목입니다. 로드맵 상단의 「대학 핵심과목 N%」 게이지는 여러 대학이 핵심으로 지정한 과목 중 몇 개를 이수하게 되는지를 보여줍니다.

자세한 근거와 자료 출처는 서비스 내 [`/faq`](https://cccompass.xyz/faq)에 정리해 두었습니다.

## 추천 데이터의 출처

| 데이터 | 출처 | 쓰임 |
| --- | --- | --- |
| 계열·학과별 추천 과목 | 2026학년도 입학생을 위한 2022 개정 교육과정 선택 과목 안내서 (서울진로진학정보센터) | 추천 후보 목록 |
| 대학별 핵심·권장과목 | 한국대학교육협의회 「2028학년도 권역별 대학별 권장과목」(2026.2, 47개 대학) | 합의도 배지, 로드맵 커버리지, 추천 보강 |
| 전문교과 계열 분류 | 과목별 `professionalArea` (22개 계열) | 학교가 개설한 전문교과 추천 |

대교협 자료는 **대입에 반영되는 보통교과 위주**라 전문교과(예: `프로그래밍`)를 다루지 않습니다. 자료에 없다는 것이 권장하지 않는다는 뜻은 아니므로, 전문교과는 ① 우리 학교가 실제로 개설했고 ② 과목의 전문교과 계열이 학생의 관심 계열과 맞을 때 「전문교과」 라벨과 함께 추천합니다. 대학별 반영과목 근거가 아니므로 합의도 배지는 붙지 않습니다.

이 자료들은 **필수 이수 기준이 아니라 참고자료**입니다.

## 화면 구성

**교사 흐름**

| 경로 | 설명 |
| --- | --- |
| `/create` | 편제표 업로드 |
| `/review/[draftId]` | 파싱 결과 검토·수정 |
| `/published/[draftId]` | 게시 완료 — 학생용 공유 링크와 수정용 토큰 발급 |
| `/edit/[editToken]` | 게시 후 재수정 |
| `/guide`, `/faq` | 사용 안내, 자료 출처·자주 묻는 질문 |

**학생 흐름** (공유 토큰으로 범위가 한정됩니다)

`/s/[shareToken]` · `/recommend` · `/roadmap` · `/subjects` · `/subjects/[id]` · `/exhibition`

고1 데이터는 교사 검토·수정용으로만 남고, 학생 공개 경로에서는 모두 걸러집니다. 학생 화면은 고2·고3 개설분만 노출합니다.

## 업로드 제약

- 허용 확장자: `.pdf` `.hwp` `.hwpx` `.xlsx` `.xlsm` `.docx`
- 최대 5MB
- **PDF는 편제표만, 최대 3쪽.** 도움자료집·총론이 통째로 섞인 대용량 PDF는 파싱 전에 막습니다. 입력 토큰·비용·지연이 폭증하고 정확도가 떨어지기 때문입니다. 교육과정부 교사는 순수 편제표 파일을 따로 갖고 있습니다.

## 아키텍처

- **앱** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind. Vercel 배포.
- **DB** — PostgreSQL(Supabase) + Prisma. 업로드된 편제 초안과 게시본을 저장합니다.
- **파서** — 문서 파싱은 이 Vercel 앱 **바깥**의 별도 워커(`../parser-worker`)가 담당합니다. 앱은 파일 바이트를 `POST /parse`로 보내고 텍스트·표를 돌려받은 뒤, 그 결과를 LLM으로 구조화합니다.

공유 뷰의 과목 상세는 DB가 아니라 앱에 포함된 정적 `subjects.json`(`createSubjectCatalog`)에서 옵니다. 편제표에 있지만 카탈로그에 없는 과목명은 최소 정보만 가진 fallback 과목으로 처리됩니다.

## 배포

이 앱은 **자체 Vercel 프로젝트**로 배포합니다. 프로젝트 루트 디렉터리를 `generic-app`으로 지정하고, 필요한 환경변수를 그 프로젝트에 설정하세요. 효자고 앱(`../app`) 배포는 건드리지 않습니다.

> **중요 — 브랜치 구조**
>
> | 브랜치 | 배포 대상 | 소스 |
> | --- | --- | --- |
> | `main` | 효자고 (hyoja-curriculum.vercel.app) | `app/` |
> | `codex/generic-curriculum-assistant` | (개발 라인) | `app/` |
> | `codex/generic-curriculum-assistant-clean` | **커리컴퍼스 (cccompass.xyz)** | `generic-app/` |
>
> 커리컴퍼스 실배포는 `codex/generic-curriculum-assistant-clean` 브랜치에서만 이뤄집니다. 개발 브랜치에 커밋하는 것만으로는 배포되지 않습니다.

첫 배포 전에 `supabase/migrations`의 SQL을 프로덕션 DB에 적용해 스키마를 준비하세요. Supabase CLI를 쓴다면 프로젝트를 link한 뒤 해당 SQL을 실행합니다. `db:push`는 로컬 임시 DB에만 쓰세요.

## 로컬 개발

모든 명령은 `generic-app/`에서 실행합니다. 이 프로젝트는 Corepack을 통해 pnpm을 씁니다. 전역 `pnpm` shim이 없으면 `corepack pnpm install`처럼 앞에 `corepack`을 붙이세요.

DB 명령이 `DATABASE_URL`을 필요로 하므로 환경파일을 먼저 만듭니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
CURRICULUM_PARSER_PROVIDER="kordoc"
PARSER_SERVICE_URL="https://your-parser-worker.example.com"
PARSER_SERVICE_TOKEN="shared-secret"
CURRICULUM_STRUCTURER_PROVIDER="openai"
OPENAI_STRUCTURER_MODEL="gpt-5.5"
OPENAI_REASONING_EFFORT="low"
OPENAI_API_KEY=""
```

`mock` 프로바이더는 로컬 스모크 테스트용입니다. 프로덕션은 별도 파서 워커를 호출한 뒤 추출된 텍스트·표를 OpenAI로 구조화해야 합니다.

```bash
pnpm install
pnpm run db:generate   # Prisma 클라이언트 생성
pnpm run dev           # 기본 http://localhost:3000
```

로컬 임시 DB라면 `pnpm run db:push`로 `prisma/schema.prisma`에서 테이블을 만들 수 있습니다.

### 파서 워커

`../parser-worker`를 별도 서비스로 배포하고 Kordoc 호환 어댑터를 설정한 뒤, 여기에 `PARSER_SERVICE_URL`과 `PARSER_SERVICE_TOKEN`을 지정합니다. 앱은 `POST /parse`에 파일 바이트를 보내고 다음을 기대합니다.

```json
{
  "text": "extracted text or markdown",
  "tables": [["header", "value"]],
  "metadata": { "parser": "kordoc" }
}
```

## 검사

변경을 올리기 전에 실행합니다.

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:e2e:hyoja
```

효자고 패리티 공개 화면만 확인하려면 `pnpm run test:public`.

E2E는 Playwright로 실제 Chrome을 띄웁니다. 기본은 결정적인 로컬 JSON 스토어를 쓰고, 실제 PostgreSQL을 선호하는 환경을 위해 `tests/e2e/docker-compose.postgres.yml`을 남겨 두었습니다. E2E 서버 기본 포트는 `3100`이며 `E2E_PORT`로 바꿀 수 있습니다.

> 추천 배지·라벨·게이지는 하이드레이션 이후 클라이언트에서 렌더됩니다. `curl | grep`으로는 절대 잡히지 않으니, 라이브 확인은 반드시 브라우저(Playwright)로 하세요.
