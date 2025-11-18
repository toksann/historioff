const assert = require('assert');
const { endTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('植民地 (Colony) Card Effect', () => {
    const cardDefinitions = {
        "植民地": {
            "name": "植民地",
            "card_type": "財",
            "required_scale": 50,
            "durability": 20,
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "MODIFY_CARD_DURABILITY_RESERVE", "args": { "card_id": "self", "amount": -1 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability": 1 } }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": "財" }
    };

    test('should lose 1 durability and add a Money card to hand at end of turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;

        const colonyCard = createCardInstance(cardDefinitions['植民地'], p1.id, { location: Location.FIELD, current_durability: 20 });
        p1.field.push(colonyCard);
        gameState.all_card_instances[colonyCard.instance_id] = colonyCard;

        const initialDurability = colonyCard.current_durability;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalColony = newState.all_card_instances[colonyCard.instance_id];
        const moneyInHand = finalP1.hand.find(c => c.name === 'マネー');

        assert.strictEqual(finalColony.current_durability, initialDurability - 1, 'Colony durability should decrease by 1');
        assert.strictEqual(finalP1.hand.length, initialHandCount + 1, 'Hand size should increase by 1');
        assert.ok(moneyInHand, 'A Money card should be added to the hand');
        assert.strictEqual(moneyInHand.current_durability, 1, 'The new Money card should have 1 durability');
    });
});
