const assert = require('assert');
const { startTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('聖典 (Sacred Scripture) Card Effect', () => {
    const cardDefinitions = {
        "聖典": {
            "name": "聖典",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "is_token": true,
            "triggers": {
                "START_TURN_OWNER": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 1 } },
                    { "effect_type": "PROCESS_ADD_CARD_CONDITIONAL_ON_DECK_COUNT", "args": { "player_id": "self", "threshold": 8, "card_if_above": "布教", "card_if_below": "崇拝" } }
                ]
            }
        },
        "布教": { "name": "布教", "card_type": "事象" },
        "崇拝": { "name": "崇拝", "card_type": "事象" },
        "農民": { "name": "農民", "card_type": "財" }
    };

    let gameState, p1;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;

        const sacredScriptureCard = createCardInstance(cardDefinitions['聖典'], p1.id, { location: Location.FIELD });
        p1.field.push(sacredScriptureCard);
        gameState.all_card_instances[sacredScriptureCard.instance_id] = sacredScriptureCard;
    });

    test('should add Missionary to hand if deck has >= 8 cards at start of turn', () => {
        // 1. Setup
        p1.deck = Array(9).fill(null).map(() => createCardInstance(cardDefinitions['農民'], p1.id));
        p1.deck.forEach(c => gameState.all_card_instances[c.instance_id] = c);
        const initialConsciousness = p1.consciousness;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
        // Hand increases by 1 (normal draw) + 1 (card effect)
        assert.strictEqual(finalP1.hand.length, initialHandCount + 2, 'Hand size should increase by 2');
        assert.ok(finalP1.hand.some(c => c.name === '布教'), 'Missionary card should be added to hand');
    });

    test('should add Worship to hand if deck has < 8 cards at start of turn', () => {
        // 1. Setup
        p1.deck = Array(7).fill(null).map(() => createCardInstance(cardDefinitions['農民'], p1.id));
        p1.deck.forEach(c => gameState.all_card_instances[c.instance_id] = c);
        const initialConsciousness = p1.consciousness;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
        // Hand increases by 1 (normal draw) + 1 (card effect)
        assert.strictEqual(finalP1.hand.length, initialHandCount + 2, 'Hand size should increase by 2');
        assert.ok(finalP1.hand.some(c => c.name === '崇拝'), 'Worship card should be added to hand');
    });
});