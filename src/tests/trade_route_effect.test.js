const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('交易路 (Trade Route) Card Effect', () => {
    const cardDefinitions = {
        "交易路": {
            "name": "交易路",
            "card_type": "財",
            "required_scale": 6,
            "durability": 3,
            "description": "配置時自分の規模+3。相手の場に財は配置されるたび、自分の規模+1。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 3 } }
                ],
                "CARD_PLACED_OPPONENT": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 1 } }
                ]
            }
        },
        "農民": {
            "name": "農民",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
        }
    };

    test('should increase own scale by 3 when placed', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const cardInstance = createCardInstance(cardDefinitions['交易路'], p1.id);
        p1.hand.push(cardInstance);
        gameState.all_card_instances[cardInstance.instance_id] = cardInstance;
        p1.scale = 6; // Meet required scale
        const initialScale = p1.scale;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, cardInstance.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, initialScale + 3, 'Scale should increase by 3 on placement');
    });

    test('should increase own scale by 1 when opponent plays a wealth card', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        // Place Trade Route on P1's field
        const tradeRouteInstance = createCardInstance(cardDefinitions['交易路'], p1.id, { location: Location.FIELD });
        p1.field.push(tradeRouteInstance);
        gameState.all_card_instances[tradeRouteInstance.instance_id] = tradeRouteInstance;

        // Give Peasant to P2's hand
        const peasantInstance = createCardInstance(cardDefinitions['農民'], p2.id);
        p2.hand.push(peasantInstance);
        gameState.all_card_instances[peasantInstance.instance_id] = peasantInstance;
        p2.scale = 0; // Peasant's required scale
        gameState.current_turn = PlayerId.PLAYER2;

        const initialP1Scale = p1.scale;

        // 2. Execution: P2 plays the Peasant card
        let newState = playCard(gameState, PlayerId.PLAYER2, peasantInstance.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const peasantOnField = newState.players[PlayerId.PLAYER2].field.find(c => c.instance_id === peasantInstance.instance_id);

        assert.ok(peasantOnField, 'Opponent\'s wealth card should be on the field');
        assert.strictEqual(finalP1.scale, initialP1Scale + 1, 'Trade Route effect should increase scale by 1');
    });
});
