import React from 'react';
import './GameOverScreen.css';
import ConsciousnessTrendChart from './ConsciousnessTrendChart.js';
import useWindowSize from '../hooks/useWindowSize.js'; // Import the new hook

function GameOverScreen({ winnerName, onNewGame, onMainMenu, turnHistory, gameState, isTutorial }) {
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
    <div className="game-over-screen game-over-container-dark">
      <div className="title-bg-animation"></div>
      <div className="title-scanline"></div>
      
      <h1 style={{ position: 'relative', zIndex: 20 }}>闘争ここに完成せり</h1>
      <h2 style={{ position: 'relative', zIndex: 20 }}>勝者: {winnerName}</h2>
      
      <div className="chart-container" style={{ position: 'relative', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>綴られし"歴史"</h3>
        <ConsciousnessTrendChart 
          turnHistory={turnHistory} 
          gameState={gameState}
          width={chartWidth}
          height={chartHeight}
          padding={chartPadding} // Pass padding as a prop
        />
      </div>

      <div className="game-over-buttons" style={{ position: 'relative', zIndex: 20 }}>
        <button className="menu-button start-button" onClick={onNewGame}>
          {isTutorial ? 'チュートリアル選択に戻る' : '新しいゲームを始める'}
        </button>
        <button className="menu-button" onClick={onMainMenu}>
          メインメニューに戻る
        </button>
      </div>
    </div>
  );
}

export default GameOverScreen;
