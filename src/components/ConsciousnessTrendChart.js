import React, { useState, useMemo } from 'react';
import './ConsciousnessTrendChart.css';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID } from '../gameLogic/constants.js';


const ConsciousnessTrendChart = ({ turnHistory, gameState }) => {
    const [hoveredTurnIndex, setHoveredTurnIndex] = useState(null);
    const [ideologyView, setIdeologyView] = useState('player'); // 'player' or 'npc'

    // Memoize the calculation for the display history
    const displayHistory = useMemo(() => {
        if (!turnHistory) return [];
        
        let newHistory = [...turnHistory];

        if (gameState && gameState.game_over) {
            const lastTurnInHistory = newHistory[newHistory.length - 1];
            const finalPoint = {
                turnNumber: gameState.turn_number,
                playerConsciousness: gameState.players[HUMAN_PLAYER_ID].consciousness,
                npcConsciousness: gameState.players[NPC_PLAYER_ID].consciousness,
                playerIdeologies: gameState.players[HUMAN_PLAYER_ID].ideology ? [gameState.players[HUMAN_PLAYER_ID].ideology.name] : [],
                npcIdeologies: gameState.players[NPC_PLAYER_ID].ideology ? [gameState.players[NPC_PLAYER_ID].ideology.name] : [],
            };

            // If the game ends on a new turn number, add the final point.
            // If it ends on the same turn, update the last point to reflect the final state.
            if (lastTurnInHistory && lastTurnInHistory.turnNumber === finalPoint.turnNumber) {
                newHistory[newHistory.length - 1] = finalPoint;
            } else {
                newHistory.push(finalPoint);
            }
        }
        return newHistory;
    }, [turnHistory, gameState]);


    if (displayHistory.length === 0) {
        return <div>チャートデータがありません。</div>;
    }

    const width = 800;
    const height = 400;
    const padding = 60; // Increased padding for labels

    const maxTurn = Math.max(...displayHistory.map(h => h.turnNumber), 1);
    const allConsciousness = displayHistory.flatMap(h => [h.playerConsciousness, h.npcConsciousness]);
    const maxDataY = Math.max(...allConsciousness);
    const minDataY = Math.min(...allConsciousness);
    const maxConsciousness = maxDataY + 5;
    const minConsciousness = 0;

    const getX = (turn) => padding + ((turn - 1) / (maxTurn > 1 ? maxTurn - 1 : 1)) * (width - padding * 2);
    const getY = (consciousness) => {
        const span = maxConsciousness - minConsciousness;
        if (span === 0) return height - padding;
        return height - padding - ((consciousness - minConsciousness) / span) * (height - padding * 2);
    };

    const playerLine = displayHistory.map(h => `${getX(h.turnNumber)},${getY(h.playerConsciousness)}`).join(' ');
    const npcLine = displayHistory.map(h => `${getX(h.turnNumber)},${getY(h.npcConsciousness)}`).join(' ');

    const colorPalette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075'];
    
    const getDeterministicColor = (name) => {
        if (!name) return '#555'; // For "イデオロギーなし"
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colorPalette[Math.abs(hash % colorPalette.length)];
    };

    const ideologyBlocks = [];
    let lastColor = null;

    for (let i = 0; i < displayHistory.length; i++) {
        const current = displayHistory[i];
        const prev = i > 0 ? displayHistory[i - 1] : null;

        const ideologies = ideologyView === 'player' ? current.playerIdeologies : current.npcIdeologies;
        const currentIdeologyName = (ideologies && ideologies.length > 0) ? ideologies[0] : null;

        let prevIdeologies = null;
        if(prev) {
            prevIdeologies = ideologyView === 'player' ? prev.playerIdeologies : prev.npcIdeologies;
        }
        const prevIdeologyName = prev && prevIdeologies && prevIdeologies.length > 0 ? prevIdeologies[0] : null;

        if (i === 0 || currentIdeologyName !== prevIdeologyName) {
            let newColor = getDeterministicColor(currentIdeologyName);
            if (newColor === lastColor) {
                const newColorIndex = (colorPalette.indexOf(newColor) + 1) % colorPalette.length;
                newColor = colorPalette[newColorIndex];
            }
            lastColor = newColor;
        }
        
        const next = displayHistory[i + 1];
        const x1 = getX(current.turnNumber);
        const x2 = next ? getX(next.turnNumber) : width - padding;
        
        if (x1 > x2) continue;

        ideologyBlocks.push(
            <rect
                key={`block-${i}`}
                x={x1} y={padding}
                width={x2 - x1} height={height - padding * 2}
                fill={lastColor} opacity="0.1"
                onMouseOver={() => setHoveredTurnIndex(i)}
                onMouseOut={() => setHoveredTurnIndex(null)}
            />
        );
    }

    const yAxisLabels = [];
    for (let i = 0; i <= 5; i++) {
        const consciousness = minConsciousness + (i / 5) * (maxConsciousness - minConsciousness);
        const y = getY(consciousness);
        yAxisLabels.push(
            <g key={`y-label-${i}`} className="axis-group">
                <text x={padding - 10} y={y + 5} textAnchor="end" className="axis-label">{Math.round(consciousness)}</text>
                <line x1={padding} y1={y} x2={width - padding} y2={y} className="grid-line" />
            </g>
        );
    }
    const xAxisLabels = displayHistory.map((h, i) => (
        <text key={`x-label-${i}`} x={getX(h.turnNumber)} y={height - padding + 20} textAnchor="middle" className="axis-label">
            {h.turnNumber}
        </text>
    ));

    let tooltip = null;
    if (hoveredTurnIndex !== null && displayHistory[hoveredTurnIndex]) {
        const current = displayHistory[hoveredTurnIndex];
        const playerIdeology = current.playerIdeologies[0] || 'なし';
        const npcIdeology = current.npcIdeologies[0] || 'なし';
        
        tooltip = (
             <g transform={`translate(${getX(current.turnNumber)}, ${getY(current.playerConsciousness) - 20})`} className="tooltip">
                <rect x="-80" y="-20" width="160" height="95" rx="5" className="tooltip-bg" />
                <text x="0" y="0" textAnchor="middle" className="tooltip-title">ターン {current.turnNumber}</text>
                <text x="-70" y="20" className="tooltip-text">あなた: <tspan className="player-text">{current.playerConsciousness}</tspan> ({playerIdeology})</text>
                <text x="-70" y="40" className="tooltip-text">相手: <tspan className="npc-text">{current.npcConsciousness}</tspan> ({npcIdeology})</text>
            </g>
        );
    }

    return (
        <div className="chart-wrapper">
            <div className="chart-toggle-buttons">
                <button onClick={() => setIdeologyView('player')} disabled={ideologyView === 'player'}>あなたのイデオロギー</button>
                <button onClick={() => setIdeologyView('npc')} disabled={ideologyView === 'npc'}>相手のイデオロギー</button>
            </div>
            <svg width={width} height={height} className="consciousness-chart">
                <defs>
                    <clipPath id="chart-area">
                        <rect x={padding} y={padding} width={width - padding*2} height={height - padding*2} />
                    </clipPath>
                </defs>

                {yAxisLabels}
                {xAxisLabels}
                <g clipPath="url(#chart-area)">
                    {ideologyBlocks}
                    <polyline points={playerLine} className="line player-line" fill="none" />
                    <polyline points={npcLine} className="line npc-line" fill="none" />
                    {displayHistory.map((h, i) => (
                        <g key={`point-group-${i}`}>
                            <circle cx={getX(h.turnNumber)} cy={getY(h.playerConsciousness)} r="4" className="point player-point" />
                            <circle cx={getX(h.turnNumber)} cy={getY(h.npcConsciousness)} r="4" className="point npc-point" />
                        </g>
                    ))}
                </g>
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis-line" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis-line" />
                
                <g transform={`translate(${width - padding - 80}, ${padding + 10})`}>
                    <rect x="0" y="0" width="10" height="10" fill="#007bff" />
                    <text x="15" y="10" className="legend-label">あなた</text>
                    <rect x="0" y="20" width="10" height="10" fill="#dc3545" />
                    <text x="15" y="30" className="legend-label">NPC</text>
                </g>

                {tooltip}
            </svg>
        </div>
    );
};

export default ConsciousnessTrendChart;
