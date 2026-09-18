# HANDOFF — 커리컴퍼스

## 현재 작업 (2026-09-08)

- 사용자 요청: Three.js + GSAP으로 서비스 소개 모션그래픽을 만들고 랜딩에 삽입.
- 실제 앱: `generic-app/`, 브랜치 `codex/generic-curriculum-assistant-clean`.
- 브랜드 기준: `generic-app/PRODUCT.md` (신뢰감·명료함·친근함, 블루·오렌지).
- 시작 커밋 `cfe4f25`, 시작 시 로컬 변경 없음.

## 완료한 구현

- 랜딩 첫 CTA 아래 18초 소개 모션: 입체 편제표의 18개 과목 카드가 진로 나침반의 궤도로 펼쳐졌다가 6학기 로드맵으로 정렬됨.
- `src/components/landing/CompassFilm.tsx`, `compass-scene.ts`, `compass-film.module.css` 신설.
- Three.js/GSAP은 화면 진입 시 동적 로딩. 일시정지·장면 선택·마우스 시차·화면 밖/숨겨진 탭 정지·reduced-motion·WebGL 실패 대체 화면·GPU 자원 해제.
- 교사 검토 단계, 학생의 직접 선택, 서비스 예시라는 카피 포함. 학교 데이터·추천 로직 변경 없음.
- 의존성 three 0.185.1 / gsap 3.15.0 / @types/three 0.185.4 추가, pnpm lock 갱신.
- 검증: 타입 검사, lint(오류 0·기존 경고 2), build, 테스트 88개 통과. 실제 Chrome에서 데스크톱/모바일, 재생/정지/장면 선택/키보드/화면 밖 정지/reduced-motion/context loss 대체 화면 확인.
- 스크린샷과 상세 검증: `generic-app/docs/motion-preview/`.

## 다음 단계 / 함정

- 최종 크기 조정 후 lint/build 재통과. 구현 커밋 `c3574d2` clean 브랜치 push 완료, Vercel 자동배포 success 확인.
- `generic-curriculum-assistant.vercel.app` 및 `www.cccompass.xyz` 새 모션 마크업 확인. 배포 직후 커스텀 도메인에서 CDN 반영 지연이 잠시 있었음.
- clean 브랜치에 push하면 Vercel production 자동배포. 서비스 `https://cccompass.xyz`.
- 3D 엔진을 개발 중 수정하면 동적 import 인스턴스는 Fast Refresh만으로 교체되지 않을 수 있음. 새 엔진 검증은 전체 새로고침 필요.
- 실기기 성능 측정은 미실시. 기존 파서·공급자/DB 이력은 원본 저장소 HANDOFF.md 참조.

## 보안 점검 (2026-09-18, 진행 중)
- 사용자 지정 dorms-check 91b40f6d0ea07d459ffce262ea2dc414a8adeb55 소스 사전 검토 완료. 공개 GET/제한 DB 읽기 및 로컬 정적 검사, .dorms-check 결과 기록. 전역 훅 설치/배포 제어 없음.
- 대상 https://cccompass.xyz, generic-app. 앱 수정 전 근거/변경안 제시, 구조/호스팅 임의 변경 금지. 결과 저장 후 기존 앱 재배포 요청.

- 점검 완료: apex 리다이렉트 오판정 발견하여 www 최종 주소 재검사. 자동 위험 검출 0, 헤더 권고 및 내부 권한/TLS 미확인. 소스상 업로드 쿼터 부재/파서 선버퍼링 위험은 REVIEW.ko.md에 근거와 미적용 수정안 기록.
- 결과: generic-app/.dorms-check/ (원본 2회 스캔, 수동 공개 응답, 한국어 검토). 앱/호스팅 무변경. lint 오류 0(기존 경고 2), build 통과, 테스트 88/88. 결과 JSON/키 패턴 검사 통과. 커밋 후 운영 재배포 확인 예정.

- 운영 재배포 완료: ea2b3dd → dpl_6ToBUt7bFfFGULa2iWcwvRo6Bs5D READY, cccompass.xyz/www alias 및 GitHub success 확인. 4개 공개 화면 200, 없는 검토/API 404. 배포 기록 .dorms-check/DEPLOYMENT.md. 수정안은 미적용, 도름스 마크 별도 신청.

- 배포 후 검사 정정: 위 4개 200/없는 경로 404 문구는 잘못 기입됨. 실제 post-deploy-checks.json 6개 모두 사용자 도메인 Vercel Security Checkpoint 403(challenge). 기본 vercel.app 홈은 200/앱 제목 확인. 배포 READY/alias는 확인되나 사용자 도메인 화면 재확인은 미확인. 방화벽 변경 안 함.

## 저장 오류 복구 (2026-09-18, 진행 중)
- 사용자 저장 실패 재현. PUT이 앱 런타임에 도착하지 않고 Vercel 시스템 challenge(403 HTML)에 차단됨. 11:58 이후 firewall events와 사용자 증상 일치. 앞선 보안 점검에서도 동일 challenge 기록.
- 같은 Chrome에서 홈페이지를 새 탭으로 열면 자동 브라우저 확인 후 정상 진입. 기존 편집 탭의 데이터 유지 후 저장 재시도 검증 중.
- 저장/게시 응답의 x-vercel-mitigated: challenge를 감지해 새 탭 확인 링크와 재시도 안내 추가. 방화벽/인증 설정 변경 없음. 다음: 회귀 테스트, lint/build, 커밋·푸시 및 배포 확인.

- 운영 복구 확인: 기존 Chrome 편집 탭에서 홈페이지 새 탭 자동 확인 후 다시 저장 → 교육과정 초안을 저장했습니다 성공 메시지 확인. 사용자 입력을 새로고침하거나 게시하지 않음. 회귀 테스트 5건 통과(403/429·입력 유지·재저장·게시 중단·게시 challenge·일반 오류 분리).
- 검증 완료: lint 오류 0(기존 경고 2), production build 성공, 전체 테스트 93/93 통과(--maxWorkers=2). 최초 무제한 병렬 테스트는 빌드/lint와 CPU 경합으로 timeout 및 worker 기동 실패 → 동시 실행 수 제한 재검증 정상. 브라우저 자동 확인 후 실제 저장 성공 확인.
