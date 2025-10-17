const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard } = require('../gameLogic/main.js');

describe('Education and Culture Card Effects', () => {
    const cardDefinitions = {
        "愛国教育": {
            name: "愛国教育",
            card_type: CardType.EVENT,
            required_scale: 0,
            triggers: {
                PLAY_EVENT_THIS: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: 1 }
                    }
                ]
            }
        },
        "嫌国教育": {
            name: "嫌国教育",
            card_type: CardType.EVENT,
            required_scale: 0,
            triggers: {
                PLAY_EVENT_THIS: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "opponent", amount: -1 }
                    }
                ]
            }
        },
        "文化的影響": {
            name: "文化的影響",
            card_type: CardType.EVENT,
            required_scale: 0,
            triggers: {
                PLAY_EVENT_THIS: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: -1 }
                    },
                    {
                        effect_type: "MOVE_CARD",
                        args: { card_id: "draw_from_deck", source_pile: "deck", destination_pile: "hand", player_id: "self" }
                    }
                ]
            }
        },
        "文化侵略": {
            name: "文化侵略",
            card_type: CardType.EVENT,
            required_scale: 15,
            triggers: {
                PLAY_EVENT_THIS: [
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: { player_id: "self", amount: -3 }
                    },
                    {
                        effect_type: "ADD_CARD_TO_GAME",
                        args: { player_id: "opponent", card_template_name: "文化的影響", destination_pile: "deck", count: 3 }
                    }
                ]
            }
        },
        "CardToDraw": { name: 'CardToDraw', card_type: CardType.EVENT },
    };

    test('愛国教育 (Patriotic Education) should increase self consciousness by 1', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        const cardToPlay = createCardInstance(cardDefinitions['愛国教育'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, 51, "P1 consciousness should be 50 + 1");
    });

    test('嫌国教育 (Anti-Patriotic Education) should decrease opponent consciousness by 1', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p2.consciousness = 50;
        const cardToPlay = createCardInstance(cardDefinitions['嫌国教育'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, 49, "P2 consciousness should be 50 - 1");
    });

    test('文化的影響 (Cultural Influence) should decrease self consciousness by 1 and draw a card', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw'], PlayerId.PLAYER1));
        const cardToPlay = createCardInstance(cardDefinitions['文化的影響'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);
        const initialHandSize = p1.hand.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 49, "P1 consciousness should be 50 - 1");
        assert.strictEqual(finalP1.hand.length, initialHandSize, "Hand size should be same after playing 1 and drawing 1");
        assert(finalP1.hand.some(c => c.name === 'CardToDraw'), "Player should have drawn the card");
    });

    test('文化侵略 (Cultural Invasion) should decrease self scale by 3 and add 3 cards to opponent deck', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 15;
        const initialOpponentDeckSize = p2.deck.length;
        const cardToPlay = createCardInstance(cardDefinitions['文化侵略'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP1.scale, 12, "P1 scale should be 15 - 3");
        assert.strictEqual(finalP2.deck.length, initialOpponentDeckSize + 3, "Opponent deck size should increase by 3");
        const addedCards = finalP2.deck.filter(c => c.name === '文化的影響');
        assert.strictEqual(addedCards.length, 3, "There should be 3 Cultural Influence cards in opponent deck");
    });
});
