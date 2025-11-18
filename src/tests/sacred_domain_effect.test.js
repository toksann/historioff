const assert = require('assert');
const { playCard, endTurn, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('聖なる領域 (Sacred Domain) Card Effect', () => {
    const cardDefinitions = {
        "聖なる領域": {
            "name": "聖なる領域",
            "card_type": "財",
            "required_scale": 10,
            "durability": 4,
            "triggers": {
                "CARD_PLACED_THIS": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 3 } }],
                "END_TURN_OWNER": [{ "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "modify_required_scale", "source_piles": ["hand"], "card_type": "事象", "count": 1, "selection_method": "choice", "amount": -1, "min_value": 0 } }]
            }
        },
        "大嵐": { "name": "大嵐", "card_type": "事象", "required_scale": 50 }
    };

    test('should increase consciousness by 3 on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;
        const cardTemplate = cardDefinitions['聖なる領域'];
        const cardInstance = createCardInstance(cardTemplate, PlayerId.PLAYER1);
        p1.hand.push(cardInstance);
        gameState.all_card_instances[cardInstance.instance_id] = cardInstance;
        p1.scale = 10;

        let newState = playCard(gameState, PlayerId.PLAYER1, cardInstance.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const sacredDomainCard = finalP1.field.find(c => c.instance_id === cardInstance.instance_id);
        assert.ok(sacredDomainCard, 'Sacred Domain should be on the field');
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 3, 'Consciousness should increase by 3');
    });

    test('should reduce required_scale of a chosen event card in hand at end of turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const sacredDomainInstance = createCardInstance(cardDefinitions['聖なる領域'], p1.id, { location: Location.FIELD });
        p1.field.push(sacredDomainInstance);
        gameState.all_card_instances[sacredDomainInstance.instance_id] = sacredDomainInstance;
        gameState.current_turn = PlayerId.PLAYER1;

        const eventCardInstance = createCardInstance(cardDefinitions['大嵐'], PlayerId.PLAYER1, { required_scale: 50 });
        p1.hand.push(eventCardInstance);
        gameState.all_card_instances[eventCardInstance.instance_id] = eventCardInstance;
        const initialRequiredScale = eventCardInstance.required_scale;

        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0 && !newState.awaiting_input) {
            newState = processEffects(newState);
        }

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARDS_FOR_OPERATION', 'Input type should be CHOICE_CARDS_FOR_OPERATION');

        let finalState = resolveInput(newState, [eventCardInstance]);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalEventCard = finalState.all_card_instances[eventCardInstance.instance_id];
        assert.strictEqual(finalEventCard.required_scale, initialRequiredScale - 1, 'Event card required_scale should decrease by 1');
    });
});
