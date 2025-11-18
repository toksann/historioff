const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('輪廻転生 (Reincarnation) Card Effect', () => {
    const cardDefinitions = {
        "輪廻転生": {
            "name": "輪廻転生",
            "card_type": "事象",
            "required_scale": 30,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "remove", "source_piles": ["deck"], "selection_method": "all" } },
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "move", "source_piles": ["discard"], "destination_pile": "deck", "selection_method": "all" } }
                ]
            }
        },
        "農民": { "name": "農民", "card_type": "財" },
        "戦士": { "name": "戦士", "card_type": "財" },
        "果実": { "name": "果実", "card_type": "財" },
        "山": { "name": "山", "card_type": "財" }
    };

    test('should swap the deck and discard pile', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const reincarnationCard = createCardInstance(cardDefinitions['輪廻転生'], p1.id);
        const deckCard1 = createCardInstance(cardDefinitions['農民'], p1.id);
        const deckCard2 = createCardInstance(cardDefinitions['戦士'], p1.id);
        const discardCard1 = createCardInstance(cardDefinitions['果実'], p1.id);
        const discardCard2 = createCardInstance(cardDefinitions['山'], p1.id);

        p1.hand = [reincarnationCard];
        p1.deck = [deckCard1, deckCard2];
        p1.discard = [discardCard1, discardCard2];
        [reincarnationCard, deckCard1, deckCard2, discardCard1, discardCard2].forEach(c => gameState.all_card_instances[c.instance_id] = c);
        p1.scale = 30; // Meet required scale

        const originalDeckIds = p1.deck.map(c => c.instance_id);
        const originalDiscardIds = p1.discard.map(c => c.instance_id);

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, reincarnationCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalDeckIds = finalP1.deck.map(c => c.instance_id);

        // Verify the new deck contains the cards from the old discard pile
        assert.deepStrictEqual(finalDeckIds.sort(), originalDiscardIds.sort(), 'The new deck should contain the cards from the old discard pile');

        // Verify the discard pile only contains the played Reincarnation card
        assert.strictEqual(finalP1.discard.length, 1, 'Discard pile should only have 1 card');
        assert.strictEqual(finalP1.discard[0].instance_id, reincarnationCard.instance_id, 'The played Reincarnation card should be the only one in the discard pile');

        // Verify the original deck cards are gone (removed from the game)
        originalDeckIds.forEach(cardId => {
            const card = newState.all_card_instances[cardId];
            assert.strictEqual(card.location, null, `Card ${cardId} should have been removed from the game`);
        });
    });
});
