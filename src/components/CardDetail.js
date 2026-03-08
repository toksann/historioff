import React, { useMemo } from 'react';
import '../App.css';

const CardDetail = ({ card, cardDefs, onClose }) => {
    // 関連カード（トークンなど）の抽出
    const relatedCards = useMemo(() => {
        if (!card || !cardDefs) return [];
        const names = new Set();

        // 1. 手動指定された関連カードを追加
        if (Array.isArray(card.related_card_templates)) {
            card.related_card_templates.forEach(name => names.add(name));
        }

        // 2. 効果（triggers）内を再帰的に走査して card_template_name を探す
        const findCardTemplates = (obj) => {
            if (!obj || typeof obj !== 'object') return;

            // card_template_name プロパティがあれば収集
            if (obj.card_template_name) {
                names.add(obj.card_template_name);
            }

            // 配列またはオブジェクトの中身をさらに探索
            Object.values(obj).forEach(value => {
                if (Array.isArray(value)) {
                    value.forEach(item => findCardTemplates(item));
                } else if (typeof value === 'object') {
                    findCardTemplates(value);
                }
            });
        };

        if (card.triggers) {
            findCardTemplates(card.triggers);
        }

        return Array.from(names).map(name => cardDefs[name]).filter(Boolean);
    }, [card, cardDefs]);

    if (!card) return null;

    const handleOverlayClick = (e) => {
        // オーバーレイの背景をクリックした場合のみ閉じる
        if (e.target.className === 'card-detail-overlay') {
            onClose();
        }
    };

    return (
        <div className="card-detail-overlay" onClick={handleOverlayClick}>
            <div className="card-detail-modal">
                <div className="card-detail-header">
                    <div className="card-header-main">
                        <h2>{card.name}</h2>
                        {card.is_token && <span className="token-badge">TOKEN</span>}
                    </div>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="card-detail-content">
                    <div className="card-detail-info">
                        <div className="info-row">
                            <span className="info-label">カードタイプ:</span>
                            <span className="info-value">{card.card_type}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">必要規模:</span>
                            <span className="info-value">{card.required_scale}</span>
                        </div>
                        {card.card_type === '財' && (
                            <div className="info-row">
                                <span className="info-label">耐久値:</span>
                                <span className="info-value">{card.durability}</span>
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default CardDetail;
