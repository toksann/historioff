import React from 'react';
import '../App.css';

const CardDetail = ({ card, onClose }) => {
    if (!card) return null;

    const handleOverlayClick = (e) => {
        // オーバーレイの背景をクリックした場合のみ閉じる
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const durabilityValue = card.current_durability !== undefined ? card.current_durability : card.durability;

    return (
        <div className="card-detail-overlay" onClick={handleOverlayClick}>
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
                </div>
            </div>
        </div>
    );
};

export default CardDetail;