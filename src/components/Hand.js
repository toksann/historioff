import React from 'react';
import Card from './Card.js';
import '../App.css';

const Hand = ({ player, onPlayCard, onProvideInput, awaiting_input, onCardClick }) => {
    if (!player) return <div className="hand">Loading hand...</div>;

    const isAwaitingChoice = awaiting_input && awaiting_input.type === 'CHOOSE_CARD_FOR_EFFECT';
    const isAwaitingCardOperation = awaiting_input && awaiting_input.type === 'CHOICE_CARDS_FOR_OPERATION';

    const handleClick = (card) => {
        if (onCardClick) {
            // Game.jsのhandleCardClickに処理を委譲
            onCardClick(card);
        } else {
            // フォールバック処理
            if (isAwaitingChoice && awaiting_input.valid_target_ids.includes(card.instance_id)) {
                onProvideInput(card);
            } else if (isAwaitingCardOperation && awaiting_input.options.some(option => option.instance_id === card.instance_id)) {
                onProvideInput([card]);
            } else {
                // 選択待ち状態でも通常時でもカードの詳細表示は許可
                // ただし、プレイ処理は選択待ち状態では無効
                if (!isAwaitingChoice && !isAwaitingCardOperation) {
                    onPlayCard(card);
                }
                // 選択待ち状態でも詳細表示のためのクリックは有効にする
                // （実際の詳細表示処理はGame.jsで行われる）
            }
        }
    };

    return (
        <div className="hand">
            <h4>{player.name}'s Hand ({player.hand.length}枚)</h4>
            <div className="hand-cards-scrollable">
                {player.hand.map(card => {
                    const isSelectable = (isAwaitingChoice && awaiting_input.valid_target_ids.includes(card.instance_id)) ||
                                       (isAwaitingCardOperation && awaiting_input.options.some(option => option.instance_id === card.instance_id));
                    return (
                        <div key={card.instance_id} className="hand-card-slot" onClick={() => handleClick(card)}>
                            <Card card={card} mode="game" isSelectable={isSelectable} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Hand;
