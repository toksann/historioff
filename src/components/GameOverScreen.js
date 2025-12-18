import React from 'react';
import './GameOverScreen.css';
import ConsciousnessTrendChart from './ConsciousnessTrendChart.js';

function GameOverScreen({ winnerName, onNewGame, onMainMenu, turnHistory, gameState }) {
  return (
    <div className="game-over-screen">
      <h1>ゲーム終了</h1>
      <h2>勝者: {winnerName}</h2>
      
      <div className="chart-container">
        <h3>綴られし"歴史"</h3>
        <ConsciousnessTrendChart turnHistory={turnHistory} gameState={gameState} />
      </div>

      <div className="game-over-buttons">
        <button className="menu-button" onClick={onNewGame}>
          新しいゲームを始める
        </button>
        <button className="menu-button" onClick={onMainMenu}>
          メインメニューに戻る
        </button>
      </div>
    </div>
  );
}

export default GameOverScreen;
