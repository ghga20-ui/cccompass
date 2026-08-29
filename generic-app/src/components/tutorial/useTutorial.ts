import { useCallback, useEffect, useMemo, useState } from "react";
import type { TutorialDef, TutorialUi } from "./types";

/** 튜토리얼 진행 상태 + 모의 UI 상태를 관리하는 컨트롤러 훅. */
export function useTutorial(def: TutorialDef) {
  const [stepIndex, setStepIndex] = useState(0);
  const [uiState, setUiState] = useState<TutorialUi>({});

  const total = def.steps.length;
  const step = def.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, total - 1)),
    [total],
  );
  const goPrev = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);
  const goTo = useCallback(
    (i: number) => setStepIndex(() => Math.min(Math.max(i, 0), total - 1)),
    [total],
  );
  const restart = useCallback(() => {
    setStepIndex(0);
    setUiState({});
  }, []);

  const setUi = useCallback(
    (patch: Partial<TutorialUi>) => setUiState((s) => ({ ...s, ...patch })),
    [],
  );

  // interactive 스텝: 강조된 타깃을 눌렀을 때만 진행.
  const handleTargetClick = useCallback(
    (target: string) => {
      if (step.interactive && target === step.target) goNext();
    },
    [step, goNext],
  );

  // 스텝 진입 시 모의 UI 효과 적용(누적이 아닌, 현재 스텝까지의 상태를 합성).
  const effect = def.applyStepEffect;
  useEffect(() => {
    if (!effect) return;
    // 스텝 진입 시 모의 UI를 동기화하는 의도된 사용(외부 시스템=스텝 상태와 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUiState((s) => effect(step.id, s));
  }, [step.id, effect]);

  return useMemo(
    () => ({
      def,
      step,
      stepIndex,
      total,
      isFirst,
      isLast,
      ui: uiState,
      setUi,
      goNext,
      goPrev,
      goTo,
      restart,
      handleTargetClick,
    }),
    [
      def,
      step,
      stepIndex,
      total,
      isFirst,
      isLast,
      uiState,
      setUi,
      goNext,
      goPrev,
      goTo,
      restart,
      handleTargetClick,
    ],
  );
}

export type TutorialController = ReturnType<typeof useTutorial>;
