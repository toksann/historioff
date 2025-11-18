const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('開拓 (Pioneering) Card Effect', () => {
    const cardDefinitions = {
        "開拓": {
            "name": "開拓",
            "card_type": "事象",
            "required_scale": 30,
            "triggers": {
                "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_FIELD_LIMIT", "args": { "player_id": "self", "amount": 1 } }]
            }
        }
    };

    test('should increase own field limit by 1 on play', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const pioneeringCard = createCardInstance(cardDefinitions['開拓'], p1.id);
        p1.hand.push(pioneeringCard);
        gameState.all_card_instances[pioneeringCard.instance_id] = pioneeringCard;
        p1.scale = pioneeringCard.required_scale;
        const initialFieldLimit = p1.field_limit;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, pioneeringCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.field_limit, initialFieldLimit + 1, 'Field limit should increase by 1');
    });
});
