const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');

describe('覚醒 (Awakening) Card Effect', () => {
    const cardDefinitions = {
        "覚醒": {
            "name": "覚醒",
            "card_type": "事象",
            "required_scale": 5,
            "description": "デッキからランダムなイデオロギーカードを一枚引き、その必要規模を-5する。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "PROCESS_DRAW_RANDOM_CARD_AND_MODIFY_REQUIRED_SCALE",
                        "args": {
                            "player_id": "self",
                            "card_type": "イデオロギー",
                            "amount": 1,
                            "scale_reduction": 5
                        }
                    }
                ]
            }
        },
        "理想主義": {
            "name": "理想主義",
            "card_type": CardType.IDEOLOGY,
            "required_scale": 20,
        },
    };

    test('should draw a random ideology card and reduce its required scale', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 5; // To meet the required_scale of Awakening

        const awakeningCard = createCardInstance(cardDefinitions['覚醒'], PlayerId.PLAYER1, { location: Location.HAND });
        const ideologyCard = createCardInstance(cardDefinitions['理想主義'], PlayerId.PLAYER1, { location: Location.DECK });

        p1.hand.push(awakeningCard);
        p1.deck.push(ideologyCard);
        gameState.all_card_instances[awakeningCard.instance_id] = awakeningCard;
        gameState.all_card_instances[ideologyCard.instance_id] = ideologyCard;
        
        const initialDeckSize = p1.deck.length;
        const initialIdeologyScale = ideologyCard.required_scale;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, awakeningCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const drawnIdeologyCard = p1Final.hand.find(c => c.name === '理想主義');

        assert.strictEqual(p1Final.deck.length, initialDeckSize - 1, "Player 1's deck should have one fewer card");
        assert.ok(drawnIdeologyCard, "The Ideology card should be in the player's hand");
        assert.strictEqual(drawnIdeologyCard.required_scale, initialIdeologyScale - 5, "Ideology card's required scale should be reduced by 5");
    });
});
