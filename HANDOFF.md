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
