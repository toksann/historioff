const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');

describe('予感 (Premonition) Card Effect', () => {
    const cardDefinitions = {
        "予感": {
            "name": "予感",
            "card_type": "事象",
            "required_scale": 0,
            "description": "デッキからカードを2枚引く。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "MOVE_CARD",
                        "args": {
                            "card_id": "draw_from_deck",
                            "source_pile": "deck",
                            "destination_pile": "hand",
                            "player_id": "self"
                        }
                    },
                    {
                        "effect_type": "MOVE_CARD",
                        "args": {
                            "card_id": "draw_from_deck",
                            "source_pile": "deck",
                            "destination_pile": "hand",
                            "player_id": "self"
                        }
                    }
                ]
            }
        },
        "財宝1": { "name": "財宝1", "card_type": CardType.WEALTH },
        "財宝2": { "name": "財宝2", "card_type": CardType.WEALTH },
    };

    test('should draw two cards from the deck', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];

        const premonitionCard = createCardInstance(cardDefinitions['予感'], PlayerId.PLAYER1, { location: Location.HAND });
        const deckCard1 = createCardInstance(cardDefinitions['財宝1'], PlayerId.PLAYER1, { location: Location.DECK });
        const deckCard2 = createCardInstance(cardDefinitions['財宝2'], PlayerId.PLAYER1, { location: Location.DECK });

        p1.hand.push(premonitionCard);
        p1.deck.push(deckCard1, deckCard2);
        gameState.all_card_instances[premonitionCard.instance_id] = premonitionCard;
        gameState.all_card_instances[deckCard1.instance_id] = deckCard1;
        gameState.all_card_instances[deckCard2.instance_id] = deckCard2;
        
        const initialHandSize = p1.hand.length;
        const initialDeckSize = p1.deck.length;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, premonitionCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];

        // 1 card played, 2 cards drawn
        assert.strictEqual(p1Final.hand.length, initialHandSize - 1 + 2, "Player 1's hand should have one more card");
        assert.strictEqual(p1Final.deck.length, initialDeckSize - 2, "Player 1's deck should have two fewer cards");
    });
});
