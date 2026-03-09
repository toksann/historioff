import React, { useMemo } from 'react';
import '../App.css';
import { getEffectiveScale } from '../gameLogic/gameUtils.js';

const CardActionMenu = ({ card, player, gameState, cardDefs, onPlay, onClose }) => {
    // 関連カード（トークンやトリガー対象）を抽出
    const relatedCards = useMemo(() => {
        if (!card || !cardDefs) return [];
        
        // インスタンス（card）ではなく、定義（cardDefs[card.name]）から情報を取得する
        const baseDef = cardDefs[card.name] || card;
        const names = new Set();

        // 1. 手動指定された関連カードを追加
        if (Array.isArray(baseDef.related_card_templates)) {
            baseDef.related_card_templates.forEach(name => names.add(name));
        }

        // 2. 効果（triggers）内を再帰的に走査して card_template_name を探す
        const findCardTemplates = (obj) => {
            if (!obj || typeof obj !== 'object') return;

            if (obj.card_template_name) {
                names.add(obj.card_template_name);
            }

            Object.values(obj).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(item => findCardTemplates(item));
                } else if (typeof value === 'object') {
                    findCardTemplates(value);
                }
            });
        };

        if (baseDef.triggers) {
            findCardTemplates(baseDef.triggers);
        }

        return Array.from(names).map(name => cardDefs[name]).filter(Boolean);
    }, [card, cardDefs]);

    if (!card) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // プレイ可能かどうかの判定
    const canPlay = () => {
        if (!player || gameState.awaiting_input) return false;
        const isPlayerTurn = gameState.current_turn === card.owner;
        if (!isPlayerTurn) return false;
        
        const effectiveScale = getEffectiveScale(player, gameState);
        const hasEnoughScale = effectiveScale >= card.required_scale;
        
        if (card.card_type === '財' && !(player.field.filter(c => c.name === 'マネー').length > 0 && card.name === 'マネー')) {
            const fieldCount = player.field.length;
            const hasFieldSpace = fieldCount < player.field_limit;
            return hasEnoughScale && hasFieldSpace;
        }
        
        return hasEnoughScale;
    };

    const playable = canPlay();
    const durabilityValue = card.current_durability !== undefined ? card.current_durability : card.durability;

    const getPlayRestriction = () => {
        if (gameState.awaiting_input) return '選択待ち中';
        if (getEffectiveScale(player, gameState) < card.required_scale) return '規模不足';
        if (card.card_type === '財' && card.name !== 'マネー' && player.field.length >= player.field_limit) return '場が満杯';
        if (gameState.current_turn !== card.owner) return '相手のターン中';
        return 'プレイ不可';
    };

    return (
        <div className="card-detail-overlay" onClick={handleOverlayClick}>
            <div className="card-detail-modal action-menu-modal fixed-footer">
                <div className="card-detail-header">
                    <div className="card-header-main">
                        <h2>{card.name}</h2>
                        {card.is_token && <span className="token-badge">TOKEN</span>}
                    </div>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="card-detail-scroll-area">
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

                        {relatedCards.length > 0 && (
                            <div className="related-cards-section">
                                <h4>関連カード:</h4>
                                <div className="related-cards-list">
                                    {relatedCards.map((rc, idx) => (
                                        <div key={idx} className="related-card-item">
                                            <div className="related-card-header">
                                                <span className="related-card-name">{rc.name}</span>
                                                <span className="related-card-type">{rc.card_type}</span>
                                                {rc.is_token && <span className="token-badge">TOKEN</span>}
                                            </div>
                                            <p className="related-card-description">{rc.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="card-action-section">
                    <button 
                        id="play_button"
                        className={`play-action-button ${!playable ? 'disabled' : ''}`}
                        onClick={playable ? onPlay : undefined}
                        disabled={!playable}
                    >
                        {playable ? 'プレイ' : getPlayRestriction()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardActionMenu;