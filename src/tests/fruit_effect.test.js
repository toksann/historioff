const assert = require('assert');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');
const { PlayerId, EffectType, Location } = require('../gameLogic/constants');

describe('果実 (Fruit) Card Effect', () => {
    test('should increase scale for both players when its durability becomes zero', () => {
        // 1. Setup
        const cardDefinitions = {
            "果実": {
                "name": "果実",
                "card_type": "財",
                "required_scale": 0,
                "durability": 1,
                "description": "このカードの耐久値が0になったとき互いの規模+1。",
                "triggers": {
                    "WEALTH_DURABILITY_ZERO_THIS": [
                        {
                            "effect_type": "MODIFY_SCALE_RESERVE",
                            "args": {
                                "player_id": "self",
                                "amount": 1
                            }
                        },
                        {
                            "effect_type": "MODIFY_SCALE_RESERVE",
                            "args": {
                                "player_id": "opponent",
                                "amount": 1
                            }
                        }
                    ]
                }
            },
            "攻撃カード": { "name": "攻撃カード", "card_type": "事象" },
        };

        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        const fruitCard = createCardInstance(cardDefinitions['果実'], PlayerId.PLAYER1, { instance_id: 'p1-fruit-1', location: Location.FIELD, current_durability: 1 });
        const attackerCard = createCardInstance(cardDefinitions['攻撃カード'], PlayerId.PLAYER2, { instance_id: 'p2-attacker-1' });

        p1.field.push(fruitCard);
        gameState.all_card_instances[fruitCard.instance_id] = fruitCard;
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        const initialScaleP1 = p1.scale;
        const initialScaleP2 = p2.scale;

        // 2. Execution
        // Simulate dealing 1 damage to the Fruit card to make its durability zero
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: fruitCard.instance_id,
                amount: -1,
                source_card_id: attackerCard.instance_id
            }
        };

        gameState.effect_queue.push([damageEffect, attackerCard]);
        let nextState = processAllEffects(gameState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const p2Final = nextState.players[PlayerId.PLAYER2];

        // Verify the card is moved to the discard pile
        const fruitInDiscard = p1Final.discard.find(c => c.instance_id === fruitCard.instance_id);
        assert.ok(fruitInDiscard, 'Fruit card should be in the discard pile');
        assert.strictEqual(p1Final.field.length, 0, 'Player 1 field should be empty');


        // Verify scale for both players increased by 1
        assert.strictEqual(p1Final.scale, initialScaleP1 + 1, "Player 1's scale should increase by 1");
        assert.strictEqual(p2Final.scale, initialScaleP2 + 1, "Player 2's scale should increase by 1");
    });
});