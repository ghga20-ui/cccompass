import {
  CreateScreen,
  LandingScreen,
  ProgressModalScreen,
  ReviewScreen,
  ShareScreen,
} from "../screens/teacher";
import type { TutorialDef } from "../types";

export const teacherTutorial: TutorialDef = {
  id: "teacher",
  title: "선생님용 사용법",
  intro:
    "편제표 한 번만 올리면, 우리 학교가 실제 개설한 과목으로 학생 안내 페이지가 만들어집니다. 직접 따라 해볼 수 있어요.",
  voice: "formal",
  screens: [
    { id: "landing" },
    { id: "createEmpty" },
    { id: "createFilled" },
    { id: "progressModal" },
    { id: "reviewBanner" },
    { id: "reviewDesignated" },
    { id: "reviewSelectionGroup" },
    { id: "reviewActions" },
    { id: "shareLink" },
  ],
  screenComponents: {
    landing: LandingScreen,
    createEmpty: CreateScreen,
    createFilled: CreateScreen,
    progressModal: ProgressModalScreen,
    reviewBanner: ReviewScreen,
    reviewDesignated: ReviewScreen,
    reviewSelectionGroup: ReviewScreen,
    reviewActions: ReviewScreen,
    shareLink: ShareScreen,
  },
  applyStepEffect: (stepId, ui) => {
    if (stepId === "s4-upload" || stepId === "s5-progress") {
      return { ...ui, fileChip: true, schoolName: "효자고등학교" };
    }
    return ui;
  },
  steps: [
    {
      id: "s1-intro",
      screen: "landing",
      title: "여기서 시작해요",
      coachTip:
        "편제표 한 번만 올리면, 우리 학교가 실제 개설한 과목으로 학생 안내 페이지가 만들어져요. ‘편제표 올리고 시작하기’를 눌러 직접 해볼게요.",
      target: "startCtaBtn",
      arrow: "down",
      interactive: true,
      action: "‘편제표 올리고 시작하기’ 클릭",
    },
    {
      id: "s2-create-overview",
      screen: "createEmpty",
      title: "업로드 화면 둘러보기",
      coachTip:
        "상단 1→2→3 단계로 진행돼요: 파일 올리기 → 검토·수정 → 학생에게 공유. 먼저 학교명과 편제표 파일만 준비하면 됩니다.",
      target: "stepIndicator",
      arrow: "down",
      interactive: false,
      action: "next",
    },
    {
      id: "s3-dropzone",
      screen: "createEmpty",
      title: "편제표 끌어다 놓기",
      coachTip:
        "이 점선 영역에 편제표를 끌어다 놓거나 눌러서 선택하세요. PDF·HWP·HWPX·엑셀·워드, 5MB까지 돼요. 여러 학년도가 섞인 파일보다 ‘한 학년도 입학생 편제표’가 정확합니다. 파일을 올려 볼게요.",
      target: "dropzone",
      arrow: "up",
      interactive: true,
      action: "드롭존에 편제표 올리기",
    },
    {
      id: "s4-upload",
      screen: "createFilled",
      title: "업로드하고 분석하기",
      coachTip:
        "파일이 올라가고 학교명도 채워졌네요. ‘업로드하고 분석하기’를 누르면 AI가 편제표를 읽기 시작합니다.",
      target: "uploadBtn",
      arrow: "up",
      interactive: true,
      action: "‘업로드하고 분석하기’ 클릭",
    },
    {
      id: "s5-progress",
      screen: "progressModal",
      title: "AI가 편제표를 정리하는 중",
      coachTip:
        "파서 준비 → 문서 읽기 → 표 구조 분석 → AI가 과목 정리 순으로 진행돼요. 약 1분이면 끝나고 검토 화면으로 자동 이동합니다.",
      target: "progressBar",
      arrow: "none",
      interactive: false,
      action: "next",
    },
    {
      id: "s6-check-banner",
      screen: "reviewBanner",
      title: "확인 필요 항목부터 점검",
      coachTip:
        "AI가 자동으로 읽었지만 완벽하진 않아요. 노란 배너의 ‘확인이 필요한 항목’과 표시된 과목을 원본과 비교해 점검하세요. 학년 탭을 옮겨가며 봅니다. 2학년 탭을 눌러볼게요.",
      target: "gradeTab2",
      arrow: "down",
      interactive: true,
      action: "‘2학년’ 탭 클릭",
    },
    {
      id: "s7-fix-flagged",
      screen: "reviewDesignated",
      title: "확인 필요 과목 점검·수정",
      coachTip:
        "지정 과목은 과목명·학점을 바로 고칠 수 있어요. 노란 ‘미확인 과목’은 2022 보통교과 목록에 없는 경우라, 표준 과목명으로 고치면 학생 화면의 추천에 반영돼요. 의도한 과목이면 그대로 두고, 잘못 읽힌 항목은 삭제로 정리하세요.",
      target: "flaggedRow",
      arrow: "left",
      interactive: false,
      action: "next",
    },
    {
      id: "s8-selection-group",
      screen: "reviewSelectionGroup",
      title: "선택군 · 택N · 집중이수",
      coachTip:
        "학생이 고르는 묶음은 ‘선택군 추가’로 만들어요. 한 선택군은 ‘과목당 학점’ 하나로 묶이고, ‘택1’처럼 정확히 또는 ‘택1~2’처럼 범위로 선택 수를 정할 수 있어요. 학기를 번갈아 여는 과목은 집중이수로 처리합니다. ‘선택군 추가’를 눌러볼게요.",
      target: "addGroupBtn",
      arrow: "left",
      interactive: true,
      action: "‘선택군 추가’ 클릭",
    },
    {
      id: "s9-publish",
      screen: "reviewActions",
      title: "저장하고 게시",
      coachTip:
        "검토가 끝나면 ‘저장’으로 보관하고, 오렌지색 ‘게시’를 누르면 학생용 안내 화면에 반영됩니다. ‘게시’를 눌러볼게요.",
      target: "publishBtn",
      arrow: "up",
      interactive: true,
      action: "‘게시’ 클릭",
    },
    {
      id: "s10-share",
      screen: "shareLink",
      title: "학생 공유 링크 발행",
      coachTip:
        "끝났습니다. ‘링크 복사’로 학생 안내 페이지 주소를 받아 학급·가정통신문에 공유하세요. 학생은 이 링크에서 우리 학교 과목으로 3년 로드맵을 짜게 됩니다.",
      target: "copyLinkBtn",
      arrow: "up",
      interactive: true,
      action: "‘링크 복사’ 클릭",
    },
  ],
};
