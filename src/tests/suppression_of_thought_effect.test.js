const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('思想の弾圧 (Suppression of Thought) Card Effect', () => {
    const cardDefinitions = {
        "思想の弾圧": {
            "name": "思想の弾圧",
            "card_type": "事象",
            "required_scale": 10,
            "description": "手札のイデオロギーをすべてデッキに戻し、自分の意識+5。手札のすべてのカードの必要規模-5。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "PROCESS_CARD_OPERATION",
                        "args": {
                            "player_id": "self",
                            "operation": "move",
                            "source_pile": "hand",
                            "destination_pile": "deck",
                            "card_type": "イデオロギー",
                            "selection_method": "all"
                        }
                    },
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": 5
                        }
                    },
                    {
                        "effect_type": "PROCESS_CARD_OPERATION",
                        "args": {
                            "player_id": "self",
                            "operation": "modify_required_scale",
                            "source_pile": "hand",
                            "selection_method": "all",
                            "amount": -5,
                            "min_value": 0
                        }
                    }
                ]
            }
        },
        "イデオロギーA": { "name": "イデオロギーA", "card_type": CardType.IDEOLOGY, "required_scale": 10 },
        "イデオロギーB": { "name": "イデオロギーB", "card_type": CardType.IDEOLOGY, "required_scale": 10 },
        "財宝": { "name": "財宝", "card_type": CardType.WEALTH, "required_scale": 8 },
    };

    test('should move ideologies to deck, increase consciousness, and reduce required scale of hand cards', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;
        const initialDeckCount = p1.deck.length;

        p1.scale = 15;

        const ideologyA = createCardInstance(cardDefinitions['イデオロギーA'], PlayerId.PLAYER1, { location: Location.HAND });
        const ideologyB = createCardInstance(cardDefinitions['イデオロギーB'], PlayerId.PLAYER1, { location: Location.HAND });
        const wealthCard = createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER1, { location: Location.HAND });
        const suppressionCard = createCardInstance(cardDefinitions['思想の弾圧'], PlayerId.PLAYER1, { location: Location.HAND });

        p1.hand.push(ideologyA, ideologyB, wealthCard, suppressionCard);
        Object.assign(gameState.all_card_instances, {
            [ideologyA.instance_id]: ideologyA,
            [ideologyB.instance_id]: ideologyB,
            [wealthCard.instance_id]: wealthCard,
            [suppressionCard.instance_id]: suppressionCard,
        });

        const initialWealthRequiredScale = wealthCard.required_scale;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, suppressionCard.instance_id);
        nextState = processEffects(nextState);
        // Run processEffects multiple times to clear the queue
        let safetyBreak = 0;
        while(nextState.effect_queue.length > 0 && safetyBreak < 10) {
            nextState = processEffects(nextState);
            safetyBreak++;
        }

        // 3. Verification
        const finalP1 = nextState.players[PlayerId.PLAYER1];

        // a & b. Ideologies moved from hand to deck
        assert.strictEqual(finalP1.hand.some(c => c.card_type === CardType.IDEOLOGY), false, 'Ideology cards should be removed from hand');
        assert.strictEqual(finalP1.deck.length, initialDeckCount + 2, 'Deck should contain the two moved ideology cards');
        assert.ok(finalP1.deck.find(c => c.instance_id === ideologyA.instance_id), 'Ideology A should be in the deck');
        assert.ok(finalP1.deck.find(c => c.instance_id === ideologyB.instance_id), 'Ideology B should be in the deck');

        // c. Consciousness increased
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 5, 'Consciousness should increase by 5');

        // d. Required scale of remaining hand cards reduced
        const finalWealthCard = finalP1.hand.find(c => c.instance_id === wealthCard.instance_id);
        assert.ok(finalWealthCard, 'Wealth card should remain in hand');
        assert.strictEqual(finalWealthCard.required_scale, initialWealthRequiredScale - 5, 'Wealth card required scale should be reduced by 5');

        // e. Suppression of Thought card is in the discard pile
        assert.ok(finalP1.discard.find(c => c.instance_id === suppressionCard.instance_id), 'Suppression of Thought should be in the discard pile');
    });
});
