const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('救世 (Salvation) Card Effect', () => {
    const cardDefinitions = {
        "救世": {
            "name": "救世",
            "card_type": "事象",
            "required_scale": 0,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "SET_CONSCIOUSNESS", "args": { "player_id": "opponent", "amount": 0, "condition_self_consciousness_ge": 100 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "救世", "destination_pile": "deck", "position": "bottom", "on_failure_of_previous": true } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 4, "on_failure_of_previous": true } }
                ]
            }
        }
    };

    test('should set opponent consciousness to 0 if own consciousness is >= 100', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.consciousness = 100;
        p2.consciousness = 50;
        const salvationCard = createCardInstance(cardDefinitions['救世'], p1.id);
        p1.hand.push(salvationCard);
        gameState.all_card_instances[salvationCard.instance_id] = salvationCard;

        let newState = playCard(gameState, PlayerId.PLAYER1, salvationCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(finalP2.consciousness, 0, 'Opponent consciousness should be set to 0');
    });

    test('should add self to deck and gain consciousness if own consciousness is < 100', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 99;
        const salvationCard = createCardInstance(cardDefinitions['救世'], p1.id);
        p1.hand.push(salvationCard);
        gameState.all_card_instances[salvationCard.instance_id] = salvationCard;

        const initialP1Consciousness = p1.consciousness;
        const initialDeckCount = p1.deck.length;

        let newState = playCard(gameState, PlayerId.PLAYER1, salvationCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const salvationInDeck = finalP1.deck.find(c => c.name === '救世');
        assert.strictEqual(finalP1.consciousness, initialP1Consciousness + 4, 'Own consciousness should increase by 4');
        assert.ok(salvationInDeck, 'A copy of Salvation should be added to the deck');
        assert.strictEqual(finalP1.deck[finalP1.deck.length - 1].name, '救世', 'Salvation should be at the bottom of the deck');
    });
});
