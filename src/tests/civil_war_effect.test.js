const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('内戦 (Civil War) Card Effect', () => {
    const cardDefinitions = {
        "内戦": {
            "name": "内戦",
            "card_type": "事象",
            "required_scale": 40,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -15 } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "opponent", "amount": -15 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "移民", "destination_pile": "deck", "count": 5 } }
                ]
            }
        },
        "移民": { "name": "移民", "card_type": "事象" }
    };

    test('should affect opponent and add Immigrants to own deck', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const civilWarCard = createCardInstance(cardDefinitions['内戦'], p1.id);
        p1.hand.push(civilWarCard);
        gameState.all_card_instances[civilWarCard.instance_id] = civilWarCard;
        p1.scale = civilWarCard.required_scale;

        // Set initial stats for P2 to make the test more meaningful
        p2.consciousness = 25; 
        p2.scale = 20;

        const initialP1DeckSize = p1.deck.length;
        const initialP2Consciousness = p2.consciousness;
        const initialP2Scale = p2.scale;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, civilWarCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        const immigrantsInP1Deck = finalP1.deck.filter(c => c.name === '移民').length;

        assert.strictEqual(finalP2.consciousness, initialP2Consciousness - 15, 'Opponent consciousness should decrease by 15');
        assert.strictEqual(finalP2.scale, initialP2Scale - 15, 'Opponent scale should decrease by 15');
        assert.strictEqual(finalP1.deck.length, initialP1DeckSize + 5, 'Own deck size should increase by 5');
        // Check if the newly added cards are Immigrants
        assert.strictEqual(immigrantsInP1Deck, 5, 'The 5 new cards in own deck should be Immigrants');
    });
});
