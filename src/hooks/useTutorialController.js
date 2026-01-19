import { useState, useEffect, useCallback, useRef } from 'react';
import { produce } from 'immer';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID } from '../gameLogic/constants.js';

const useTutorialController = (scenario, gameState, onGameStateUpdate, onPlayCard, onEndTurn, onProvideInput) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(null);
  const [hasTriggered, setHasTriggered] = useState(false); // 現在のステップのトリガーが発動済みか

  // ゲームアクションをラップして、チュートリアル条件を監視できるようにする
  const wrappedOnPlayCard = useCallback((card) => {
    onPlayCard(card); // 元のonPlayCardを実行
    if (activeStep && activeStep.completionCondition?.type === 'PLAY_CARD' && activeStep.completionCondition.cardName === card.name) {
      proceedToNextStep();
    }
  }, [activeStep, onPlayCard]);

  const wrappedOnEndTurn = useCallback(() => {
    onEndTurn(); // 元のonEndTurnを実行
    if (activeStep && activeStep.completionCondition?.type === 'END_TURN') {
      proceedToNextStep();
    }
  }, [activeStep, onEndTurn]);

  const wrappedOnProvideInput = useCallback((input) => {
    onProvideInput(input); // 元のonProvideInputを実行
    if (activeStep && activeStep.completionCondition?.type === 'MODAL_CLOSE') { // 仮: モーダルが閉じられる条件とする
      proceedToNextStep();
    }
  }, [activeStep, onProvideInput]);


  const proceedToNextStep = useCallback(() => {
    setCurrentStepIndex(prev => prev + 1);
    setHasTriggered(false); // 次のステップのトリガーを待つ
    setActiveStep(null); // 次のステップのトリガーを待つために一旦クリア
  }, []);


  useEffect(() => {
    if (!scenario || !gameState || !onGameStateUpdate) {
      return;
    }

    const currentScenarioStep = scenario[currentStepIndex];

    if (!currentScenarioStep) {
      // シナリオ終了
      setActiveStep(null);
      return;
    }

    // --- トリガー条件のチェック ---
    const checkTrigger = (trigger) => {
      if (hasTriggered && activeStep && activeStep.step === currentScenarioStep.step) {
          return true; // 既に発動済みなら再度チェックしない
      }

      switch (trigger.type) {
        case 'TUTORIAL_START':
          return currentStepIndex === 0 && gameState.turn_number === 1 && gameState.round_number === 1;
        case 'PREVIOUS_STEP_COMPLETE':
          // proceedToNextStepが呼ばれることでこのトリガーが満たされる
          return true; 
        case 'TURN_START':
          const playerMatches = (trigger.player === 'human' && gameState.current_turn === HUMAN_PLAYER_ID) ||
                                (trigger.player === 'npc' && gameState.current_turn !== HUMAN_PLAYER_ID);
          const turnMatches = (trigger.turn === 'any' || gameState.turn_number === trigger.turn); // round_numberではなくturn_numberで判断
          return playerMatches && turnMatches;
        // 他のトリガータイプ...
        default:
          return false;
      }
    };

    // 現在のステップがアクティブになるべきか判断し、必要であればアクティブにする
    if (!activeStep && checkTrigger(currentScenarioStep.trigger)) {
        setActiveStep(currentScenarioStep);
        setHasTriggered(true);
        // チュートリアルモードではマリガンを自動で承認する
        if (gameState.phase === 'MULLIGAN') {
            onGameStateUpdate(prevGameState => produce(prevGameState, draft => {
                if (draft.mulligan_state[HUMAN_PLAYER_ID].status === 'undecided') {
                    draft.mulligan_state[HUMAN_PLAYER_ID].status = 'decided';
                    draft.mulligan_state[HUMAN_PLAYER_ID].count = 0; // マリガンしない
                }
                if (draft.mulligan_state[NPC_PLAYER_ID].status === 'undecided') {
                    draft.mulligan_state[NPC_PLAYER_ID].status = 'decided';
                    draft.mulligan_state[NPC_PLAYER_ID].count = 0; // マリガンしない
                }
            }));
        }
    }

    // --- 達成条件のチェック (activeStepが存在する場合のみ) ---
    if (activeStep && activeStep.step === currentScenarioStep.step) {
      const condition = activeStep.completionCondition;
      if (condition) {
        switch (condition.type) {
          case 'AUTO_PROCEED':
            const timer = setTimeout(() => {
              proceedToNextStep();
            }, condition.delay || 2000); // デフォルト2秒
            return () => clearTimeout(timer); // クリーンアップ
          case 'STATE_CHANGE':
            // 例: プレイヤーの規模が特定の値になったら
            if (condition.target === 'scale' && gameState.players[HUMAN_PLAYER_ID].scale >= condition.value) {
              proceedToNextStep();
            }
            break;
          // 'MODAL_CLOSE', 'PLAY_CARD', 'END_TURN', 'CLICK_TARGET' はラッパー関数やイベントハンドラで処理
          default:
            break;
        }
      }
    }

  }, [currentStepIndex, gameState, scenario, activeStep, hasTriggered, onGameStateUpdate, proceedToNextStep]);

  return {
    activeStep, // 現在アクティブなステップの情報（modal, highlightなど）
    proceedToNextStep, // 次のステップに進むための関数
    wrappedOnPlayCard, // チュートリアル監視機能付きのonPlayCard
    wrappedOnEndTurn,  // チュートリアル監視機能付きのonEndTurn
    wrappedOnProvideInput, // チュートリアル監視機能付きのonProvideInput
  };
};

export default useTutorialController;

