const assert = require('assert');
const { startTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('終末 (Apocalypse) Card Effect', () => {
    const cardDefinitions = {
        "終末": {
            "name": "終末",
            "card_type": "事象",
            "is_token": true,
            "triggers": {
                "CARD_DRAWN_THIS": [{ "effect_type": "MOVE_CARD", "args": { "card_id": "self", "source_pile": "hand", "destination_pile": "discard", "player_id": "self" } }],
                "CARD_DISCARDED_THIS": [
                    { "effect_type": "PROCESS_SET_ALL_SCALE_TO_ZERO_AND_REDUCE_CONSCIOUSNESS", "args": { "player_ids": "self_and_opponent" } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount_based_on_hand_count": true } }
                ]
            }
        },
        "果実": { "name": "果実", "card_type": "財" }
    };

    test('should trigger effects immediately when drawn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        gameState.current_turn = PlayerId.PLAYER1;

        const apocalypseCard = createCardInstance(cardDefinitions['終末'], p1.id);
        p1.deck.unshift(apocalypseCard); // Place Apocalypse on top of the deck
        gameState.all_card_instances[apocalypseCard.instance_id] = apocalypseCard;

        p1.scale = 10;
        p2.scale = 20;
        const fruitCard = createCardInstance(cardDefinitions['果実'], p1.id);
        p1.hand = [fruitCard]; // 1 card in hand before drawing
        gameState.all_card_instances[fruitCard.instance_id] = fruitCard;

        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;
        const scaleLostP1 = p1.scale;
        const scaleLostP2 = p2.scale;
        const p1HandCount = p1.hand.length;

        // 2. Execution
        // startTurn will draw Apocalypse, which should immediately trigger its effects.
        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];

        const apocalypseInDiscard = finalP1.discard.find(c => c.name === '終末');
        assert.ok(apocalypseInDiscard, 'Apocalypse should be in the discard pile');

        assert.strictEqual(finalP1.scale, 0, 'Player 1 scale should be 0');
        assert.strictEqual(finalP2.scale, 0, 'Player 2 scale should be 0');

        // P1 Consciousness: Initial - Scale Lost + Hand Count
        const expectedP1Consciousness = initialP1Consciousness - scaleLostP1 + p1HandCount;
        assert.strictEqual(finalP1.consciousness, expectedP1Consciousness, `Player 1 consciousness should be ${expectedP1Consciousness}`)

        // P2 Consciousness: Initial - Scale Lost
        const expectedP2Consciousness = initialP2Consciousness - scaleLostP2;
        assert.strictEqual(finalP2.consciousness, expectedP2Consciousness, `Player 2 consciousness should be ${expectedP2Consciousness}`)
    });
});
