# 검증 및 운영 재배포

- 일시: 2026-09-18 (KST).
- 코드 검사: npm run lint — 오류 0, 기존 경고 2 (img 요소, 미사용 CohortData).
- 테스트: npm test -- --reporter=dot — 19개 파일, 88/88 통과. 기존 act/revalidatePath 테스트 경고 있음.
- 빌드: npm run build — Next.js 16.2.6 production build 통과.
- 결과 JSON 파싱 및 보고서 비밀키 패턴 검사 통과.
- 점검 결과 커밋: ea2b3dd, codex/generic-curriculum-assistant-clean에 push 완료.
- 배포: Vercel production READY, dpl_6ToBUt7bFfFGULa2iWcwvRo6Bs5D.
- 배포 URL: https://generic-curriculum-assistant-2ei36c2mf.vercel.app
- 운영 연결 확인: https://www.cccompass.xyz 및 https://cccompass.xyz, generic-curriculum-assistant.vercel.app가 해당 배포의 aliases에 포함됨.
- GitHub Vercel 상태 success 확인.
- 배포 후 공개 GET 확인은 post-deploy-checks.json 참조. 홈·생성·가이드·FAQ 200, 존재하지 않는 검토/API 404.
- 운영 데이터 변경·실제 업로드·AI 호출은 수행하지 않음. 런타임 전체 오류 로그·장기 모니터링 상태는 미확인.
- 앱 코드, 환경변수, DB, 호스팅 구성 변경 없음. 제안된 보안 수정은 적용하지 않음.
- 원격 저장소는 ghga20-ui/cccompass로 이동되어 기존 remote URL이 리다이렉트됨. remote 설정은 변경하지 않음.
