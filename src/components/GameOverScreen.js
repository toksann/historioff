import React from 'react';
import './GameOverScreen.css'; // 専用のCSSファイルを作成します

function GameOverScreen({ winnerName, onNewGame, onMainMenu }) {
  return (
    <div className="game-over-screen">
      <h1>ゲーム終了</h1>
      <h2>勝者: {winnerName}</h2>
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
