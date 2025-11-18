const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId, Location, EffectType } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('砦 (Fortress) Card Effect', () => {
    const cardDefinitions = {
        "砦": {
            "name": "砦",
            "card_type": "財",
            "required_scale": 15,
            "durability": 5,
            "description": "相手の意識-4。反撃1。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "opponent", "amount": -4 }
                    }
                ],
                "DAMAGE_THIS": [
                    {
                        "effect_type": "PROCESS_COUNTER_ATTACK",
                        "args": {
                            "player_id": "self",
                            "card_id": "self",
                            "counter_damage": 1
                        }
                    }
                ]
            }
        },
        "攻撃用の財": {
            "name": "攻撃用の財",
            "card_type": "財",
            "required_scale": 0,
            "durability": 3,
        }
    };

    test('should reduce opponent consciousness by 4 when placed', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const fortressCard = createCardInstance(cardDefinitions['砦'], p1.id);
        p1.hand.push(fortressCard);
        gameState.all_card_instances[fortressCard.instance_id] = fortressCard;
        p1.scale = 15; // Meet required scale
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, fortressCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP2 = newState.players[PlayerId.PLAYER2];
        const fortressOnField = newState.players[PlayerId.PLAYER1].field.find(c => c.instance_id === fortressCard.instance_id);
        assert.ok(fortressOnField, 'Fortress should be on the field');
        assert.strictEqual(finalP2.consciousness, initialP2Consciousness - 4, 'Player 2 consciousness should be reduced by 4');
    });

    test('should counter-attack for 1 damage when it takes damage', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        const fortressCard = createCardInstance(cardDefinitions['砦'], p1.id, { location: Location.FIELD, current_durability: 5 });
        p1.field.push(fortressCard);
        gameState.all_card_instances[fortressCard.instance_id] = fortressCard;

        const attackerCard = createCardInstance(cardDefinitions['攻撃用の財'], p2.id, { location: Location.FIELD, current_durability: 3 });
        p2.field.push(attackerCard);
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        const initialFortressDurability = fortressCard.current_durability;
        const initialAttackerDurability = attackerCard.current_durability;

        // 2. Execution: Directly simulate the attacker dealing 2 damage to the fortress
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: fortressCard.instance_id,
                amount: -2,
                source_card_id: attackerCard.instance_id // Source is important for counter-attack
            }
        };
        gameState.effect_queue.push([damageEffect, attackerCard]);
        let newState = processEffects(gameState);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalFortress = newState.all_card_instances[fortressCard.instance_id];
        const finalAttacker = newState.all_card_instances[attackerCard.instance_id];

        assert.strictEqual(finalFortress.current_durability, initialFortressDurability - 2, 'Fortress should take 2 damage');
        assert.strictEqual(finalAttacker.current_durability, initialAttackerDurability - 1, 'Attacker should take 1 counter-attack damage');
    });
});
