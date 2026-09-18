# 커리컴퍼스 기본 보안 점검 — 2026-09-18

## 결론과 범위

지정 버전 자동 점검에서 확인된 공개 비밀정보 노출은 없습니다. 이것은 전체 보안 보증이 아닙니다. 추가 소스 검토에서 업로드 비용 남용 방어 부재와 파서 본문 처리의 자원 소모 위험을 확인했습니다. 악용 재현·부하 시험은 하지 않았습니다.

- 대상: https://cccompass.xyz → https://www.cccompass.xyz/
- 앱: generic-app, 소스 기준 75671a0, 브랜치 codex/generic-curriculum-assistant-clean.
- 로컬 추가 검토: 형제 프로젝트 parser-worker의 HTTP 본문 처리. 해당 서버의 운영 설정은 점검하지 않았습니다.
- 공개 GET, 로컬 소스 읽기, 기존 로컬 검증만 수행했습니다. 운영 데이터 작성·수정·삭제, 유료 AI 호출, 마크 신청은 하지 않았습니다.
- 앱 코드·DB·호스팅·보안 설정 변경 없음. 아래 수정안은 아직 적용하지 않은 제안입니다. 기존 앱의 재배포는 별도 사용자 요청에 따릅니다.

## 실행 전 도구 검토

- 출처: https://github.com/shinnanchanguk/dorms-check/tree/91b40f6d0ea07d459ffce262ea2dc414a8adeb55
- package.json 버전 0.3.1. 다운로드한 tar.gz SHA-256: D3D733532E47457A7A604B1EB806AA7B1D39DAFAA1A49B9228C6F26E942158DA.
- bin/dcheck.js의 scan 분기는 공개 응답 검사 → 선택적 공개 DB/API 읽기 → 로컬 정적 검사 → .dorms-check/REPORT.md, scan.json, state.json 기록 순서입니다.
- 공개 점검: GET으로 본문·스크립트·비밀파일 후보 경로·CORS·방침 경로 등을 확인합니다. DB 주소와 공개 키가 발견되면 Supabase 테이블 최대 40개에 SELECT limit 1, Firebase는 shallow 읽기, 발견된 API는 최대 20개 GET입니다. 데이터 쓰기 프로브는 없습니다.
- 공개 요청은 전체 45초 예산, 요청별 시간·본문 크기 상한이 있습니다. CLI는 기본 fetch를 사용하며 리다이렉트/발견된 외부 스크립트·DB로도 연결할 수 있습니다.
- 로컬 코드 원문 업로드·자동 배포·전역 훅 설치 동작은 scan 경로에서 발견하지 못했습니다. 훅 status/uninstall은 레거시 정리용 별도 명령입니다. protect/edzip 적용은 별도 명령이며 실행하지 않았습니다.
- package.json에 설치 생명주기 스크립트가 없음을 확인했습니다. 의존성 전체 보안 감사를 했다는 뜻은 아닙니다. npm_config_ignore_scripts=true를 해당 실행 프로세스에 설정하여 npx 설치 스크립트를 차단했습니다. npm 캐시 외 전역 설치/설정 변경 없음.

실행 디렉터리는 generic-app이며 명령은 다음과 같습니다.

```text
npx -y https://github.com/shinnanchanguk/dorms-check/archive/91b40f6d0ea07d459ffce262ea2dc414a8adeb55.tar.gz scan --url https://cccompass.xyz --track security
npx -y https://github.com/shinnanchanguk/dorms-check/archive/91b40f6d0ea07d459ffce262ea2dc414a8adeb55.tar.gz scan --url https://www.cccompass.xyz --track security
```

## 확인된 위험 — 소스 수준

### 1. 업로드에 앱 자체 요청 횟수·비용 제한이 없음

- 근거: src/app/api/curricula/upload/route.ts:100부터 POST 처리, 162에서 파서, 191에서 AI 호출. 인증·쿼터 검사 없이 파일 검사를 통과하면 호출됩니다. src 전체에서 요청 제한 구현을 찾지 못했습니다.
- 영향: 반복 업로드로 파서 자원과 AI 비용이 증가할 수 있습니다. 5MB와 PDF 페이지 제한은 개별 파일 제한이지 요청 횟수 제한이 아닙니다.
- 한계: Vercel 방화벽·플랫폼 제한·AI 계정 예산은 미확인입니다. 실제 비용 피해 또는 무제한 운영 요청 성공을 확인한 것은 아닙니다.
- 제안: 기존 호스팅 안에서 업로드 라우트별 속도·일일 쿼터, 동시 처리 상한과 비용 상한을 설계하고 외부 호출 전에 429로 거부합니다. 허용 횟수·사용자 식별 방식은 결정이 필요합니다. 서버리스 메모리 Map만으로 제한을 구현하면 인스턴스마다 우회되므로 피해야 합니다.

### 2. 파서가 본문을 모두 메모리에 읽은 후 인증·크기를 검사함

- 근거: parser-worker/src/server.ts:11–24의 readBodyText는 전체 요청을 chunks에 쌓고 Buffer.concat합니다. 이후 handler.ts:67에서 인증, 71에서 크기를 검사합니다.
- 영향: 애플리케이션 수준에서는 거부할 요청도 본문을 먼저 읽으므로 메모리·연결 자원을 소모할 수 있습니다.
- 한계: Render의 앞단 제한과 실제 운영 메모리 고갈 여부는 미확인입니다. 대용량 요청은 보내지 않았습니다.
- 제안: 기존 서버에서 본문 읽기 전 메서드·경로·인증 확인, 스트림 누적 바이트 상한 초과 시 413 반환, 읽기 오류·중단 처리 및 작은/초과/미인증 요청 테스트를 추가합니다. 서버 이전은 필요하지 않습니다.

## 권고 — 실제 누락과 개선안

1. **보안 헤더**: 운영 홈에 CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy가 없습니다. next.config.ts에도 설정이 없습니다. 제안은 nosniff, no-referrer, SAMEORIGIN 및 불필요 권한 제한입니다. 외부 학교 사이트의 iframe 사용 여부를 확인한 후 프레임 정책을 확정해야 합니다. CSP는 외부 폰트·Next.js 스크립트·3D 동작에 영향을 주므로 Report-Only 검증부터 설계합니다. 헤더 부재만으로 XSS 침해가 있었다고 판단하지 않습니다.
2. **수정 링크 보호**: edit/[editToken]/page.tsx:25 및 게시 응답은 수정 토큰을 URL 쿼리에 넣습니다. 링크 소유자가 수정 권한을 가지며 브라우저 기록·URL을 수집하는 로그에 남을 수 있습니다. 실제 유출은 미확인입니다. 우선 no-referrer와 토큰 로그 마스킹, 이후 만료·회전 또는 세션 교환안을 검토합니다. 사용자 흐름 변경은 아직 적용하지 않았습니다.
3. **파서 인증의 실패 허용**: parser-worker/src/handler.ts:35는 PARSER_SERVICE_TOKEN이 없으면 인증을 허용합니다. 운영 변수 존재 여부는 미확인입니다. 운영에서는 필수 설정 누락 시 시작 실패 또는 접근 거부하도록 변경하는 안을 제안합니다. 설정 확인 없이 변경하면 업로드 장애가 날 수 있습니다.
4. **안내 문서**: 공개 /privacy, /terms는 최종 주소에서 404입니다. 실제 문서 보관 기간, 외부 AI 전달 범위, 운영자 연락처에 맞는 방침과 약관 페이지 작성을 권고합니다. 법적 적합성 판단은 이번 점검 범위 밖입니다.
5. **CORS**: 최종 주소의 공개 홈은 Access-Control-Allow-Origin: *입니다. 공개 HTML의 * 자체가 취약점은 아닙니다. 인증 API의 임의 Origin·credentials 조합은 별도 검증이 필요하며 일괄 차단을 제안하지 않습니다.
6. Open Graph·canonical은 보안 결함이 아닌 검색/공유 품질 권고입니다. 검토 페이지 404에 Next.js 식별 헤더가 보였지만 버전 숫자는 확인되지 않았습니다.

## 확인하지 못한 내용

- Supabase 실제 RLS, 테이블 권한, 운영 DB 연결 계정 권한. 서버 Prisma 사용은 확인했지만 이것만으로 RLS를 판정할 수 없습니다.
- Firebase는 로컬 의존성과 공개 번들에서 사용 근거를 찾지 못했습니다. 도구의 미확인은 Firebase 도입/교체 필요를 뜻하지 않습니다.
- 실제 유효한 초안으로 수행하는 사용자 간 권한 침해 테스트. 로컬 GET/PUT/발행 코드는 x-edit-token을 검사하고 토큰은 randomBytes(24), 즉 192비트입니다. 존재하지 않는 ID에 대한 운영 404 확인만으로 유효 초안 보호를 입증하지 않습니다.
- 구형 TLS 협상, 전체 인증서 구성, 모든 라우트·클라이언트 청크·오류 응답·소스맵의 노출 여부.
- 공급망 취약점 전체 감사, 운영 비밀키 유효성/과거 로그 노출 및 회전 여부, 플랫폼 방화벽, 모니터링·백업·보존 설정.
- 브라우저 팝업이나 비공개 화면의 개인정보처리방침, 실제 동의 절차.
- 도구의 파일 탐색은 .next/node_modules 등 제외 및 파일 수 상한이 있습니다. path.extname 방식 때문에 .env.local 등의 이름을 의도대로 검사하지 못할 수 있어 '시크릿 미검출'을 환경변수 전수 검사로 해석하면 안 됩니다.

## 자동 결과 해석 및 교정

- 최초 apex 검사: 확인 31·미확인 4·해당 없음 1. 원본은 scan-apex.json과 REPORT-apex.md입니다.
- 최종 www 검사: 확인 30·미확인 5·해당 없음 1. 원본은 scan.json과 REPORT.md입니다. '확인'에는 권고도 포함되므로 통과 30개라는 뜻이 아닙니다.
- legal-pages.js는 200 이상 400 미만을 '페이지 발견'으로 분류합니다. apex의 www 이동 응답(308)을 방침/약관 존재로 잘못 판정했습니다. 최종 www에서 다시 점검해 두 경로의 404를 확인했습니다.
- CORS도 redirect: manual로 최초 URL만 보아 apex에서는 양호, 최종 www에서는 공개 wildcard로 나타났습니다.
- 자동 REPORT.md 제목의 앱 '(이름 없음)' 및 주소 '(로컬)'은 --url을 보고서 설정 메타에 반영하지 않는 도구 표시 문제입니다. 실제 검사 URL은 scan.json의 url/raw.finalUrl로 확인했습니다. 원본 보고서는 수정하지 않았습니다.
- 수동 공개 응답 근거는 manual-public-checks.json입니다. 보고서에 키·토큰·운영 자료 원문을 넣지 않았습니다.

## 검증과 배포

검증 및 재배포 완료 기록은 DEPLOYMENT.md에 남깁니다. 도름스 마크는 별도 앱 화면 신청 절차이며 이 점검으로 발급되거나 신청되지 않았습니다.
