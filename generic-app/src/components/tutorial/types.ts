import type { ComponentType } from "react";

export type ArrowDir = "up" | "down" | "left" | "right" | "none";

/** 모의 UI 안에서 화면 변형/선택 상태를 표현하는 가벼운 상태 주머니. */
export interface TutorialUi {
  // 교사 흐름
  fileChip?: boolean;
  schoolName?: string;
  gradeTab?: number;
  splitDone?: boolean;
  groupAdded?: boolean;
  linkCopied?: boolean;
  // 학생 흐름
  cohort?: "go1" | "go2";
  selectedTag?: string | null;
  picked?: string[];
}

export interface TutorialStep {
  id: string;
  screen: string; // MockScreenDef.id 와 매칭
  title: string;
  coachTip: string;
  target: string; // 강조/화살표가 가리킬 data-tut-target 키 ("none" 가능)
  arrow: ArrowDir;
  interactive: boolean; // true면 강조된 타깃을 직접 눌러야 진행
  action?: string; // interactive 동작 설명(표시용)
}

export interface MockScreenDef {
  id: string;
  description?: string;
}

/** 모의 화면 컴포넌트가 엔진으로부터 받는 협력 props. */
export interface MockScreenProps {
  screen: string;
  ui: TutorialUi;
  setUi: (patch: Partial<TutorialUi>) => void;
  onTargetClick: (target: string) => void;
  activeTarget: string;
  interactive: boolean;
}

export interface TutorialDef {
  id: string;
  title: string;
  intro: string;
  /** 학생 톤(반말) 등 코치 말풍선 어조. 기본 "formal". */
  voice?: "formal" | "casual";
  steps: TutorialStep[];
  screens: MockScreenDef[];
  /** screen.id → 렌더 컴포넌트. 여러 id가 같은 컴포넌트를 가리켜도 됨. */
  screenComponents: Record<string, ComponentType<MockScreenProps>>;
  /** 스텝 진입 시 모의 UI 상태를 갱신(예: 업로드 스텝에서 파일칩 표시). */
  applyStepEffect?: (stepId: string, ui: TutorialUi) => TutorialUi;
}
