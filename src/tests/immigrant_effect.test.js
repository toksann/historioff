const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('移民 (Immigrant) Card Effect', () => {
    const cardDefinitions = {
        "移民": {
            "name": "移民",
            "card_type": "事象",
            "required_scale": 0,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": -1 } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 1 } }
                ]
            }
        }
    };

    test('should decrease consciousness by 1 and increase scale by 1 on play', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const immigrantCard = createCardInstance(cardDefinitions['移民'], p1.id);
        p1.hand.push(immigrantCard);
        gameState.all_card_instances[immigrantCard.instance_id] = immigrantCard;

        const initialConsciousness = p1.consciousness;
        const initialScale = p1.scale;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, immigrantCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const immigrantInDiscard = finalP1.discard.find(c => c.instance_id === immigrantCard.instance_id);

        assert.strictEqual(finalP1.consciousness, initialConsciousness - 1, 'Consciousness should decrease by 1');
        assert.strictEqual(finalP1.scale, initialScale + 1, 'Scale should increase by 1');
        assert.ok(immigrantInDiscard, 'Immigrant card should be in the discard pile');
    });
});
