import React, { useState, useEffect, useCallback, useRef } from 'react';
import { produce } from 'immer';
import './App.css';
import './test-animation.css';
import './styles/custom.css';
import Game from './components/Game.js';
import TitleScreen from './components/TitleScreen.js';
import DeckSelectionScreen from './components/DeckSelectionScreen.js';
import CardLibraryScreen from './components/CardLibraryScreen.js';
import { initializeGame, playCard, endTurn, resolveInput, checkGameOver, _proceedToNextTurn, performMulligan, resolveMulliganPhase } from './gameLogic/main.js';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID, GamePhase } from './gameLogic/constants.js';
import { processEffects } from './gameLogic/effectHandler.js';
import useEnhancedLog from './hooks/useEnhancedLog.js';
import GameOverScreen from './components/GameOverScreen.js';
import DeckBuilderScreen from './components/DeckBuilderScreen.js';
import TutorialSelectionScreen from './components/TutorialSelectionScreen.js';
import { effectMonitor } from './gameLogic/EffectMonitor.js';
import packageJson from '../package.json';
import RulesOverlay from './components/overlays/RulesOverlay.js';
import CreditsOverlay from './components/overlays/CreditsOverlay.js';
import ChangelogModal from './components/overlays/ChangelogModal.js';

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameData, setGameData] = useState({ cardDefs: null, presetDecks: null, tutorialDecks: null, tutorialMaster: null, tutorialScenarios: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingGameResultAnimation, setPlayingGameResultAnimation] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  
  const appVersion = packageJson.version;

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [currentScreen, setCurrentScreen] = useState('title');
  const [deckToEdit, setDeckToEdit] = useState(null);

  const isTransitioningRef = useRef(false);
  const gameOverAnimationInitiatedRef = useRef(false);

  const enhancedLog = useEnhancedLog(gameState, effectMonitor);

  useEffect(() => {
    if (gameState && gameState.effect_queue.length > 0 && !gameState.awaiting_input) {
      const newGameState = processEffects(gameState, checkGameOver);
      setGameState(newGameState);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState && !gameState.awaiting_input && gameState.effect_queue.length === 0 && gameState.processing_status.pending_turn_transition && 
      !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const newGameState = _proceedToNextTurn(gameState);
        setGameState(newGameState);
        isTransitioningRef.current = false;
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState?.game_over && !playingGameResultAnimation && !gameOverAnimationInitiatedRef.current) {
      gameOverAnimationInitiatedRef.current = true;
      setPlayingGameResultAnimation(true);
    }
  }, [gameState?.game_over, playingGameResultAnimation]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetch('/card_definitions.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load card definitions: ${res.status}`);
        return res.json();
      }),
      fetch('/preset_decks.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load preset decks: ${res.status}`);
        return res.json();
      }),
      fetch('/tutorials/tutorial_decks.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load tutorial decks: ${res.status}`);
        return res.json();
      }),
      fetch('/tutorials/tutorial_master.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load tutorial master: ${res.status}`);
        return res.json();
      }),
      fetch('/tutorials/tutorial_scenarios.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load tutorial scenarios: ${res.status}`);
        return res.json();
      }),
    ])
    .then(([cardDefs, presetDecks, tutorialDecks, tutorialMaster, tutorialScenarios]) => {
      const defsMap = cardDefs.reduce((acc, def, index) => { 
        acc[def.name] = { ...def, definitionOrder: index }; 
        return acc; 
      }, {});
      
      setGameData({ 
        cardDefs: defsMap, 
        presetDecks: presetDecks,
        tutorialDecks: tutorialDecks,
        tutorialMaster: tutorialMaster,
        tutorialScenarios: tutorialScenarios,
      });
      setLoading(false);
    })
    .catch(error => {
      console.error("[App] Error loading game data:", error);
      setError(error.message);
      setLoading(false);
    });
  }, []);

  const startGame = useCallback((playerDeckName, npcDeckName) => {
    if (!gameData.cardDefs || !gameData.presetDecks) {
      setError('ゲームデータが読み込まれていません');
      return;
    }

    const playerDeckExists = gameData.presetDecks.some(deck => deck.name === playerDeckName);
    const npcDeckExists = gameData.presetDecks.some(deck => deck.name === npcDeckName);
    
    if (!playerDeckExists || !npcDeckExists) {
      setError('指定されたデッキが見つかりません。');
      return;
    }

    try {
      const newGameState = initializeGame(gameData.cardDefs, gameData.presetDecks, playerDeckName, npcDeckName);
      if (!newGameState) {
        throw new Error('ゲーム状態の初期化に失敗しました');
      }
      
      gameOverAnimationInitiatedRef.current = false;
      setGameState(newGameState);
      setCurrentScreen('game');
      setError(null);
    } catch (error) {
      console.error('[App] Error initializing game:', error);
      setError(`ゲーム初期化エラー: ${error.message}`);
      setCurrentScreen('title');
    }
  }, [gameData]);

  const handleStartTutorial = useCallback((tutorialId) => {
    console.log('[App] handleStartTutorial called with tutorialId:', tutorialId);
    if (!gameData.cardDefs || !gameData.tutorialDecks || !gameData.tutorialMaster || !gameData.tutorialScenarios) {
      setError('チュートリアルデータが読み込まれていません');
      return;
    }

    const tutorialMasterEntry = gameData.tutorialMaster.find(t => t.tutorialId === tutorialId);
    if (!tutorialMasterEntry) {
      setError(`チュートリアルID "${tutorialId}" が見つかりません`);
      return;
    }

    const playerDeckId = tutorialMasterEntry.playerDeckId;
    const npcDeckId = tutorialMasterEntry.npcDeckId;
    const tutorialScenarioId = tutorialMasterEntry.scenarioId;

    const playerDeckName = gameData.tutorialDecks[playerDeckId]?.name;
    const npcDeckName = gameData.tutorialDecks[npcDeckId]?.name;

    if (!playerDeckName || !npcDeckName) {
        setError('チュートリアルのデッキ名が見つかりません。');
        return;
    }

        const tutorialDeckList = Object.values(gameData.tutorialDecks);

    

            const scenarios = gameData.tutorialScenarios.default || gameData.tutorialScenarios;

    

            const tutorialScenario = scenarios[tutorialScenarioId];

    

            console.log('[App] tutorialScenario:', tutorialScenario);

    

        

    

            if (!tutorialScenario) {

    

              setError(`チュートリアルシナリオID "${tutorialScenarioId}" が見つかりません`);

    

              return;

    

            }

    

        

    

            try {

    

              console.log('[App] Calling initializeGame with tutorialScenario:', tutorialScenario);

    

              const newGameState = initializeGame(gameData.cardDefs, tutorialDeckList, playerDeckName, npcDeckName, tutorialScenario);

    

              console.log('[App] initializeGame returned newGameState:', newGameState);

    

        

    

                        if (!newGameState) {

    

        

    

                      throw new Error('チュートリアルゲーム状態の初期化に失敗しました');

    

        

    

                    }

    

        

    

              

    

        

    

                    const finalGameState = produce(newGameState, draftState => {
                      draftState.tutorial = {
                          scenarioId: tutorialScenarioId,
                          currentStep: 0,
                          master: tutorialScenario // シナリオ全体を渡す
                      };
                    });

    

        

    

                    

    

        

    

                    gameOverAnimationInitiatedRef.current = false;

    

        

    

                    setGameState(finalGameState);
      setCurrentScreen('game');
      setError(null);
      console.log('[App] Setting gameState and currentScreen to "game"');
    } catch (error) {
      console.error('[App] Error initializing tutorial game:', error);
      setError(`チュートリアルゲーム初期化エラー: ${error.message}`);
      setCurrentScreen('title');
    }
  }, [gameData]);

  const handleGameResultAnimationComplete = useCallback(() => {
    setPlayingGameResultAnimation(false);
    setCurrentScreen('gameOver');
  }, []);

  const handleSystemAnimationComplete = useCallback((event) => {
    const { isGameLocked, lastUpdate } = event.detail;
    setGameState(currentGameState => produce(currentGameState, draft => {
      if (draft) {
        draft.isAnimationLocked = isGameLocked;
        draft.lastUpdate = lastUpdate;
      }
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('gameResultAnimationComplete', handleGameResultAnimationComplete);
    window.addEventListener('systemAnimationComplete', handleSystemAnimationComplete);
    
    return () => {
      window.removeEventListener('gameResultAnimationComplete', handleGameResultAnimationComplete);
      window.removeEventListener('systemAnimationComplete', handleSystemAnimationComplete);
    };
  }, [handleGameResultAnimationComplete, handleSystemAnimationComplete]);

  const handleConfirmMulligan = useCallback((playerId, selectedCardIds) => {
      if (!gameStateRef.current || gameStateRef.current.mulligan_state[playerId].status === 'decided') return;
  
      const newGameState = performMulligan(gameStateRef.current, playerId, selectedCardIds);
      setGameState(newGameState);
  }, []);

  useEffect(() => {
    if (gameState?.phase !== GamePhase.MULLIGAN) return;

    const { mulligan_state } = gameState;
    const humanDecided = mulligan_state[HUMAN_PLAYER_ID]?.status === 'decided';
    const npcDecided = mulligan_state[NPC_PLAYER_ID]?.status === 'decided';

    if (humanDecided && npcDecided) {
        const timer = setTimeout(() => {
            setGameState(gs => {
                if (gs.phase === GamePhase.MULLIGAN) {
                    return resolveMulliganPhase(gs);
                }
                return gs;
            });
        }, 3000);

        return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handlePlayCard = useCallback((card) => {
    if (!gameStateRef.current || !card || gameStateRef.current.awaiting_input || gameStateRef.current.game_over || gameStateRef.current.isAnimationLocked) {
      return;
    }
    const currentPlayerId = gameStateRef.current.current_turn;
    const newGameState = playCard(gameStateRef.current, currentPlayerId, card.instance_id);
    setGameState(newGameState);
  }, []);

  const handleEndTurn = useCallback(() => {
    if (!gameStateRef.current || gameStateRef.current.awaiting_input || gameStateRef.current.game_over || gameStateRef.current.isAnimationLocked) {
      return;
    }
    let newGameState = endTurn(gameStateRef.current);
    setGameState(newGameState);
  }, []);

  const handleProvideInput = useCallback((chosenCard) => {
    if (!gameStateRef.current || !gameStateRef.current.awaiting_input || gameStateRef.current.game_over || gameStateRef.current.isAnimationLocked) {
      return;
    }
    let newGameState = resolveInput(gameStateRef.current, chosenCard);
    setGameState(newGameState);
  }, []);

  const handleSurrender = useCallback(() => {
    if (!gameStateRef.current || gameStateRef.current.game_over) return;
    const newState = produce(gameStateRef.current, draft => {
      draft.players[HUMAN_PLAYER_ID].consciousness = 0;
    });
    setGameState(checkGameOver(newState));
  }, []);

  const handleDeckSelectedForGameStart = useCallback((playerDeck) => {
    if (!playerDeck || !playerDeck.name) {
      console.error('Invalid deck selected:', playerDeck);
      return;
    }
    if (!gameData.presetDecks || gameData.presetDecks.length === 0) {
      console.error('No preset decks available');
      return;
    }
    const availableDecks = gameData.presetDecks.filter(deck => deck.name !== playerDeck.name);
    let npcDeck;
    if (availableDecks.length === 0) {
      console.warn('No different decks available for NPC, picking a random one.');
      npcDeck = gameData.presetDecks[Math.floor(Math.random() * gameData.presetDecks.length)];
    } else {
      npcDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
    }
    startGame(playerDeck.name, npcDeck.name);
  }, [gameData, startGame]);

  if (error) {
    return (
      <div className="App">
        <div className="error-container">
          <h1>エラーが発生しました</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h1>ゲームを読み込み中...</h1>
          <p>カードデータとプリセットデッキを読み込んでいます</p>
        </div>
      </div>
    );
  }

  const handleGameEnd = () => {
    setCurrentScreen('title');
    setGameState(null);
  };

  const handleScreenChange = (screen, data = {}) => {
    setDeckToEdit(data.deckToEdit || null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'title':
        return <TitleScreen
                  onScreenChange={handleScreenChange}
                  version={appVersion}
                  onShowRules={() => setShowRules(true)}
                  onShowCredits={() => setShowCredits(true)}
                  onShowChangelog={() => setShowChangelog(true)}
                />;
      case 'deckSelection':
        return (
          <DeckSelectionScreen
            presetDecks={gameData.presetDecks}
            cardDefs={gameData.cardDefs}
            onDeckSelected={handleDeckSelectedForGameStart}
            onBack={() => handleScreenChange('title')}
            onScreenChange={handleScreenChange}
          />
        );
      case 'cardLibrary':
        return <CardLibraryScreen cardDefs={gameData.cardDefs} onBack={() => handleScreenChange('title')} />;
      case 'tutorialSelection':
        return <TutorialSelectionScreen gameData={gameData} onStartTutorial={handleStartTutorial} onExit={() => handleScreenChange('title')} />;
      case 'deckBuilder':
        return <DeckBuilderScreen gameData={gameData} onExit={() => handleScreenChange('title')} deckToEdit={deckToEdit} />;
      case 'game':
        if (!gameState) return null;
        return (
          <Game
            gameState={gameState}
            cardDefs={gameData.cardDefs}
            onPlayCard={handlePlayCard}
            onEndTurn={handleEndTurn}
            onProvideInput={handleProvideInput}
            onSurrender={handleSurrender}
            onGameStateUpdate={setGameState}
            effectMonitor={enhancedLog.getEffectMonitor()}
            enhancedLog={enhancedLog}
            onConfirmMulligan={handleConfirmMulligan}
          />
        );
      case 'gameOver':
        if (!gameState) return null;
        return (
          <GameOverScreen
            winnerName={gameState.players[gameState.winner]?.name || 'Unknown'}
            turnHistory={gameState.turnHistory}
            gameState={gameState}
            onNewGame={() => handleScreenChange('deckSelection')}
            onMainMenu={handleGameEnd}
          />
        );
      default:
        return <TitleScreen onScreenChange={handleScreenChange} version={appVersion} />;
    }
  };

  return (
    <div className="App">
      {loading ? (
        <div className="loading"><h1>ゲームを読み込み中...</h1><p>カードデータとプリセットデッキを読み込んでいます</p></div>
      ) : error ? (
        <div className="error-container"><h1>エラーが発生しました</h1><p>{error}</p><button onClick={() => window.location.reload()}>再読み込み</button></div>
      ) : (
        <>
          {renderScreen()}
          {showRules && <RulesOverlay isOpen={showRules} onClose={() => setShowRules(false)} />}
          {showCredits && <CreditsOverlay isOpen={showCredits} onClose={() => setShowCredits(false)} />}
          {showChangelog && <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} version={appVersion} />}
        </>
      )}
    </div>
  );
}

export default App;