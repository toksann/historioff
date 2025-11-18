const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, INITIAL_FIELD_LIMIT } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('占領 (Occupation) Card Effect', () => {
    const cardDefinitions = {
        "占領": {
            "name": "占領",
            "card_type": "事象",
            "required_scale": 70,
            "triggers": {
                "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_FIELD_LIMIT", "args": { "player_id": "opponent", "amount": -1 } }],
                "SUCCESS_PROCESS": [{ "effect_type": "MODIFY_FIELD_LIMIT", "args": { "player_id": "self", "amount": 1 } }]
            }
        }
    };

    test('should decrease opponent limit and increase own limit if opponent limit can be reduced', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const occupationCard = createCardInstance(cardDefinitions['占領'], p1.id);
        p1.hand.push(occupationCard);
        gameState.all_card_instances[occupationCard.instance_id] = occupationCard;
        p1.scale = occupationCard.required_scale;

        p2.field_limit = 5; // Ensure it can be reduced
        const initialP1FieldLimit = p1.field_limit;
        const initialP2FieldLimit = p2.field_limit;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, occupationCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP1.field_limit, initialP1FieldLimit + 1, 'Own field limit should increase by 1');
        assert.strictEqual(finalP2.field_limit, initialP2FieldLimit - 1, 'Opponent field limit should decrease by 1');
    });

    test('should do nothing if opponent field limit is at its minimum', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const occupationCard = createCardInstance(cardDefinitions['占領'], p1.id);
        p1.hand.push(occupationCard);
        gameState.all_card_instances[occupationCard.instance_id] = occupationCard;
        p1.scale = occupationCard.required_scale;

        p2.field_limit = 0; // Set to minimum (as per user instruction)
        const initialP1FieldLimit = p1.field_limit;
        const initialP2FieldLimit = p2.field_limit;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, occupationCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP1.field_limit, initialP1FieldLimit, 'Own field limit should not change');
        assert.strictEqual(finalP2.field_limit, 0, 'Opponent field limit should become 0'); // Changed expectation
    });
});
