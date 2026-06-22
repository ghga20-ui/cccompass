import {
  HomeScreen,
  RecommendScreen,
  RoadmapScreen,
} from "../screens/student";
import type { TutorialDef } from "../types";

export const studentTutorial: TutorialDef = {
  id: "student",
  title: "학생용 사용법",
  intro:
    "관심 분야만 고르면, 우리 학교가 진짜 개설한 과목으로 3년 수강 로드맵까지 직접 완성해볼 수 있어.",
  voice: "casual",
  screens: [
    { id: "home" },
    { id: "homeTagSelected" },
    { id: "recommend" },
    { id: "roadmap" },
    { id: "roadmapFilled" },
  ],
  screenComponents: {
    home: HomeScreen,
    homeTagSelected: HomeScreen,
    recommend: RecommendScreen,
    roadmap: RoadmapScreen,
    roadmapFilled: RoadmapScreen,
  },
  applyStepEffect: (stepId, ui) => {
    switch (stepId) {
      case "s2-interest":
        return { ...ui, cohort: "go1" };
      case "s3-dept-optional":
      case "s4-go-recommend":
        return { ...ui, cohort: "go1", selectedTag: "ai" };
      case "s9-fill-credits":
      case "s10-share":
        return { ...ui, picked: ["미적분"] };
      default:
        return ui;
    }
  },
  steps: [
    {
      id: "s1-intro",
      screen: "home",
      title: "내 학년부터 골라요",
      coachTip:
        "여기는 효자고 학생 홈이야. 먼저 ‘고1’ 또는 ‘고2’ 중 내 학년을 골라줘. 학년에 따라 추천 과목과 로드맵 학기가 달라져.",
      target: "cohortToggleGo1",
      arrow: "up",
      interactive: true,
      action: "‘고1’ 선택",
    },
    {
      id: "s2-interest",
      screen: "home",
      title: "관심 분야 선택",
      coachTip:
        "진로가 막연해도 괜찮아. 끌리는 관심 분야 태그를 하나 눌러봐. 예를 들어 ‘인공지능/소프트웨어’를 골라볼까?",
      target: "interestTagAI",
      arrow: "down",
      interactive: true,
      action: "관심 분야 태그 선택",
    },
    {
      id: "s3-dept-optional",
      screen: "homeTagSelected",
      title: "원하면 학과까지",
      coachTip:
        "태그를 고르면 관련 학과 패널이 펼쳐져. 더 구체적인 학과가 있으면 골라도 되고, 안 골라도 추천은 받을 수 있어. (학과명을 알면 위 검색창으로 바로 찾아도 돼)",
      target: "deptPanel",
      arrow: "up",
      interactive: false,
      action: "next",
    },
    {
      id: "s4-go-recommend",
      screen: "homeTagSelected",
      title: "맞춤 과목 추천받기",
      coachTip:
        "준비 끝! 오렌지색 ‘맞춤 과목 추천받기’ 버튼을 눌러 우리 학교 맞춤 추천을 받아보자.",
      target: "ctaRecommendActive",
      arrow: "down",
      interactive: true,
      action: "‘맞춤 과목 추천받기’ 클릭",
    },
    {
      id: "s5-recommend-school",
      screen: "recommend",
      title: "우리 학교가 진짜 개설한 과목",
      coachTip:
        "일반론적 과목백과가 아니야. 여기 뜨는 건 ‘우리 학교 편제표에 실제로 개설된’ 과목이라 그대로 신청할 수 있어. 오렌지 ‘추천’ 배지는 내 진로와 잘 맞는다는 표시야.",
      target: "subjectCardRecommended",
      arrow: "left",
      interactive: false,
      action: "next",
    },
    {
      id: "s6-recommend-unavailable",
      screen: "recommend",
      title: "미개설 과목은 따로",
      coachTip:
        "진로엔 좋지만 우리 학교가 안 여는 과목은 맨 아래 ‘미개설 과목’에 따로 모아둬. 헷갈리지 않게 구분해주는 거야. 확인했으면 ‘3년 로드맵 만들기’를 눌러줘.",
      target: "ctaRoadmap",
      arrow: "down",
      interactive: true,
      action: "‘3년 로드맵 만들기’ 클릭",
    },
    {
      id: "s7-roadmap-look",
      screen: "roadmap",
      title: "3년 로드맵 한눈에",
      coachTip:
        "학교지정 과목은 자동으로 들어가 있어. 이제 선택과목군에서 원하는 과목만 담으면 돼. ‘택N · N학점’은 그 군에서 몇 과목을 골라야 하는지 알려줘.",
      target: "selectionGroup1",
      arrow: "up",
      interactive: false,
      action: "next",
    },
    {
      id: "s8-pick-subject",
      screen: "roadmap",
      title: "과목 담기",
      coachTip:
        "오렌지 ‘추천’ 배지가 붙은 과목의 동그라미를 눌러 담아봐. 담는 만큼 위쪽 학점 바가 채워질 거야.",
      target: "subjectOptionRecommended",
      arrow: "left",
      interactive: true,
      action: "추천 과목 담기",
    },
    {
      id: "s9-fill-credits",
      screen: "roadmapFilled",
      title: "학점 채우기",
      coachTip:
        "학기 학점 합계와 위 학점 바가 초록색 체크로 바뀌면 그 학기를 다 채운 거야. 모든 학기를 이렇게 채워 로드맵을 완성하면 돼.",
      target: "creditBarComplete",
      arrow: "up",
      interactive: false,
      action: "next",
    },
    {
      id: "s10-share",
      screen: "roadmapFilled",
      title: "상담자료로 공유",
      coachTip:
        "완성한 로드맵은 ‘공유하기’로 링크를 보내거나 ‘이미지 저장’으로 받아서 상담 자료로 쓸 수 있어. 이제 진짜 내 로드맵을 만들어보자!",
      target: "shareBtn",
      arrow: "down",
      interactive: true,
      action: "‘공유하기’ 클릭",
    },
  ],
};
