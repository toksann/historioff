const assert = require('assert');
const { startTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('理想主義 (Idealism) Card Effect', () => {
    const cardDefinitions = {
        "理想主義": {
            "name": "理想主義",
            "card_type": "イデオロギー",
            "required_scale": 0,
            "triggers": {
                "START_TURN_OWNER": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -2, "condition_opponent_consciousness_higher": true } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 3, "condition_opponent_consciousness_higher": false } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "opponent", "amount": 3, "condition_opponent_consciousness_higher": false } }
                ]
            }
        }
    };

    let gameState, p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        gameState.current_turn = PlayerId.PLAYER1;

        const idealismCard = createCardInstance(cardDefinitions['理想主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = idealismCard;
        gameState.all_card_instances[idealismCard.instance_id] = idealismCard;
    });

    test('should decrease opponent consciousness if it is higher at start of turn', () => {
        p1.consciousness = 50;
        p2.consciousness = 55;
        const initialP2Consciousness = p2.consciousness;
        const initialP1Scale = p1.scale;

        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP2.consciousness, initialP2Consciousness - 2, 'Opponent consciousness should decrease by 2');
        assert.strictEqual(newState.players[PlayerId.PLAYER1].scale, initialP1Scale, 'Scales should not change');
    });

    test('should increase both scales if opponent consciousness is not higher at start of turn', () => {
        p1.consciousness = 50;
        p2.consciousness = 50; // Equal, so not higher
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;
        const initialP1Consciousness = p1.consciousness;

        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP1.scale, initialP1Scale + 3, 'Own scale should increase by 3');
        assert.strictEqual(finalP2.scale, initialP2Scale + 3, 'Opponent scale should increase by 3');
        assert.strictEqual(finalP1.consciousness, initialP1Consciousness, 'Consciousness should not change');
    });
});
