import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import './ConsciousnessTrendChart.css';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID } from '../gameLogic/constants.js';


const ConsciousnessTrendChart = ({ turnHistory, gameState }) => {
    const [hoveredTurnIndex, setHoveredTurnIndex] = useState(null);
    const [ideologyView, setIdeologyView] = useState('player'); // 'player' or 'npc'
    const playerLineRef = useRef(null); // Ref to polyline DOM element
    const npcLineRef = useRef(null);     // Ref to polyline DOM element
    const playerLineInitialLength = useRef(0); // Store actual total length
    const npcLineInitialLength = useRef(0);     // Store actual total length
    const [pointsVisibleIndex, setPointsVisibleIndex] = useState(-1); // Index of the last visible point
    const latestPointsVisibleIndexRef = useRef(pointsVisibleIndex); // Ref to track latest pointsVisibleIndex without triggering useEffect
    const [poppingPointIndex, setPoppingPointIndex] = useState(null); // State to trigger point pop animation

    const width = 800;
    const height = 400;
    const padding = 60; // Increased padding for labels

    const getX = useCallback((turn) => padding + ((turn - 1) / (maxTurn > 1 ? maxTurn - 1 : 1)) * (width - padding * 2), [width, padding]);
    const getY = useCallback((consciousness) => {
        const span = maxConsciousness - minConsciousness;
        if (span === 0) return height - padding;
        return height - padding - ((consciousness - minConsciousness) / span) * (height - padding * 2);
    }, [height, padding]);


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

    // Callback ref for player line to calculate and store its length, and set initial DOM style
    const setPlayerLineRef = useCallback(node => { // Renamed for clarity, using local var playerLineRef as the actual React ref
        playerLineRef.current = node;
        if (node !== null) {
            const length = node.getTotalLength();
            playerLineInitialLength.current = length;
            node.style.strokeDasharray = length;
            node.style.strokeDashoffset = length; // Ensure hidden from first render
            // console.log("[CTCDebug] Player Line DOM Initialized. Length:", length); // Removed debug log
        }
    }, [displayHistory]); // Re-run if displayHistory changes, to re-calculate length

    // Callback ref for NPC line to calculate and store its length, and set initial DOM style
    const setNpcLineRef = useCallback(node => { // Renamed for clarity, using local var npcLineRef as the actual React ref
        npcLineRef.current = node;
        if (node !== null) {
            const length = node.getTotalLength();
            npcLineInitialLength.current = length;
            node.style.strokeDasharray = length;
            node.style.strokeDashoffset = length; // Ensure hidden from first render
            // console.log("[CTCDebug] NPC Line DOM Initialized. Length:", length); // Removed debug log
        }
    }, [displayHistory]); // Re-run if displayHistory changes, to re-calculate length

    // Keep latestPointsVisibleIndexRef up-to-date with pointsVisibleIndex state
    useEffect(() => {
        latestPointsVisibleIndexRef.current = pointsVisibleIndex;
    }, [pointsVisibleIndex]);

    // Effect to trigger the animation AFTER lengths are known and DOM refs are set
    useEffect(() => {
        let animationFrameId;
        let startTime;

        // let currentPointsVisibleIndexInternal = -1; // This is now handled by latestPointsVisibleIndexRef

        const chartWidth = width - padding * 2;
        // console.log("[CTCDebug] useEffect triggered. Chart width:", chartWidth); // Removed debug log

        const animateLine = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const duration = 3000; // Animation duration in milliseconds

            const easeOutQuad = t => t * (2 - t); // Easing function

            const animationProgress = Math.min(1, progress / duration);
            const easedProgress = easeOutQuad(animationProgress);

            // Calculate current drawn distance based on full chart width
            const currentDrawnDistance = easedProgress * chartWidth;

            // Update line offsets by directly manipulating DOM
            if (playerLineRef.current && playerLineInitialLength.current > 0) {
                playerLineRef.current.style.strokeDashoffset = playerLineInitialLength.current * (1 - easedProgress);
            }
            if (npcLineRef.current && npcLineInitialLength.current > 0) {
                npcLineRef.current.style.strokeDashoffset = npcLineInitialLength.current * (1 - easedProgress);
            }

            // Update points visibility
            let newPointsVisibleIndex = -1;
            for (let i = 0; i < displayHistory.length; i++) {
                const pointXRelativeToChartStart = getX(displayHistory[i].turnNumber) - padding;
                if (currentDrawnDistance >= pointXRelativeToChartStart) {
                    newPointsVisibleIndex = i;
                } else {
                    break;
                }
            }
            
            // Only update state if there's an actual change to trigger render
            if (newPointsVisibleIndex !== latestPointsVisibleIndexRef.current) {
                latestPointsVisibleIndexRef.current = newPointsVisibleIndex; // Update ref
                setPointsVisibleIndex(newPointsVisibleIndex); // Trigger React re-render for points
                setPoppingPointIndex(newPointsVisibleIndex); // Trigger pop animation for this point
                // console.log("[CTCDebug] Points Visible Index updated (via ref):", newPointsVisibleIndex); // Removed debug log
            }

            // console.log(`[CTCDebug] Frame: ${Math.floor(progress)}, Eased: ${easedProgress.toFixed(2)}, Player Offset (DOM): ${playerLineRef.current?.style.strokeDashoffset}, NPC Offset (DOM): ${npcLineRef.current?.style.strokeDashoffset}, Points Index (state): ${pointsVisibleIndex}, Points Index (ref): ${latestPointsVisibleIndexRef.current}`); // Removed debug log


            if (animationProgress < 1) {
                animationFrameId = requestAnimationFrame(animateLine);
            }
        };

        // Only start animation if displayHistory has data AND line refs are populated
        if (displayHistory.length > 0 && playerLineRef.current && npcLineRef.current) {
            // Set initial dasharray and offset directly on DOM for lines to be hidden
            // This is already handled in the useCallback refs, but re-asserting here for clarity
            playerLineRef.current.style.strokeDasharray = playerLineInitialLength.current;
            playerLineRef.current.style.strokeDashoffset = playerLineInitialLength.current;
            npcLineRef.current.style.strokeDasharray = npcLineInitialLength.current;
            npcLineRef.current.style.strokeDashoffset = npcLineInitialLength.current;
            
            setPointsVisibleIndex(-1); // Ensure points are hidden initially
            latestPointsVisibleIndexRef.current = -1; // Reset ref as well
            setPoppingPointIndex(null); // Reset popping point index
            // console.log("[CTCDebug] Initial DOM state for lines set: Offsets to full length. Points hidden."); // Removed debug log


            const timer = setTimeout(() => {
                // console.log("[CTCDebug] Starting requestAnimationFrame loop after delay."); // Removed debug log
                animationFrameId = requestAnimationFrame(animateLine);
            }, 1000); // 1 second delay before animation starts

            return () => {
                clearTimeout(timer);
                cancelAnimationFrame(animationFrameId);
                // console.log("[CTCDebug] Animation cleanup."); // Removed debug log
            };
        }
    }, [displayHistory, getX, width, padding, playerLineRef, npcLineRef, playerLineInitialLength, npcLineInitialLength]);


    if (displayHistory.length === 0) {
        return <div>チャートデータがありません。</div>;
    }

    const maxTurn = Math.max(...displayHistory.map(h => h.turnNumber), 1);
    const allConsciousness = displayHistory.flatMap(h => [h.playerConsciousness, h.npcConsciousness]);
    const maxDataY = Math.max(...allConsciousness);
    const minDataY = Math.min(...allConsciousness);
    const maxConsciousness = maxDataY + 5;
    const minConsciousness = 0;

    const playerLinePoints = displayHistory.map(h => `${getX(h.turnNumber)},${getY(h.playerConsciousness)}`).join(' ');
    const npcLinePoints = displayHistory.map(h => `${getX(h.turnNumber)},${getY(h.npcConsciousness)}`).join(' ');

    const colorPalette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#800000', '#ffd8b1', '#000075'];
    
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
                    <polyline
                        ref={setPlayerLineRef} // Use the callback ref
                        points={playerLinePoints}
                        className="line player-line"
                        fill="none"
                        style={{
                            strokeDasharray: playerLineInitialLength.current,
                            // strokeDashoffset is directly manipulated via DOM, not via React state for lines
                            opacity: 1, // Line opacity is always 1, strokeDashoffset controls drawing
                        }}
                    />
                    <polyline
                        ref={setNpcLineRef} // Use the callback ref
                        points={npcLinePoints}
                        className="line npc-line"
                        fill="none"
                        style={{
                            strokeDasharray: npcLineInitialLength.current,
                            // strokeDashoffset is directly manipulated via DOM, not via React state for lines
                            opacity: 1, // Line opacity is always 1, strokeDashoffset controls drawing
                        }}
                    />
                    {displayHistory.map((h, i) => (
                        <g key={`point-group-${i}`}>
                            <circle
                                cx={getX(h.turnNumber)}
                                cy={getY(h.playerConsciousness)}
                                r="4"
                                className={`point player-point ${i === poppingPointIndex ? 'point-pop' : ''}`}
                                style={{ opacity: i <= pointsVisibleIndex ? 1 : 0 }}
                                onAnimationEnd={() => setPoppingPointIndex(null)}
                            />
                            <circle
                                cx={getX(h.turnNumber)}
                                cy={getY(h.npcConsciousness)}
                                r="4"
                                className={`point npc-point ${i === poppingPointIndex ? 'point-pop' : ''}`}
                                style={{ opacity: i <= pointsVisibleIndex ? 1 : 0 }}
                                onAnimationEnd={() => setPoppingPointIndex(null)}
                            />
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
