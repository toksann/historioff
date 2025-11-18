const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('技術提供 (Technology Transfer) Card Effect', () => {
    const cardDefinitions = {
        "技術提供": {
            "name": "技術提供",
            "card_type": "事象",
            "required_scale": 15,
            "triggers": {
                "PLAY_EVENT_THIS": [{ "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "opponent", "card_template_name": "技術革新", "destination_pile": "deck", "count": 2 } }]
            }
        },
        "技術革新": { "name": "技術革新", "card_type": "事象" }
    };

    test('should add 2 Tech Innovation cards to opponent deck on play', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const techTransferCard = createCardInstance(cardDefinitions['技術提供'], p1.id);
        p1.hand.push(techTransferCard);
        gameState.all_card_instances[techTransferCard.instance_id] = techTransferCard;
        p1.scale = techTransferCard.required_scale;

        const initialP2DeckSize = p2.deck.length;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, techTransferCard.instance_id);
        newState = processAllEffects(newState);

        // 3. Verification
        const finalP2 = newState.players[PlayerId.PLAYER2];
        const techInnovationsInP2Deck = finalP2.deck.filter(c => c.name === '技術革新').length;

        assert.strictEqual(finalP2.deck.length, initialP2DeckSize + 2, 'Opponent deck size should increase by 2');
        assert.strictEqual(techInnovationsInP2Deck, 2, 'The 2 new cards in opponent deck should be Tech Innovations');
    });
});
