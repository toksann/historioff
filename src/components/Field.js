import React from 'react';
import Card from './Card.js';
import '../App.css';

const Field = ({ player, onProvideInput, awaiting_input, onCardClick }) => {
    if (!player) return <div className="field">Loading field...</div>;

    const isChoiceForEffect = awaiting_input?.type === 'CHOICE_CARD_FOR_EFFECT';
    const selectableCardIds = isChoiceForEffect 
        ? new Set(awaiting_input.options.map(c => c.instance_id)) 
        : new Set();

    if (isChoiceForEffect) {
        console.log('[Field] Choice for effect active, selectable cards:', Array.from(selectableCardIds));
    }

    const handleCardClick = (card) => {
        if (onCardClick) {
            onCardClick(card);
        } else {
            // フォールバック処理
            if (selectableCardIds.has(card.instance_id)) {
                onProvideInput(card);
            }
        }
    };

    return (
        <div className="field">
            <h4>{player.name}'s Field</h4>
            <div className="cards-container">
                {player.field.map(card => (
                    <Card 
                        key={card.instance_id} 
                        card={card} 
                        isSelectable={selectableCardIds.has(card.instance_id)}
                        onClick={() => handleCardClick(card)}
                    />
                ))}
                {player.ideology && (
                    <div>
                        <h4>Ideology</h4>
                        <Card 
                            card={player.ideology} 
                            isSelectable={selectableCardIds.has(player.ideology.instance_id)}
                            onClick={() => handleCardClick(player.ideology)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Field;
