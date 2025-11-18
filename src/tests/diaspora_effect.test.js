const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('ディアスポラ (Diaspora) Card Effect', () => {
    const cardDefinitions = {
        "ディアスポラ": {
            "name": "ディアスポラ",
            "card_type": "事象",
            "required_scale": 20,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": -5 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "opponent", "card_template_name": "移民", "destination_pile": "deck", "count": 2 } }
                ]
            }
        },
        "移民": { "name": "移民", "card_type": "事象" }
    };

    test('should decrease own scale by 5 and add 2 Immigrants to opponent deck', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const diasporaCard = createCardInstance(cardDefinitions['ディアスポラ'], p1.id);
        p1.hand.push(diasporaCard);
        gameState.all_card_instances[diasporaCard.instance_id] = diasporaCard;
        p1.scale = 25; // Meet required scale

        const initialP1Scale = p1.scale;
        const initialP2DeckSize = p2.deck.length;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, diasporaCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        const immigrantsInP2Deck = finalP2.deck.filter(c => c.name === '移民').length;

        assert.strictEqual(finalP1.scale, initialP1Scale - 5, 'Own scale should decrease by 5');
        assert.strictEqual(finalP2.deck.length, initialP2DeckSize + 2, 'Opponent deck size should increase by 2');
        assert.strictEqual(immigrantsInP2Deck, initialP2DeckSize + 2, 'The new cards in opponent deck should be Immigrants');
    });
});
