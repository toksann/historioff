const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard, endTurn } = require('../gameLogic/main.js');

describe('ウルトラナショナリズム (Ultranationalism) Card Effect', () => {
    const cardDefinitions = {
        "ウルトラナショナリズム": {
            name: "ウルトラナショナリズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 20,
            triggers: {
                [TriggerType.CARD_PLACED_THIS]: [
                    { effect_type: "MODIFY_CONSCIOUSNESS_RESERVE", args: { player_id: "self", amount: 5 } }
                ],
                [TriggerType.PLAYER_PLAY_CARD_ACTION]: [
                    { effect_type: "MODIFY_CONSCIOUSNESS_RESERVE", args: { player_id: "self", amount: 3 } },
                    { effect_type: "MODIFY_SCALE_RESERVE", args: { player_id: "self", amount: 3 } },
                    { effect_type: "MOVE_CARD", args: { card_id: "draw_from_deck", source_pile: "deck", destination_pile: "hand", player_id: "self" } }
                ],
                [TriggerType.END_TURN_OWNER]: [
                    {
                        effect_type: "PROCESS_CARD_OPERATION",
                        args: {
                            player_id: "self",
                            operation: "move",
                            source_pile: "discard",
                            destination_pile: "deck",
                            selection_method: "random",
                            count: 1
                        }
                    }
                ]
            }
        },
        "TestCard": { name: 'TestCard', required_scale: 1, card_type: CardType.EVENT },
        "CardToDraw": { name: 'CardToDraw', card_type: CardType.EVENT },
        "DiscardCard": { name: 'DiscardCard', card_type: CardType.EVENT },
    };

    test('Placement effect: should increase self consciousness by 5', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        p1.scale = 20; // Required scale
        const cardToPlay = createCardInstance(cardDefinitions['ウルトラナショナリズム'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, 55, "P1 consciousness should be 50 + 5");
    });

    test('Card play effect: should increase consciousness, scale, and draw a card', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        // Set Ultranationalism as the ideology
        const ideologyCard = createCardInstance(cardDefinitions['ウルトラナショナリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = ideologyCard;
        gameState.all_card_instances[ideologyCard.instance_id] = ideologyCard;

        p1.consciousness = 50;
        p1.scale = 10;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw'], PlayerId.PLAYER1));
        const cardToPlay = createCardInstance(cardDefinitions['TestCard'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);
        const initialHandSize = p1.hand.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 53, "P1 consciousness should be 50 + 3");
        assert.strictEqual(finalP1.scale, 13, "P1 scale should be 10 + 3");
        assert.strictEqual(finalP1.hand.length, initialHandSize, "Hand size should be the same after playing 1 and drawing 1");
        assert(finalP1.hand.some(c => c.name === 'CardToDraw'), "Player should have drawn the card");
    });

    test('End of turn effect: should move one card from discard to deck', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;
        // Set Ultranationalism as the ideology
        const ideologyCard = createCardInstance(cardDefinitions['ウルトラナショナリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = ideologyCard;
        gameState.all_card_instances[ideologyCard.instance_id] = ideologyCard;

        const discardCard = createCardInstance(cardDefinitions['DiscardCard'], PlayerId.PLAYER1, { location: Location.DISCARD });
        p1.discard.push(discardCard);
        const initialDeckSize = p1.deck.length;

        let nextState = endTurn(gameState);
        // The endTurn function itself processes effects, so we might not need the loop, but keep it for safety.
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.discard.length, 0, "Discard pile should be empty");
        assert.strictEqual(finalP1.deck.length, initialDeckSize + 1, "Deck size should increase by 1");
        assert(finalP1.deck.some(c => c.name === 'DiscardCard'), "Card from discard should be in the deck");
    });
});
