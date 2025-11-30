import React, { useState, useEffect, useCallback, useRef } from 'react';
import { produce } from 'immer';
import './App.css';
import './test-animation.css';
import Game from './components/Game.js';
import MenuSystem from './components/MenuSystem.js';
import { initializeGame, playCard, endTurn, resolveInput, checkGameOver, _proceedToNextTurn } from './gameLogic/main.js';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID } from './gameLogic/constants.js';
import { processEffects } from './gameLogic/effectHandler.js'; // Import processEffects
import useEnhancedLog from './hooks/useEnhancedLog.js'; // Import useEnhancedLog
import GameOverScreen from './components/GameOverScreen.js'; // Import GameOverScreen
import { effectMonitor } from './gameLogic/EffectMonitor.js'; // Import effectMonitor

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameData, setGameData] = useState({ cardDefs: null, presetDecks: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingGameResultAnimation, setPlayingGameResultAnimation] = useState(false);
  
  // メニューシステム用の状態
  const [currentScreen, setCurrentScreen] = useState('title'); // 'title', 'deckSelection', 'cardLibrary', 'game', 'gameOver'

  
  const isTransitioningRef = useRef(false); // ターン遷移処理中フラグ
  const gameOverAnimationInitiatedRef = useRef(false); // ゲームオーバーアニメーション開始フラグ

  // Enhanced logging hook
  const enhancedLog = useEnhancedLog(gameState, effectMonitor);

  // Main game loop processor
  useEffect(() => {
    // Only process if there are effects in the queue and we are not waiting for input
    if (gameState && gameState.effect_queue.length > 0 && !gameState.awaiting_input) {
      console.log('[App] Processing effects, queue length:', gameState.effect_queue.length);
      console.log('[App] Effects in queue:', gameState.effect_queue.map(([effect]) => effect.effect_type));
      const newGameState = processEffects(gameState, checkGameOver);
      console.log('[App] Effects processed, new queue length:', newGameState.effect_queue.length);
      // 新しいオブジェクトとして設定して確実に再レンダリングを促す
      setGameState(newGameState);
    }
  }, [gameState]); // This effect runs whenever gameState changes

  // Turn transition processor
  useEffect(() => {
    if (gameState && !gameState.awaiting_input && gameState.effect_queue.length === 0 && gameState.processing_status.pending_turn_transition && 
      !isTransitioningRef.current) {
        isTransitioningRef.current = true; // Set flag to prevent re-entry
        console.log('[App] All effects processed, initiating turn transition...');
        const newGameState = _proceedToNextTurn(gameState);
        setGameState(newGameState);
        isTransitioningRef.current = false; // Reset flag after processing
    }
  }, [gameState]); // Watch gameState for changes

  // Game over animation trigger
  useEffect(() => {
    if (gameState?.game_over && !playingGameResultAnimation && !gameOverAnimationInitiatedRef.current) {
      console.log('[GAME_END_DEBUG] App.js: game_over detected.', { game_over: gameState.game_over, playingGameResultAnimation });
      console.log('[GAME_END_DEBUG] App.js: Setting playingGameResultAnimation to true.');
      gameOverAnimationInitiatedRef.current = true;
      setPlayingGameResultAnimation(true);
    }
  }, [gameState?.game_over, playingGameResultAnimation]);

  // Load game data only once
  useEffect(() => {
    console.log('[App] Starting to load game data...');
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetch('/card_definitions.json').then(res => {
        console.log('[App] Card definitions response status:', res.status);
        if (!res.ok) throw new Error(`Failed to load card definitions: ${res.status}`);
        return res.json();
      }),
      fetch('/preset_decks.json').then(res => {
        console.log('[App] Preset decks response status:', res.status);
        if (!res.ok) throw new Error(`Failed to load preset decks: ${res.status}`);
        return res.json();
      }),
    ])
    .then(([cardDefs, presetDecks]) => {
      console.log('[App] Raw card definitions count:', cardDefs.length);
      console.log('[App] Raw preset decks count:', presetDecks.length);
      
      const defsMap = cardDefs.reduce((acc, def, index) => { 
        acc[def.name] = { ...def, definitionOrder: index }; 
        return acc; 
      }, {});
      // Keep presetDecks as array - initializeGame expects an array, not an object
      
      console.log('[App] Processed card definitions keys:', Object.keys(defsMap).length);
      console.log('[App] Preset decks array length:', presetDecks.length);
      console.log('[App] Available preset deck names:', presetDecks.map(deck => deck.name));
      
      setGameData({ cardDefs: defsMap, presetDecks: presetDecks });
      setLoading(false);
    })
    .catch(error => {
      console.error("[App] Error loading game data:", error);
      setError(error.message);
      setLoading(false);
    });
  }, []);

  // Function to start or restart the game
  const startGame = useCallback((playerDeckName = '基本戦士デッキ', npcDeckName = '基本成長デッキ') => {
    if (!gameData.cardDefs || !gameData.presetDecks) {
      setError('ゲームデータが読み込まれていません');
      return;
    }

    // デッキの存在確認
    const playerDeckExists = gameData.presetDecks.some(deck => deck.name === playerDeckName);
    const npcDeckExists = gameData.presetDecks.some(deck => deck.name === npcDeckName);
    
    if (!playerDeckExists) {
      setError(`プレイヤーデッキ "${playerDeckName}" が見つかりません`);
      return;
    }
    
    if (!npcDeckExists) {
      setError(`NPCデッキ "${npcDeckName}" が見つかりません`);
      return;
    }

    try {
      console.log('[App] Starting game with decks:', playerDeckName, npcDeckName);
      console.log('[App] Available preset decks:', gameData.presetDecks.map(deck => deck.name));
      
      const newGameState = initializeGame(gameData.cardDefs, gameData.presetDecks, playerDeckName, npcDeckName);
      
      if (!newGameState) {
        throw new Error('ゲーム状態の初期化に失敗しました');
      }
      
      console.log('[App] Game initialized successfully');
      
      gameOverAnimationInitiatedRef.current = false; // Reset animation flag
      setGameState(newGameState);
      setCurrentScreen('game'); // ゲーム画面に遷移
      setError(null); // エラーをクリア
    } catch (error) {
      console.error('[App] Error initializing game:', error);
      setError(`ゲーム初期化エラー: ${error.message}`);
      setCurrentScreen('title'); // エラー時はタイトル画面に戻る
    }
  }, [gameData]);

  // データ読み込み完了後はタイトル画面を表示（自動でゲーム開始しない）
  useEffect(() => {
    if (gameData.cardDefs && gameData.presetDecks && !loading && !error) {
      console.log('[App] Data loaded, showing title screen...');
      setCurrentScreen('title');
    }
  }, [gameData, loading, error]);

  // テスト用：開発者コンソールからゲームを終了させる関数
  useEffect(() => {
    window.testEndGame = (playerWins = true) => {
      if (gameState) {
        console.log('🎮TEST [EndGame] Forcing game end - Player wins:', playerWins);
        const newState = {...gameState};
        
        if (playerWins) {
          // プレイヤー勝利：NPCの意識を0にする
          newState.players[NPC_PLAYER_ID].consciousness = 0;
        } else {
          // プレイヤー敗北：プレイヤーの意識を0にする
          newState.players[HUMAN_PLAYER_ID].consciousness = 0;
        }
        
        // checkGameOverを呼び出してゲーム終了処理を実行
        const finalState = checkGameOver(newState);
        
        setGameState(finalState);
      }
    };
    
    return () => {
      delete window.testEndGame;
    };
  }, [gameState]);

  // 勝敗演出完了イベントをリッスン
  const handleGameResultAnimationComplete = useCallback(() => {
    console.log('[GAME_END_DEBUG] App.js: handleGameResultAnimationComplete called.');
    console.log('[GAME_END_DEBUG] App.js: Setting playingGameResultAnimation to false and currentScreen to gameOver.');
    setPlayingGameResultAnimation(false);
    setCurrentScreen('gameOver');
  }, []);

  const handleSystemAnimationComplete = useCallback((event) => {
    console.log('[App] System animation completed, updating state for NPC action');
    const { isGameLocked, lastUpdate } = event.detail; // Extract lastUpdate
    setGameState(currentGameState => produce(currentGameState, draft => {
      if (draft) {
        draft.isAnimationLocked = isGameLocked;
        draft.lastUpdate = lastUpdate; // Use lastUpdate from event detail
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

  const handlePlayCard = (card) => {
    if (!gameState || !card || gameState.awaiting_input || gameState.game_over || gameState.isAnimationLocked) {
      if (gameState?.isAnimationLocked) {
        console.log('[App] Card play blocked - animation in progress');
      }
      return;
    }
    console.log('[App] Playing card:', card.name, 'Current turn:', gameState.current_turn);
    
    // 現在のターンプレイヤーのIDを使用（人間またはNPC）
    const currentPlayerId = gameState.current_turn;
    const newGameState = playCard(gameState, currentPlayerId, card.instance_id);
    console.log('[App] After playCard - Turn changed:', gameState.current_turn, '->', newGameState.current_turn);
    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState(newGameState);
  };

  const handleEndTurn = () => {
    if (!gameState || gameState.awaiting_input || gameState.game_over || gameState.isAnimationLocked) {
      if (gameState?.isAnimationLocked) {
        console.log('[App] End turn blocked - animation in progress');
      }
      return;
    }
    console.log('[App] Ending turn - Current turn:', gameState.current_turn);
    console.log('[App] Before endTurn - Effect queue length:', gameState.effect_queue?.length || 0);
    
    // ターン終了前の状態を記録
    const beforeState = {
      playerScale: gameState.players[gameState.current_turn]?.scale || 0,
      playerConsciousness: gameState.players[gameState.current_turn]?.consciousness || 0
    };
    console.log('[App] Before endTurn - Player state:', beforeState);
    
    let newGameState = endTurn(gameState); // endTurn now only queues effects

    
    console.log('[App] After endTurn - Turn changed:', gameState.current_turn, '->', newGameState.current_turn);
    console.log('[App] After endTurn - Effect queue length:', newGameState.effect_queue?.length || 0);
    
    // ターン終了後の状態を記録
    const afterState = {
      playerScale: newGameState.players[gameState.current_turn]?.scale || 0,
      playerConsciousness: newGameState.players[gameState.current_turn]?.consciousness || 0
    };
    console.log('[App] After endTurn - Player state:', afterState);
    
    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState(newGameState);
  };

  const handleProvideInput = (chosenCard) => {
    if (!gameState || !gameState.awaiting_input || gameState.game_over || gameState.isAnimationLocked) {
      if (gameState?.isAnimationLocked) {
        console.log('[App] Input blocked - animation in progress');
      }
      return;
    }
    console.log('[App] Providing input:', chosenCard);
    let newGameState = resolveInput(gameState, chosenCard); // resolveInput now only queues effects
    console.log('[App] After resolveInput - awaiting_input:', newGameState.awaiting_input);

    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState(newGameState);
  };

  const handleSurrender = () => {
    if (!gameState || gameState.game_over) return;
    const newState = produce(gameState, draft => {
      draft.players[HUMAN_PLAYER_ID].consciousness = 0;
    });
    setGameState(checkGameOver(newState));
  };

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

  // ゲーム終了時の処理
  const handleGameEnd = () => {
    setCurrentScreen('title');
    setGameState(null);
  };

  // 画面遷移の処理
  const handleScreenChange = (screen) => {
    setCurrentScreen(screen);
  };

  // ゲーム終了画面の表示
  console.log(`[GAME_END_DEBUG] App.js: Checking render condition for game over screen.`, { game_over: gameState?.game_over, playingGameResultAnimation });

  // メイン画面の表示
  return (
    <div className="App">
      {currentScreen === 'game' && gameState ? (
        <>
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
          />
          {playingGameResultAnimation && (
            // Animation is playing, potentially overlaying something
            // The actual game over screen will be rendered when currentScreen is 'gameOver'
            null
          )}
        </>
      ) : currentScreen === 'gameOver' && gameState ? (
        <GameOverScreen
          winnerName={gameState.players[gameState.winner]?.name || 'Unknown'}
          onNewGame={() => {
            setGameState(null);
            handleScreenChange('deckSelection');
          }}
          onMainMenu={handleGameEnd}
        />
      ) : (
        <MenuSystem
          gameData={gameData}
          onStartGame={startGame}
          currentScreen={currentScreen}
          onScreenChange={handleScreenChange}
        />
      )}
    </div>
  );
}

export default App;
