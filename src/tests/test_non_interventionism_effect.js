const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('不干渉主義 (Non-interventionism) Card Effect', () => {
    const cardDefinitions = {
        "不干渉主義": {
            name: "不干渉主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 40,
            description: "自分の規模が相手の規模を上回っているなら、互いが受ける意識の減少効果を0にする。",
            triggers: {
                MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER: [
                    {
                        effect_type: "ADD_MODIFY_PARAMETER_CORRECTION",
                        args: {
                            player_id: "self",
                            correct_target: "consciousness",
                            correct_direction: "decrease",
                            correct_type: "limit",
                            amount: 0,
                            condition_self_scale_higher: true
                        }
                    }
                ],
                MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT: [
                    {
                        effect_type: "ADD_MODIFY_PARAMETER_CORRECTION",
                        args: {
                            player_id: "opponent",
                            correct_target: "consciousness",
                            correct_direction: "decrease",
                            correct_type: "limit",
                            amount: 0,
                            condition_self_scale_higher: true
                        }
                    }
                ]
            }
        },
    };

    let gameState;
    let p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        // Place Non-interventionism for Player 1
        const nonInterventionismCard = createCardInstance(cardDefinitions['不干渉主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = nonInterventionismCard;
        gameState.all_card_instances[nonInterventionismCard.instance_id] = nonInterventionismCard;
    });

    test('should prevent consciousness decrease for self when own scale is higher', () => {
        // 1. Setup: P1 scale > P2 scale
        p1.scale = 50;
        p2.scale = 40;
        const initialP1Consciousness = p1.consciousness;

        // 2. Execution: Attempt to decrease P1's consciousness
        gameState.effect_queue.push([
            { 
                effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, 
                args: { player_id: PlayerId.PLAYER1, amount: -10 } 
            },
            null
        ]);
        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P1's consciousness should not change
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness, "P1's consciousness should be unchanged");
    });

    test('should prevent consciousness decrease for opponent when own scale is higher', () => {
        // 1. Setup: P1 scale > P2 scale
        p1.scale = 50;
        p2.scale = 40;
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution: Attempt to decrease P2's consciousness
        gameState.effect_queue.push([
            { 
                effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, 
                args: { player_id: PlayerId.PLAYER2, amount: -10 } 
            },
            null
        ]);
        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P2's consciousness should not change
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, initialP2Consciousness, "P2's consciousness should be unchanged");
    });

    test('should allow consciousness decrease for self when own scale is not higher', () => {
        // 1. Setup: P1 scale <= P2 scale
        p1.scale = 40;
        p2.scale = 50;
        const initialP1Consciousness = p1.consciousness;

        // 2. Execution: Attempt to decrease P1's consciousness
        gameState.effect_queue.push([
            { 
                effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, 
                args: { player_id: PlayerId.PLAYER1, amount: -10 } 
            },
            null
        ]);
        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P1's consciousness should decrease
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness - 10, "P1's consciousness should decrease by 10");
    });
});
