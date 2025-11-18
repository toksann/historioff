const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('崇拝 (Worship) Card Effect', () => {
    const cardDefinitions = {
        "崇拝": {
            "name": "崇拝",
            "card_type": "事象",
            "required_scale": 0,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": -2 } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 3 } },
                    { "effect_type": "PROCESS_ADD_CARD_CONDITIONAL", "args": { "player_id": "self", "condition_target": "consciousness", "threshold": 40, "card_template_name": "救世" } }
                ]
            }
        },
        "救世": { "name": "救世", "card_type": "事象" }
    };

    test('should not add Salvation if consciousness is < 40 after play', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10;
        p1.consciousness = 36; // Becomes 39, which is < 40
        const worshipCard = createCardInstance(cardDefinitions['崇拝'], p1.id);
        p1.hand.push(worshipCard);
        gameState.all_card_instances[worshipCard.instance_id] = worshipCard;
        const initialScale = p1.scale;
        const initialConsciousness = p1.consciousness;

        let newState = playCard(gameState, PlayerId.PLAYER1, worshipCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const hasSalvation = finalP1.hand.some(c => c.name === '救世');
        assert.strictEqual(finalP1.scale, initialScale - 2, 'Scale should decrease by 2');
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 3, 'Consciousness should increase by 3');
        assert.strictEqual(hasSalvation, false, 'Salvation card should not be added to hand');
    });

    test('should add Salvation if consciousness is >= 40 after play', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10;
        p1.consciousness = 37; // Becomes 40, which is >= 40
        const worshipCard = createCardInstance(cardDefinitions['崇拝'], p1.id);
        p1.hand.push(worshipCard);
        gameState.all_card_instances[worshipCard.instance_id] = worshipCard;
        const initialScale = p1.scale;
        const initialConsciousness = p1.consciousness;

        let newState = playCard(gameState, PlayerId.PLAYER1, worshipCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const hasSalvation = finalP1.hand.some(c => c.name === '救世');
        assert.strictEqual(finalP1.scale, initialScale - 2, 'Scale should decrease by 2');
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 3, 'Consciousness should increase by 3');
        assert.ok(hasSalvation, 'Salvation card should be added to hand');
    });
});
