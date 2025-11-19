import { useState, useEffect } from 'react';
import { produce } from 'immer';

const usePresentedCards = (fieldCards, ideologyCard) => {
    const [presentedCards, setPresentedCards] = useState([]);

    useEffect(() => {
        const incomingCards = [...(fieldCards || []), ...(ideologyCard ? [ideologyCard] : [])];
        const incomingCardIds = new Set(incomingCards.map(c => c.instance_id));

        setPresentedCards(currentPresented => {
            const nextState = produce([], draft => {
                const currentMap = new Map(currentPresented.map(c => [c.instance_id, c]));
                
                // Add all incoming cards in their new order
                for (const incomingCard of incomingCards) {
                    const existingCard = currentMap.get(incomingCard.instance_id);
                    if (existingCard) {
                        // Preserve animation state if it exists, otherwise use incoming data
                        draft.push({ ...incomingCard, animation: existingCard.animation });
                    } else {
                        // It's a new card
                        draft.push(incomingCard);
                    }
                }

                // Find cards that are in current state but not in incoming, and are not already animating.
                // These need to be flagged for destruction and kept for their animation.
                for (const currentCard of currentPresented) {
                    if (!incomingCardIds.has(currentCard.instance_id) && !currentCard.animation) {
                        draft.push({ ...currentCard, animation: 'destroying' });
                    }
                }
            });
            return nextState;
        });
    }, [fieldCards, ideologyCard]);

    const handleAnimationEnd = (cardId) => {
        // Filter out the card that has finished its animation
        setPresentedCards(current => current.filter(c => c.instance_id !== cardId));
    };

    return { presentedCards, handleAnimationEnd };
};

export default usePresentedCards;
