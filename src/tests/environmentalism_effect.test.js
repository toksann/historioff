
const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('環境主義 (Environmentalism) Card Effect', () => {
    const cardDefinitions = {
        "環境主義": {
            name: "環境主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 30,
            description: "自分の規模が増えなくなるが、自分の場の財が受けるダメージ-2。ターン開始時、場の財が3以上あれば自分の意識+3。",
            triggers: {
                [TriggerType.MODIFY_SCALE_INCREASE_RESERVE_OWNER]: [
                    {
                        effect_type: EffectType.ADD_MODIFY_PARAMETER_CORRECTION,
                        args: {
                            player_id: "self",
                            correct_target: "scale",
                            correct_direction: "increase",
                            correct_type: "limit",
                            amount: 0
                        }
                    }
                ],
                [EffectType.MODIFY_CARD_DURABILITY_RESERVE]: [
                    {
                        effect_type: EffectType.ADD_MODIFY_PARAMETER_CORRECTION,
                        args: {
                            player_id: "self",
                            correct_target: "wealth",
                            correct_direction: "decrease",
                            correct_type: "attenuation",
                            amount: 2
                        }
                    }
                ],
                [TriggerType.END_TURN_OWNER]: [
                    {
                        effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
                        args: {
                            player_id: "self",
                            amount: 3,
                            "condition_field_wealth_count_ge_3": true
                        }
                    }
                ]
            }
        },
        "WealthCard": { name: 'WealthCard', card_type: CardType.WEALTH, durability: 10 },
    };

    // Test 1: Scale Increase Prevention
    test('should prevent scale from increasing', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        
        p1.scale = 50;
        const environmentalismCard = createCardInstance(cardDefinitions['環境主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = environmentalismCard;
        gameState.all_card_instances[environmentalismCard.instance_id] = environmentalismCard;

        gameState.effect_queue.push([
            {
                effect_type: EffectType.MODIFY_SCALE_RESERVE,
                args: { player_id: PlayerId.PLAYER1, amount: 10 }
            },
            environmentalismCard
        ]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 50, "P1 scale should not increase");
    });

    // Test 2: Damage Reduction
    test('should reduce damage to wealth cards by 2', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const environmentalismCard = createCardInstance(cardDefinitions['環境主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = environmentalismCard;
        gameState.all_card_instances[environmentalismCard.instance_id] = environmentalismCard;

        const wealthCard = createCardInstance(cardDefinitions['WealthCard'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(wealthCard);
        gameState.all_card_instances[wealthCard.instance_id] = wealthCard;

        gameState.effect_queue.push([
            {
                effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE,
                args: { card_id: wealthCard.instance_id, amount: -5 }
            },
            environmentalismCard
        ]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }
        
        const finalWealthCard = finalState.all_card_instances[wealthCard.instance_id];
        assert.strictEqual(finalWealthCard.current_durability, 7, "WealthCard durability should be 10 - (5 - 2) = 7");
    });

    // Test 3: Consciousness Increase at Turn End
    describe('End of Turn Consciousness Gain', () => {
        test('should increase consciousness by 3 if wealth count is 3 or more', () => {
            let gameState = createTestGameState(cardDefinitions);
            let p1 = gameState.players[PlayerId.PLAYER1];

            p1.consciousness = 100;
            const environmentalismCard = createCardInstance(cardDefinitions['環境主義'], PlayerId.PLAYER1, { location: Location.FIELD });
            p1.ideology = environmentalismCard;
            gameState.all_card_instances[environmentalismCard.instance_id] = environmentalismCard;

            for (let i = 0; i < 3; i++) {
                const wealthCard = createCardInstance(cardDefinitions['WealthCard'], PlayerId.PLAYER1, { location: Location.FIELD });
                p1.field.push(wealthCard);
                gameState.all_card_instances[wealthCard.instance_id] = wealthCard;
            }

            gameState.effect_queue.push([
                {
                    effect_type: TriggerType.END_TURN_OWNER,
                    args: { player_id: PlayerId.PLAYER1 }
                },
                environmentalismCard
            ]);

            let finalState = processEffects(gameState);
            while (finalState.effect_queue.length > 0) {
                finalState = processEffects(finalState);
            }

            const finalP1 = finalState.players[PlayerId.PLAYER1];
            assert.strictEqual(finalP1.consciousness, 103, "P1 consciousness should increase by 3");
        });

        test('should not increase consciousness if wealth count is less than 3', () => {
            let gameState = createTestGameState(cardDefinitions);
            let p1 = gameState.players[PlayerId.PLAYER1];

            p1.consciousness = 100;
            const environmentalismCard = createCardInstance(cardDefinitions['環境主義'], PlayerId.PLAYER1, { location: Location.FIELD });
            p1.ideology = environmentalismCard;
            gameState.all_card_instances[environmentalismCard.instance_id] = environmentalismCard;

            for (let i = 0; i < 2; i++) {
                const wealthCard = createCardInstance(cardDefinitions['WealthCard'], PlayerId.PLAYER1, { location: Location.FIELD });
                p1.field.push(wealthCard);
                gameState.all_card_instances[wealthCard.instance_id] = wealthCard;
            }

            gameState.effect_queue.push([
                {
                    effect_type: TriggerType.END_TURN_OWNER,
                    args: { player_id: PlayerId.PLAYER1 }
                },
                environmentalismCard
            ]);

            let finalState = processEffects(gameState);
             while (finalState.effect_queue.length > 0) {
                finalState = processEffects(finalState);
            }

            const finalP1 = finalState.players[PlayerId.PLAYER1];
            assert.strictEqual(finalP1.consciousness, 100, "P1 consciousness should not change");
        });
    });
});
