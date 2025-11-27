import React from 'react';
import '../App.css';
import { getEffectiveScale } from '../gameLogic/gameUtils.js';

const CardActionMenu = ({ card, player, gameState, onPlay, onClose }) => {
    if (!card) return null;

    const handleOverlayClick = (e) => {
        // オーバーレイの背景をクリックした場合のみ閉じる
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // プレイ可能かどうかの判定
    const canPlay = () => {
        if (!player || gameState.awaiting_input) return false;
        
        const effectiveScale = getEffectiveScale(player, gameState);
        const hasEnoughScale = effectiveScale >= card.required_scale;
        
        // 財カードの場合は場の上限もチェック（「マネー」は除く）
        if (card.card_type === '財' && !(player.field.filter(c => c.name === 'マネー').length > 0 && card.name === 'マネー')) {
            const fieldCount = player.field.length;
            const hasFieldSpace = fieldCount < player.field_limit;
            return hasEnoughScale && hasFieldSpace;
        }
        
        return hasEnoughScale;
    };

    const playable = canPlay();
    const durabilityValue = card.current_durability !== undefined ? card.current_durability : card.durability;

    // プレイ不可の理由を取得
    const getPlayRestriction = () => {
        if (gameState.awaiting_input) return '選択待ち中';
        if (getEffectiveScale(player, gameState) < card.required_scale) return '規模不足';
        if (card.card_type === '財' && card.name !== 'マネー' && player.field.length >= player.field_limit) return '場が満杯';
        return 'プレイ不可';
    };

    return (
        <div className="card-action-overlay" onClick={handleOverlayClick}>
            <div className="card-detail-modal">
                <div className="card-detail-header">
                    <h2>{card.name}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="card-detail-content">
                    <div className="card-detail-info">
                        <div className="info-row">
                            <span className="info-label">タイプ:</span>
                            <span className="info-value">{card.card_type}</span>
                        </div>
                        
                        <div className="info-row">
                            <span className="info-label">必要規模:</span>
                            <span className="info-value">{card.required_scale}</span>
                        </div>
                        
                        {card.card_type === '財' && (
                            <div className="info-row">
                                <span className="info-label">耐久値:</span>
                                <span className="info-value">{durabilityValue}/{card.durability}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="card-detail-description">
                        <h4>効果:</h4>
                        <p>{card.description}</p>
                    </div>
                    
                    <div className="card-action-section">
                        <button 
                            className={`play-action-button ${!playable ? 'disabled' : ''}`}
                            onClick={playable ? onPlay : undefined}
                            disabled={!playable}
                        >
                            {playable ? 'プレイ' : getPlayRestriction()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardActionMenu;