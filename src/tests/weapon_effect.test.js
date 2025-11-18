const assert = require('assert');
const { endTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('兵器 (Weapon) Card Effect', () => {
    const cardDefinitions = {
        "兵器": {
            "name": "兵器",
            "card_type": "財",
            "required_scale": 30,
            "durability": 4,
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "MODIFY_CARD_DURABILITY_RESERVE", "args": { "card_id": "left_opponent", "amount_based_on_self_durability": "minus" } }
                ],
                "FAILED_PROCESS": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount_based_on_self_durability": "minus" } }
                ]
            }
        },
        "商人": { "name": "商人", "card_type": "財", "durability": 5 } // Give it enough durability to survive
    };

    let gameState, p1, p2, weaponCard;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        gameState.current_turn = PlayerId.PLAYER1;

        weaponCard = createCardInstance(cardDefinitions['兵器'], p1.id, { location: Location.FIELD, current_durability: 4 });
        p1.field.push(weaponCard);
        gameState.all_card_instances[weaponCard.instance_id] = weaponCard;
    });

    test('should damage opponent\'s leftmost wealth if they have one', () => {
        // 1. Setup
        const merchantCard = createCardInstance(cardDefinitions['商人'], p2.id, { location: Location.FIELD, current_durability: 5 });
        p2.field.push(merchantCard);
        gameState.all_card_instances[merchantCard.instance_id] = merchantCard;
        const initialMerchantDurability = merchantCard.current_durability;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalMerchantCard = newState.all_card_instances[merchantCard.instance_id];
        assert.strictEqual(finalMerchantCard.current_durability, initialMerchantDurability - weaponCard.current_durability, 'Opponent wealth should take damage equal to Weapon durability');
    });

    test('should damage opponent\'s consciousness if they have no wealth', () => {
        // 1. Setup
        p2.field = []; // Ensure opponent field is empty
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP2.consciousness, initialP2Consciousness - weaponCard.current_durability, 'Opponent consciousness should be damaged by Weapon durability');
    });
});
