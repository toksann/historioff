const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('物々交換 (Barter) Card Effect', () => {
    const cardDefinitions = {
        "物々交換": {
            "name": "物々交換",
            "card_type": "事象",
            "required_scale": 0,
            "description": "手札の最も必要規模の大きいカードをデッキに戻し、デッキからカードを1枚引く",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_RETURN_LARGEST_REQUIRED_SCALE_CARD_TO_DECK", "args": { "player_id": "self" } }
                ],
                "SUCCESS_PROCESS": [
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" } }
                ]
            }
        },
        "砦": { "name": "砦", "card_type": "財", "required_scale": 15, "durability": 5 },
        "戦士": { "name": "戦士", "card_type": "財", "required_scale": 1, "durability": 2 },
        "農民": { "name": "農民", "card_type": "財", "required_scale": 0, "durability": 1 }
    };

    test('should return the highest-cost card and draw one', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const barterCard = createCardInstance(cardDefinitions['物々交換'], p1.id);
        const warriorCard = createCardInstance(cardDefinitions['戦士'], p1.id);
        const fortressCard = createCardInstance(cardDefinitions['砦'], p1.id);
        const peasantCard = createCardInstance(cardDefinitions['農民'], p1.id);

        p1.hand = [barterCard, warriorCard, fortressCard];
        p1.deck = [peasantCard];
        [barterCard, warriorCard, fortressCard, peasantCard].forEach(c => {
            gameState.all_card_instances[c.instance_id] = c;
        });

        const initialHandCount = p1.hand.length; // 3
        const cardToReturnId = fortressCard.instance_id; // Fortress has the highest required_scale

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, barterCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const returnedCardInDeck = finalP1.deck.find(c => c.instance_id === cardToReturnId);
        const drawnCardInHand = finalP1.hand.find(c => c.instance_id === peasantCard.instance_id);

        // Hand starts with 3. Play Barter -> 2. Return Fortress -> 1. Draw Peasant -> 2.
        assert.strictEqual(finalP1.hand.length, initialHandCount - 1, 'Hand size should be 2');
        assert.ok(returnedCardInDeck, 'The highest-cost card (Fortress) was not returned to the deck');
        assert.ok(drawnCardInHand, 'A new card was not drawn from the deck');
        assert.strictEqual(finalP1.hand.some(c => c.instance_id === cardToReturnId), false, 'Fortress should not be in hand');
    });

    test('should do nothing if hand only contains the Barter card itself', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const barterCard = createCardInstance(cardDefinitions['物々交換'], p1.id);
        const peasantCard = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.hand = [barterCard];
        p1.deck = [peasantCard];
        gameState.all_card_instances[barterCard.instance_id] = barterCard;
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;

        const initialDeckCount = p1.deck.length;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, barterCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];

        // Hand starts with 1. Play Barter -> 0. Effect fails. No draw.
        assert.strictEqual(finalP1.hand.length, initialHandCount - 1, 'Hand should be empty');
        assert.strictEqual(finalP1.deck.length, initialDeckCount, 'Deck size should not change');
    });
});
