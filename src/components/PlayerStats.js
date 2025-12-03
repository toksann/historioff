import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import { getEffectiveScale } from '../gameLogic/gameUtils.js';
import { HUMAN_PLAYER_ID } from '../gameLogic/constants.js';
import useAnimationManager from '../hooks/useAnimationManager.js';

const PlayerStats = ({ player, gameState, onEndTurn }) => {
    const [showDetails, setShowDetails] = useState(false);
    const { triggerEffect } = useAnimationManager(gameState);
    
    // 前回の値を記録（変化検知用）
    const prevValuesRef = useRef({
        consciousness: null,
        scale: null
    });
    
    // リソース変化の検知と演出トリガー
    useEffect(() => {
        if (!player || !triggerEffect) return;
        
        const currentConsciousness = player.consciousness;
        const currentScale = getEffectiveScale(player);
        const prevValues = prevValuesRef.current;
        
        // 意識の変化をチェック
        if (prevValues.consciousness !== null && prevValues.consciousness !== currentConsciousness) {
            const changeAmount = currentConsciousness - prevValues.consciousness;
            //console.log('🎬ANIM [PlayerStats] *** CONSCIOUSNESS CHANGE DETECTED ***');
            //console.log('🎬ANIM [PlayerStats] Previous:', prevValues.consciousness, '→ Current:', currentConsciousness);
            //console.log('🎬ANIM [PlayerStats] Change amount:', changeAmount);
            //console.log('🎬ANIM [PlayerStats] Is increase?', changeAmount > 0);
            
            const consciousnessElement = document.querySelector(`[data-player-id="${player.id}"] .consciousness .stat-value`);
            if (consciousnessElement) {
                // 変化量に基づいて正しいエフェクトタイプを決定
                const effectType = 'CONSCIOUSNESS_CHANGE_RESULT';
                //console.log('🎬ANIM [PlayerStats] Triggering consciousness animation with amount:', changeAmount);
                triggerEffect(effectType, consciousnessElement, {
                    effect: {
                        args: {
                            amount: changeAmount,
                            player_id: player.id
                        }
                    }
                });
            }
        }
        
        // 規模の変化をチェック
        if (prevValues.scale !== null && prevValues.scale !== currentScale) {
            const changeAmount = currentScale - prevValues.scale;
            //console.log('🎬ANIM [PlayerStats] *** SCALE CHANGE DETECTED ***');
            //console.log('🎬ANIM [PlayerStats] Previous:', prevValues.scale, '→ Current:', currentScale);
            //console.log('🎬ANIM [PlayerStats] Change amount:', changeAmount);
            //console.log('🎬ANIM [PlayerStats] Is increase?', changeAmount > 0);
            
            const scaleElement = document.querySelector(`[data-player-id="${player.id}"] .scale .stat-value`);
            if (scaleElement) {
                // 変化量に基づいて正しいエフェクトタイプを決定
                const effectType = 'SCALE_CHANGE_RESULT';
                //console.log('🎬ANIM [PlayerStats] Triggering scale animation with amount:', changeAmount);
                triggerEffect(effectType, scaleElement, {
                    effect: {
                        args: {
                            amount: changeAmount,
                            player_id: player.id
                        }
                    }
                });
            }
        }
        
        // 現在の値を記録
        prevValuesRef.current = {
            consciousness: currentConsciousness,
            scale: currentScale
        };
    }, [player?.consciousness, getEffectiveScale(player), player?.id, triggerEffect]);

    // プレイヤーが存在しない場合のearly return（Hooksの後に配置）
    if (!player) return <div className="player-stats">プレイヤー読み込み中...</div>;

    const effectiveScale = getEffectiveScale(player, gameState);
    const scaleDisplay = effectiveScale !== player.scale 
        ? `${effectiveScale} (${player.scale})` 
        : player.scale;

    // 場のカード数を計算（財カードのみ）
    const fieldCardCount = player.field.length;
    
    // 先攻後攻の判定
    const isFirstPlayer = gameState?.first_player === player.id;
    const turnOrderText = isFirstPlayer ? '先攻' : '後攻';

    // 数字の表示フォーマット（大きな数字を短縮）
    const formatNumber = (num) => {
        if (num >= 10000) {
            return `${Math.floor(num / 1000)}k`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    // 規模表示のフォーマット（実効規模と元の規模の両方を考慮）
    const formatScaleDisplay = (scaleDisplay) => {
        if (typeof scaleDisplay === 'string' && scaleDisplay.includes('(')) {
            // "15 (10)" のような形式の場合
            const match = scaleDisplay.match(/^(\d+)\s*\((\d+)\)$/);
            if (match) {
                const effectiveScale = parseInt(match[1]);
                const originalScale = parseInt(match[2]);
                return `${formatNumber(effectiveScale)} (${formatNumber(originalScale)})`;
            }
        }
        // 単純な数字の場合
        const numValue = typeof scaleDisplay === 'number' ? scaleDisplay : parseInt(scaleDisplay);
        return formatNumber(numValue);
    };

    const consciousnessDisplay = formatNumber(player.consciousness);
    const scaleDisplayFormatted = formatScaleDisplay(scaleDisplay);

    return (
        <div className="player-stats" data-player-id={player.id}>
            {/* 簡潔な基本表示 */}
            <button 
                className="player-name-button"
                onClick={() => setShowDetails(!showDetails)}
                title="クリックで詳細表示"
            >
                <div className="player-name-line">
                    <span className="player-name-text">{player.name}</span>
                    <span className={`turn-order ${isFirstPlayer ? 'first-player' : 'second-player'}`}>
                        ({turnOrderText})
                    </span>
                </div>
                <div className="deck-count-line">
                    デッキ{player.deck.length}枚
                </div>
            </button>
            
            {/* 意識と規模を大きく表示 */}
            <div className="main-stats">
                <div className="main-stat consciousness">
                    <div className="stat-label">意識</div>
                    <div className="stat-value" title={`正確な値: ${player.consciousness}`}>{consciousnessDisplay}</div>
                </div>
                <div className="main-stat scale">
                    <div className="stat-label">規模</div>
                    <div className="stat-value" title={`正確な値: ${scaleDisplay}`}>{scaleDisplayFormatted}</div>
                </div>
            </div>

            {/* ターン終了ボタン */}
            {onEndTurn && (
                <button 
                    onClick={onEndTurn} 
                    disabled={!!gameState?.awaiting_input || gameState?.current_turn !== HUMAN_PLAYER_ID}
                    className="end-turn-button"
                >
                    ターン終了
                </button>
            )}

            {/* 詳細情報オーバーレイ */}
            {showDetails && (
                <div className="player-details-overlay" onClick={() => setShowDetails(false)}>
                    <div className="player-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="player-details-header">
                            <h3>{player.name} の詳細情報</h3>
                            <button 
                                className="close-button"
                                onClick={() => setShowDetails(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="player-details-content">
                            <div className="detail-section">
                                <h4>基本情報</h4>
                                <div className="detail-stat-line">
                                    <span className="detail-label">意識:</span>
                                    <span className="detail-value">{player.consciousness}</span>
                                </div>
                                <div className="detail-stat-line">
                                    <span className="detail-label">規模:</span>
                                    <span className="detail-value">{scaleDisplay}</span>
                                </div>
                                <div className="detail-stat-line">
                                    <span className="detail-label">場の制限:</span>
                                    <span className="detail-value">{player.field_limit}</span>
                                </div>
                            </div>
                            <div className="detail-section">
                                <h4>カード枚数</h4>
                                <div className="detail-stat-line">
                                    <span className="detail-label">デッキ:</span>
                                    <span className="detail-value">{player.deck.length}枚</span>
                                </div>
                                <div className="detail-stat-line">
                                    <span className="detail-label">手札:</span>
                                    <span className="detail-value">{player.hand.length}枚</span>
                                </div>
                                <div className="detail-stat-line">
                                    <span className="detail-label">捨て札:</span>
                                    <span className="detail-value">{player.discard.length}枚</span>
                                </div>
                                <div className="detail-stat-line">
                                    <span className="detail-label">場:</span>
                                    <span className="detail-value">{fieldCardCount}/{player.field_limit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerStats;
