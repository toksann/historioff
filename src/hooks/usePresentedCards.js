import { useState, useEffect } from 'react';
import { produce } from 'immer';

const usePresentedCards = (fieldCards, ideologyCard) => {
    const [presentedCards, setPresentedCards] = useState([]);

    useEffect(() => {
        const incomingCards = [...(fieldCards || []), ...(ideologyCard ? [ideologyCard] : [])];
        const incomingCardsMap = new Map(incomingCards.map(c => [c.instance_id, c]));

        setPresentedCards(currentPresented => {
            const nextState = produce(currentPresented, draft => {
                const draftMap = new Map(draft.map(c => [c.instance_id, c]));

                // Update/Remove existing cards in draft
                draft.forEach(cardInDraft => {
                    const incoming = incomingCardsMap.get(cardInDraft.instance_id);
                    if (incoming) {
                        // Card still exists: update its data, but only if it's not animating out
                        if (!cardInDraft.animation) {
                            Object.assign(cardInDraft, incoming);
                        }
                    } else {
                        // Card is removed: flag for animation if not already flagged
                        if (!cardInDraft.animation) {
                           cardInDraft.animation = 'destroying';
                        }
                    }
                });

                // Add new incoming cards that are not in the draft yet
                incomingCards.forEach(card => {
                    if (!draftMap.has(card.instance_id)) {
                        draft.push(card);
                    }
                });
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
