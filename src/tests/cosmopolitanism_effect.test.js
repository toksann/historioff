const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location, TriggerType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('コスモポリタニズム (Cosmopolitanism) Card Effect', () => {
    const cardDefinitions = {
        "コスモポリタニズム": {
            "name": "コスモポリタニズム",
            "card_type": "イデオロギー",
            "required_scale": 40,
            "description": "ターン終了時、相手の規模が自分の規模を上回っているなら、相手の規模-3。ターン開始時、互いの意識-3。",
            "triggers": {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": {
                            "player_id": "opponent",
                            "amount": -3,
                            "condition_opponent_scale_higher": true
                        }
                    }
                ],
                "START_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": -3
                        }
                    },
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "opponent",
                            "amount": -3
                        }
                    }
                ]
            }
        },
    };

    let gameState;
    let p1, p2;
    let cosmopolitanismCard;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];

        // Place Cosmopolitanism as Player 1's ideology
        cosmopolitanismCard = createCardInstance(cardDefinitions['コスモポリタニズム'], PlayerId.PLAYER1);
        p1.ideology = cosmopolitanismCard;
        cosmopolitanismCard.location = Location.FIELD;
        gameState.all_card_instances[cosmopolitanismCard.instance_id] = cosmopolitanismCard;
    });

    test('should decrease opponent scale if it is higher at end of turn', () => {
        // 1. Setup
        p1.scale = 10;
        p2.scale = 15; // Opponent's scale is higher
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;

        // 2. Execution
        const endTurnEffect = { effect_type: TriggerType.END_TURN_OWNER, args: { player_id: p1.id } };
        gameState.effect_queue.push([endTurnEffect, cosmopolitanismCard]);
        let finalState = processEffects(gameState);

        // 3. Verification
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].scale, initialP1Scale, "P1's scale should not change");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].scale, initialP2Scale - 3, "P2's scale should decrease by 3");
    });

    test('should NOT decrease opponent scale if it is not higher at end of turn', () => {
        // 1. Setup
        p1.scale = 15;
        p2.scale = 10; // Opponent's scale is lower
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;

        // 2. Execution
        const endTurnEffect = { effect_type: TriggerType.END_TURN_OWNER, args: { player_id: p1.id } };
        gameState.effect_queue.push([endTurnEffect, cosmopolitanismCard]);
        let finalState = processEffects(gameState);

        // 3. Verification
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].scale, initialP1Scale, "P1's scale should not change");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].scale, initialP2Scale, "P2's scale should not change");
    });

    test('should decrease consciousness of both players at start of turn', () => {
        // 1. Setup
        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution
        const startTurnEffect = { effect_type: TriggerType.START_TURN_OWNER, args: { player_id: p1.id } };
        gameState.effect_queue.push([startTurnEffect, cosmopolitanismCard]);
        let finalState = processEffects(gameState);

        // 3. Verification
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness - 3, "P1's consciousness should decrease by 3");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, initialP2Consciousness - 3, "P2's consciousness should decrease by 3");
    });
});
