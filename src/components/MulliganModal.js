import React, { useState, useEffect } from 'react';
import './MulliganModal.css';
import { createParticleExplosion } from '../utils/animationUtils.js';
import { NPC_PLAYER_ID } from '../gameLogic/constants.js';

const MulliganModal = ({ hand, onConfirmMulligan, cardDefs, mulliganState }) => {
    const [selectedCardIds, setSelectedCardIds] = useState([]);
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        if (isConfirmed) {
            // Use setTimeout to allow React to render the new hand before we search for the elements
            setTimeout(() => {
                hand.forEach(card => {
                    if (card.isNew) {
                        const cardElement = document.querySelector(`.mulligan-card[data-card-id="${card.instance_id}"]`);
                        if (cardElement) {
                            createParticleExplosion(cardElement, card.card_type);
                        }
                    }
                });
            }, 50); // A small delay is usually enough
        }
    }, [isConfirmed, hand]);

    const handleCardClick = (cardId) => {
        if (isConfirmed) return;
        
        setSelectedCardIds(prevSelected => {
            if (prevSelected.includes(cardId)) {
                return prevSelected.filter(id => id !== cardId);
            } else {
                return [...prevSelected, cardId];
            }
        });
    };

    const handleConfirm = () => {
        if (isConfirmed) return;
        setIsConfirmed(true);
        onConfirmMulligan(selectedCardIds);
    };

    const npcCulliganedCount = mulliganState[NPC_PLAYER_ID]?.count || 0;

    return (
        <div className="mulligan-overlay">
            <div className="mulligan-modal">
                <h2>{isConfirmed ? "新しい手札" : "マリガン"}</h2>
                <p>{isConfirmed ? "手札を交換しました！" : "交換したいカードを選択してください。"}</p>
                {isConfirmed && (
                    <p className="npc-mulligan-info">相手は<span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{npcCulliganedCount}</span>枚交換しました。</p>
                )}
                <div className="mulligan-hand-container">
                    {hand.map(card => {
                        const cardDef = cardDefs[card.name];
                        const isSelected = !isConfirmed && selectedCardIds.includes(card.instance_id);
                        return (
                            <div
                                key={card.instance_id}
                                className={`mulligan-card ${isSelected ? 'selected' : ''}`}
                                data-card-id={card.instance_id}
                                onClick={() => handleCardClick(card.instance_id)}
                            >
                                <div className="mulligan-card-name">{card.name}</div>
                                <div className="mulligan-card-cost">必要規模: {card.required_scale}</div>
                                <div className="mulligan-card-type">{cardDef.card_type}</div>
                            </div>
                        );
                    })}
                </div>
                {isConfirmed && (
                    <div className="mulligan-progress-bar-container">
                        <div className="mulligan-progress-bar"></div>
                    </div>
                )}
                {!isConfirmed && (
                    <div className="mulligan-actions">
                        <button onClick={handleConfirm}>
                            決定する ({selectedCardIds.length}枚)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MulliganModal;
