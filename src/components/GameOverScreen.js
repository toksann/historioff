import React from 'react';
import './GameOverScreen.css';
import ConsciousnessTrendChart from './ConsciousnessTrendChart.js';
import useWindowSize from '../hooks/useWindowSize.js'; // Import the new hook

function GameOverScreen({ winnerName, onNewGame, onMainMenu, turnHistory, gameState }) {
  const { width } = useWindowSize();

  // Conditionally set chart dimensions and padding based on screen width
  let chartWidth, chartHeight, chartPadding;
  if (width < 600) {
    chartWidth = width * 0.9;
    chartHeight = chartWidth * 0.6;
    chartPadding = 40; // Smaller padding for mobile
  } else if (width < 950) {
    chartWidth = width * 0.8;
    chartHeight = chartWidth * 0.5;
    chartPadding = 50; // Medium padding
  } else {
    chartWidth = 800;
    chartHeight = 400;
    chartPadding = 60; // Default padding
  }

  return (
    <div className="game-over-screen">
      <h1>闘争ここに完成せり</h1>
      <h2>勝者: {winnerName}</h2>
      
      <div className="chart-container">
        <h3>綴られし"歴史"</h3>
        <ConsciousnessTrendChart 
          turnHistory={turnHistory} 
          gameState={gameState}
          width={chartWidth}
          height={chartHeight}
          padding={chartPadding} // Pass padding as a prop
        />
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
