const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId, Location, EffectType } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('山 (Mountain) Card Effect', () => {
    const cardDefinitions = {
        "山": {
            "name": "山",
            "card_type": "財",
            "required_scale": 70,
            "durability": 30,
            "description": "配置時自分の意識+5し、このカードが一番左になるよう配置しなおす。自分の場にある「山」以外の財カードはダメージを受けなくなる。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": 5
                        }
                    }
                ]
            },
            // Note: The damage immunity is a passive effect handled by the engine, not a trigger.
        },
        "果実": {
            "name": "果実",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
        },
        "攻撃カード": { "name": "攻撃カード", "card_type": "事象" },
    };

    test('should increase consciousness by 5 when placed', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const mountainCard = createCardInstance(cardDefinitions['山'], p1.id);
        p1.hand.push(mountainCard);
        gameState.all_card_instances[mountainCard.instance_id] = mountainCard;
        p1.scale = 70; // Meet the required scale
        const initialConsciousness = p1.consciousness;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, mountainCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const mountainOnField = finalP1.field.find(c => c.instance_id === mountainCard.instance_id);
        assert.ok(mountainOnField, 'Mountain should be on the field');
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 5, 'Player 1 consciousness should increase by 5');
    });

    test('should prevent damage to other wealth cards on the same field', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const mountainCard = createCardInstance(cardDefinitions['山'], p1.id, { location: Location.FIELD });
        const fruitCard = createCardInstance(cardDefinitions['果実'], p1.id, { location: Location.FIELD, current_durability: 1 });
        const attackerCard = createCardInstance(cardDefinitions['攻撃カード'], PlayerId.PLAYER2);

        p1.field.push(mountainCard, fruitCard);
        gameState.all_card_instances[mountainCard.instance_id] = mountainCard;
        gameState.all_card_instances[fruitCard.instance_id] = fruitCard;
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        const initialFruitDurability = fruitCard.current_durability;

        // 2. Execution: Attack the fruit card
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: fruitCard.instance_id,
                amount: -1,
                source_card_id: attackerCard.instance_id
            }
        };
        gameState.effect_queue.push([damageEffect, attackerCard]);
        let newState = processEffects(gameState);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalFruit = newState.all_card_instances[fruitCard.instance_id];
        assert.strictEqual(finalFruit.current_durability, initialFruitDurability, 'Fruit card durability should not change due to Mountain\'s protection');
    });

    test('should NOT prevent damage to itself (the Mountain)', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const mountainCard = createCardInstance(cardDefinitions['山'], p1.id, { location: Location.FIELD, current_durability: 30 });
        const attackerCard = createCardInstance(cardDefinitions['攻撃カード'], PlayerId.PLAYER2);

        p1.field.push(mountainCard);
        gameState.all_card_instances[mountainCard.instance_id] = mountainCard;
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        const initialMountainDurability = mountainCard.current_durability;

        // 2. Execution: Attack the Mountain card itself
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: mountainCard.instance_id,
                amount: -5,
                source_card_id: attackerCard.instance_id
            }
        };
        gameState.effect_queue.push([damageEffect, attackerCard]);
        let newState = processEffects(gameState);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalMountain = newState.all_card_instances[mountainCard.instance_id];
        assert.strictEqual(finalMountain.current_durability, initialMountainDurability - 5, 'Mountain card itself should take damage');
    });
});
