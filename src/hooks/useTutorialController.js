import { useState, useEffect, useCallback, useRef } from 'react';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID } from '../gameLogic/constants.js';

const useTutorialController = (scenario, gameState, onPlayCard, onEndTurn, onProvideInput, onTriggerNPCAction) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(null);

  // ステップの二重実行防止用
  const isProcessingStepRef = useRef(false);

  const proceedToNextStep = useCallback(() => {
    console.log(`[TUTORIAL] Step ${currentStepIndex} complete. Proceeding to ${currentStepIndex + 1}`);
    setCurrentStepIndex(prev => prev + 1);
    setActiveStep(null);
    setIsModalOpen(false);
    setActiveHighlight(null);
    isProcessingStepRef.current = false;
  }, [currentStepIndex]);

  const handleModalCloseAction = useCallback(() => {
    if (activeStep && activeStep.completionCondition?.type === 'INPUT_REQUIRED') {
      proceedToNextStep();
    } else {
      setIsModalOpen(false);
    }
  }, [activeStep, proceedToNextStep]);

  const wrappedOnPlayCard = useCallback((card) => {
    // チュートリアル中も実際のカードプレイを実行
    onPlayCard(card);
    
    if (activeStep && activeStep.completionCondition?.type === 'PLAY_CARD') {
      // 特定のカード名指定がある場合はチェック、なければ何でもOK
      if (!activeStep.completionCondition.cardName || activeStep.completionCondition.cardName === card.name) {
        console.log(`[TUTORIAL] Play card condition met: ${card.name}`);
        proceedToNextStep();
      }
    }
  }, [activeStep, onPlayCard, proceedToNextStep]);

  const wrappedOnEndTurn = useCallback(() => {
    onEndTurn();
    if (activeStep && activeStep.completionCondition?.type === 'END_TURN') {
      console.log('[TUTORIAL] End turn condition met.');
      proceedToNextStep();
    }
  }, [activeStep, onEndTurn, proceedToNextStep]);

  const wrappedOnCardClick = useCallback((card) => {
    if (activeStep && activeStep.completionCondition?.type === 'SELECT_CARD') {
      if (!activeStep.completionCondition.cardName || activeStep.completionCondition.cardName === card.name) {
        console.log(`[TUTORIAL] Card selection condition met: ${card.name}`);
        proceedToNextStep();
      }
    }
  }, [activeStep, proceedToNextStep]);

  const wrappedOnHighlightClick = useCallback(() => {
    if (activeStep && activeStep.completionCondition?.type === 'CLICK_TARGET') {
      console.log('[TUTORIAL] Highlight click condition met.');
      proceedToNextStep();
    }
  }, [activeStep, proceedToNextStep]);

  const wrappedOnProvideInput = useCallback((value) => {
    // ゲームロジックへの入力を実行
    onProvideInput(value);
    
    if (activeStep && activeStep.completionCondition?.type === 'RESOLVE_CHOICE') {
      console.log('[TUTORIAL] Choice resolution condition met.');
      proceedToNextStep();
    }
  }, [activeStep, onProvideInput, proceedToNextStep]);

  useEffect(() => {
    // シナリオ、ゲーム状態がない場合、または既にステップ処理中の場合は何もしない
    if (!scenario || !gameState || activeStep || isProcessingStepRef.current) {
      return;
    }

    // シナリオデータの取得（配列かオブジェクトのstepsプロパティか）
    const steps = Array.isArray(scenario) ? scenario : (scenario.steps || []);
    const currentScenarioStep = steps[currentStepIndex];

    if (!currentScenarioStep) {
      console.log('[TUTORIAL] Scenario finished or no step found at index:', currentStepIndex);
      return;
    }

    const checkTrigger = (trigger) => {
      const isHumanTurn = gameState.current_turn === HUMAN_PLAYER_ID;
      const currentRound = gameState.round_number || 1;
      const currentTurn = gameState.turn_number || 1;

      switch (trigger.type) {
        case 'TUTORIAL_START':
          return currentStepIndex === 0;
        case 'PREVIOUS_STEP_COMPLETE':
          return true;
        case 'TURN_START':
          const playerMatches = (trigger.player === 'human' && isHumanTurn) ||
                              (trigger.player === 'npc' && !isHumanTurn);
          
          // turn指定かround指定か、あるいは指定なし(any)か
          const turnMatches = (!trigger.turn || trigger.turn === 'any' || currentTurn === trigger.turn);
          const roundMatches = (!trigger.round || trigger.round === 'any' || currentRound === trigger.round);
          
          const result = playerMatches && turnMatches && roundMatches;
          if (!result && (trigger.round || trigger.turn)) {
            // 条件に合致しそうなタイミングでのみログを出す（ノイズ軽減）
            // console.log(`[TUTORIAL] TURN_START check: playerMatch=${playerMatches}, turnMatch=${turnMatches}, roundMatch=${roundMatches}`);
          }
          return result;
        default:
          return false;
      }
    };

    if (checkTrigger(currentScenarioStep.trigger)) {
      console.log(`[TUTORIAL] Trigger met for step ${currentScenarioStep.step}. Action: ${currentScenarioStep.action.type}`);
      isProcessingStepRef.current = true;
      setActiveStep(currentScenarioStep);

      // アクション実行
      switch (currentScenarioStep.action.type) {
        case 'SHOW_MODAL':
          setIsModalOpen(true);
          break;
        case 'HIGHLIGHT':
          setActiveHighlight({ targetId: currentScenarioStep.action.targetId });
          break;
        case 'NPC_ACTION':
          // NPCへの指令は一旦飛ばすだけにする（NPC側の実装で対応）
          if (onTriggerNPCAction) {
            onTriggerNPCAction(currentScenarioStep.action);
          }
          break;
        default:
          break;
      }

      // 完了条件が AUTO_PROCEED の場合はタイマー起動
      if (currentScenarioStep.completionCondition.type === 'AUTO_PROCEED') {
        const timer = setTimeout(() => {
          proceedToNextStep();
        }, currentScenarioStep.completionCondition.delay || 0);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStepIndex, gameState, scenario, activeStep, proceedToNextStep, onTriggerNPCAction]);

  return {
    activeStep,
    isModalOpen,
    activeHighlight,
    handleModalCloseAction,
    wrappedOnPlayCard,
    wrappedOnEndTurn,
    wrappedOnCardClick,
    wrappedOnHighlightClick,
    wrappedOnProvideInput,
  };
};

export default useTutorialController;
