import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Game from './components/Game.js';
import { initializeGame, playCard, endTurn, resolveInput } from './gameLogic/main.js';
import { processEffects } from './gameLogic/effectHandler.js'; // Import processEffects

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameData, setGameData] = useState({ cardDefs: null, presetDecks: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Main game loop processor
  useEffect(() => {
    // Only process if there are effects in the queue and we are not waiting for input
    if (gameState && gameState.effect_queue.length > 0 && !gameState.awaiting_input) {
      console.log('[App] Processing effects, queue length:', gameState.effect_queue.length);
      const newGameState = processEffects(gameState);
      console.log('[App] Effects processed, new queue length:', newGameState.effect_queue.length);
      // 新しいオブジェクトとして設定して確実に再レンダリングを促す
      setGameState({...newGameState});
    }
  }, [gameState]); // This effect runs whenever gameState changes

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
      
      const defsMap = cardDefs.reduce((acc, def) => { acc[def.name] = def; return acc; }, {});
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
  const startGame = useCallback(() => {
    if (gameData.cardDefs && gameData.presetDecks) {
      try {
        console.log('[App] Starting game with decks:', '基本戦士デッキ', '基本成長デッキ');
        console.log('[App] Available preset decks:', gameData.presetDecks.map(deck => deck.name));
        
        const newGameState = initializeGame(gameData.cardDefs, gameData.presetDecks, '基本戦士デッキ', '基本成長デッキ');
        console.log('[App] Game initialized successfully:', newGameState ? 'Success' : 'Failed');
        setGameState(newGameState);
      } catch (error) {
        console.error('[App] Error initializing game:', error);
        setError(`ゲーム初期化エラー: ${error.message}`);
      }
    }
  }, [gameData]);

  // Start the game once data is loaded
  useEffect(() => {
    if (gameData.cardDefs && gameData.presetDecks && !loading && !error) {
      console.log('[App] Data loaded, starting game...');
      startGame();
    }
  }, [gameData, startGame, loading, error]);

  const handlePlayCard = (card) => {
    if (!gameState || !card || gameState.awaiting_input || gameState.game_over) return;
    console.log('[App] Playing card:', card.name, 'Current turn:', gameState.current_turn);
    // 人間プレイヤー（PLAYER1）のIDとカードのinstance_idを渡す
    const newGameState = playCard(gameState, 'PLAYER1', card.instance_id);
    console.log('[App] After playCard - Turn changed:', gameState.current_turn, '->', newGameState.current_turn);
    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState({...newGameState});
  };

  const handleEndTurn = () => {
    if (!gameState || gameState.awaiting_input || gameState.game_over) return;
    console.log('[App] Ending turn - Current turn:', gameState.current_turn);
    const newGameState = endTurn(gameState);
    console.log('[App] After endTurn - Turn changed:', gameState.current_turn, '->', newGameState.current_turn);
    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState({...newGameState});
  };

  const handleProvideInput = (chosenCard) => {
    if (!gameState || !gameState.awaiting_input || gameState.game_over) return;
    console.log('[App] Providing input:', chosenCard);
    const newGameState = resolveInput(gameState, chosenCard);
    console.log('[App] After resolveInput - awaiting_input:', newGameState.awaiting_input);
    // 新しいオブジェクトとして設定して確実に再レンダリングを促す
    setGameState({...newGameState});
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

  if (loading || !gameState) {
    return (
      <div className="App">
        <div className="loading">
          <h1>ゲームを読み込み中...</h1>
          <p>カードデータとプリセットデッキを読み込んでいます</p>
        </div>
      </div>
    );
  }

  if (gameState.game_over) {
    const winnerName = gameState.players[gameState.winner]?.name || 'Unknown';
    return (
      <div className="App">
        <div className="game-over-container">
          <h1>ゲーム終了</h1>
          <h2>勝者: {winnerName}</h2>
          <button onClick={startGame}>新しいゲームを始める</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Game 
        gameState={gameState} 
        onPlayCard={handlePlayCard}
        onEndTurn={handleEndTurn}
        onProvideInput={handleProvideInput}
      />
    </div>
  );
}

export default App;
