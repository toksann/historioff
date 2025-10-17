import React from 'react';
import Card from './Card.js';
import '../App.css';

const Hand = ({ player, onPlayCard, onProvideInput, awaiting_input, onCardClick }) => {
    if (!player) return <div className="hand">Loading hand...</div>;

    const isAwaitingChoice = awaiting_input && awaiting_input.type === 'CHOOSE_CARD_FOR_EFFECT';

    const handleClick = (card) => {
        if (onCardClick) {
            onCardClick(card);
        } else {
            // フォールバック処理
            if (isAwaitingChoice && awaiting_input.valid_target_ids.includes(card.instance_id)) {
                onProvideInput(card);
            } else if (!isAwaitingChoice) {
                onPlayCard(card);
            }
        }
    };

    return (
        <div className="hand">
            <h4>{player.name}'s Hand</h4>
            <div className="cards-container">
                {player.hand.map(card => {
                    const isSelectable = isAwaitingChoice && awaiting_input.valid_target_ids.includes(card.instance_id);
                    return (
                        <div key={card.instance_id} onClick={() => handleClick(card)}>
                            <Card card={card} isSelectable={isSelectable} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Hand;
