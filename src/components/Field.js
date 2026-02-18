import React from 'react';
import Card from './Card.js';
import '../App.css';

const Field = ({ playerName, cards, fieldLimit, onProvideInput, awaiting_input, onCardClick, onAnimationEnd }) => {
    if (!playerName) return <div className="field">Loading field...</div>;

    const isChoiceForEffect = awaiting_input?.type === 'CHOICE_CARD_FOR_EFFECT';
    const selectableCardIds = isChoiceForEffect 
        ? new Set(awaiting_input.options.map(c => c.instance_id)) 
        : new Set();

    const handleCardClick = (card) => {
        if (onCardClick) {
            onCardClick(card);
        } else if (selectableCardIds.has(card.instance_id)) {
            onProvideInput(card);
        }
    };

    // Derive all card types from the single 'cards' prop
    const allPresentedCards = cards || [];
    
    // Active ideology is one that is NOT animating out
    const activeIdeology = allPresentedCards.find(c => c.card_type === 'イデオロギー' && !c.animation);
    
    // Animating cards include any card flagged for destruction
    const animatingIdeology = allPresentedCards.find(c => c.card_type === 'イデオロギー' && c.animation === 'destroying');

    // Wealth cards include both active and animating ones to ensure they are rendered during animation
    const wealthCards = allPresentedCards.filter(card => card.card_type === '財');
    const activeWealthCardsCount = wealthCards.filter(c => !c.animation).length;

    return (
        <div className="field">
            <h4>{playerName}の場</h4>
            
            <div className="field-area">
                <div className="field-label">
                    <span className="ideology-indicator">イデオロギー</span>
                    <span className="wealth-indicator">
                        財カード ({activeWealthCardsCount}/{fieldLimit})
                        <span className="placement-order-hint">← 古い順</span>
                    </span>
                </div>
                
                <div className="field-cards-container">
                    {/* Ideology slot now handles rendering both active and animating-out ideologies */}
                    <div className="ideology-slot">
                        {activeIdeology && (
                            <Card 
                                card={activeIdeology} 
                                mode="game"
                                isSelectable={selectableCardIds.has(activeIdeology.instance_id)}
                                onClick={() => handleCardClick(activeIdeology)}
                                onAnimationEnd={onAnimationEnd}
                            />
                        )}
                        {animatingIdeology && (
                             <Card 
                                card={animatingIdeology} 
                                mode="game"
                                isSelectable={false} // Cannot interact with a card that is being destroyed
                                onClick={() => {}}
                                onAnimationEnd={onAnimationEnd}
                            />
                        )}
                        {!activeIdeology && !animatingIdeology && (
                            <div className="empty-ideology-slot">
                                <span>イデオロギー</span>
                            </div>
                        )}
                    </div>

                    {/* Wealth card slots */}
                    <div className="wealth-cards-scrollable">
                        {wealthCards.map(card => (
                            <div key={card.instance_id} className="wealth-card-slot">
                                <Card 
                                    card={card} 
                                    mode="game"
                                    isSelectable={selectableCardIds.has(card.instance_id)}
                                    onClick={() => handleCardClick(card)}
                                    onAnimationEnd={onAnimationEnd}
                                />
                            </div>
                        ))}
                        {/* Render empty slots to fill up to the field limit */}
                        {Array.from({ length: Math.max(0, fieldLimit - wealthCards.length) }).map((_, index) => (
                            <div key={`empty-${index}`} className="wealth-card-slot">
                                <div className="empty-wealth-slot">
                                    <span className="slot-number">{wealthCards.length + index + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Field;
