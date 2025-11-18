const assert = require('assert');
const { playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('布教 (Missionary) Card Effect', () => {
    const cardDefinitions = {
        "布教": {
            "name": "布教",
            "card_type": "事象",
            "required_scale": 0,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 2 } },
                    { "effect_type": "PROCESS_ADD_CARD_CONDITIONAL", "args": { "player_id": "self", "condition_target": "scale", "threshold": 5, "card_template_name": "受難" } }
                ],
                "END_TURN_OWNER": [
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "self", "source_pile": "hand", "destination_pile": "discard", "player_id": "self" } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 1 } }
                ]
            }
        },
        "受難": { "name": "受難", "card_type": "事象" }
    };

    test('should only increase scale if scale becomes < 5 after play', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 2; // Will become 4, which is < 5
        const initialScale = p1.scale;
        const missionaryCard = createCardInstance(cardDefinitions['布教'], p1.id);
        p1.hand.push(missionaryCard);
        gameState.all_card_instances[missionaryCard.instance_id] = missionaryCard;

        let newState = playCard(gameState, PlayerId.PLAYER1, missionaryCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const hasSufferingCard = finalP1.hand.some(c => c.name === '受難');
        assert.strictEqual(finalP1.scale, initialScale + 2, 'Scale should increase by 2');
        assert.strictEqual(hasSufferingCard, false, 'Suffering card should not be added to hand');
    });

    test('should also add Suffering to hand if scale becomes >= 5 after play', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 3; // Will become 5, which is >= 5
        const initialScale = p1.scale;
        const missionaryCard = createCardInstance(cardDefinitions['布教'], p1.id);
        p1.hand.push(missionaryCard);
        gameState.all_card_instances[missionaryCard.instance_id] = missionaryCard;

        let newState = playCard(gameState, PlayerId.PLAYER1, missionaryCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const hasSufferingCard = finalP1.hand.some(c => c.name === '受難');
        assert.strictEqual(finalP1.scale, initialScale + 2, 'Scale should increase by 2');
        assert.ok(hasSufferingCard, 'Suffering card should be added to hand');
    });

    test('should be discarded for +1 consciousness at end of turn if in hand', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const missionaryCard = createCardInstance(cardDefinitions['布教'], p1.id);
        p1.hand.push(missionaryCard);
        missionaryCard.location = 'hand'; // Explicitly set location
        gameState.all_card_instances[missionaryCard.instance_id] = missionaryCard;
        const initialConsciousness = p1.consciousness;
        gameState.current_turn = PlayerId.PLAYER1;

        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const missionaryInHand = finalP1.hand.some(c => c.instance_id === missionaryCard.instance_id);
        const missionaryInDiscard = finalP1.discard.some(c => c.instance_id === missionaryCard.instance_id);
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
        assert.strictEqual(missionaryInHand, false, 'Missionary card should not be in hand');
        assert.ok(missionaryInDiscard, 'Missionary card should be in the discard pile');
    });
});
