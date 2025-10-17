import React from 'react';
import '../App.css';
import { getEffectiveScale } from '../gameLogic/gameUtils.js';

const PlayerStats = ({ player, gameState }) => {
    if (!player) return <div className="player-stats">プレイヤー読み込み中...</div>;

    const effectiveScale = getEffectiveScale(player);
    const scaleDisplay = effectiveScale !== player.scale 
        ? `${effectiveScale} (${player.scale})` 
        : player.scale;

    // 場のカード数を計算（財カード + イデオロギーカード）
    const fieldCardCount = player.field.length + (player.ideology ? 1 : 0);
    
    // 先攻後攻の判定
    const isFirstPlayer = gameState?.first_player === player.id;
    const turnOrderText = isFirstPlayer ? '先攻' : '後攻';

    return (
        <div className="player-stats">
            <h4>
                {player.name}
                <span className={`turn-order ${isFirstPlayer ? 'first-player' : 'second-player'}`}>
                    ({turnOrderText})
                </span>
            </h4>
            <div className="stat-line">
                <span className="stat-label">意識:</span>
                <span className="stat-value">{player.consciousness}</span>
            </div>
            <div className="stat-line">
                <span className="stat-label">規模:</span>
                <span className="stat-value">{scaleDisplay}</span>
            </div>
            <div className="stat-line">
                <span className="stat-label">デッキ:</span>
                <span className="stat-value">{player.deck.length}枚</span>
            </div>
            <div className="stat-line">
                <span className="stat-label">手札:</span>
                <span className="stat-value">{player.hand.length}枚</span>
            </div>
            <div className="stat-line">
                <span className="stat-label">捨て札:</span>
                <span className="stat-value">{player.discard.length}枚</span>
            </div>
            <div className="stat-line">
                <span className="stat-label">場:</span>
                <span className="stat-value">{fieldCardCount}/{player.field_limit}</span>
            </div>
        </div>
    );
};

export default PlayerStats;
