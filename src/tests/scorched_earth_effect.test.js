const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('焦土 (Scorched Earth) Card Effect', () => {
    const cardDefinitions = {
        "焦土": {
            "name": "焦土",
            "card_type": "事象",
            "required_scale": 45,
            "triggers": {
                "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_FIELD_LIMIT", "args": { "player_id": "opponent", "amount": -1 } }]
            }
        }
    };

    test('should decrease opponent field limit by 1 on play', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const scorchedEarthCard = createCardInstance(cardDefinitions['焦土'], p1.id);
        p1.hand.push(scorchedEarthCard);
        gameState.all_card_instances[scorchedEarthCard.instance_id] = scorchedEarthCard;
        p1.scale = scorchedEarthCard.required_scale;
        const initialFieldLimitP2 = p2.field_limit;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, scorchedEarthCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP2.field_limit, initialFieldLimitP2 - 1, 'Opponent field limit should decrease by 1');
    });
});
