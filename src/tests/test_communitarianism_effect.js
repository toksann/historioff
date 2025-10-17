const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('共同体主義 (Communitarianism) Card Effect', () => {
    const cardDefinitions = {
        "共同体主義": {
            "name": "共同体主義",
            "card_type": "イデオロギー",
            "required_scale": 0,
            "description": "配置時、捨て札の枚数だけ自分の意識をプラスする。自分のカードが捨て札になるたび、自分の意識+1。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount_based_on_discard_count": true
                        }
                    }
                ],
                "CARD_DISCARDED_OWNER": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": 1
                        }
                    }
                ]
            }
        },
        "ダミー事象カード": { "name": "ダミー事象カード", "card_type": CardType.EVENT },
        "ダミー財宝カード": { "name": "ダミー財宝カード", "card_type": CardType.WEALTH },
    };

    let gameState;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
    });

    test('should increase consciousness based on discard pile count when placed', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;
        const discardCount = 3;

        for (let i = 0; i < discardCount; i++) {
            const discardCard = createCardInstance(cardDefinitions['ダミー財宝カード'], PlayerId.PLAYER1);
            p1.discard.push(discardCard);
        }

        const communitarianismCard = createCardInstance(cardDefinitions['共同体主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(communitarianismCard);

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, communitarianismCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].consciousness, initialConsciousness + discardCount, `Consciousness should increase by ${discardCount}`);
    });

    test('should increase consciousness by 1 each time a card is discarded', () => {
        // 1. Setup: Place Communitarianism first
        const p1 = gameState.players[PlayerId.PLAYER1];
        const communitarianismCard = createCardInstance(cardDefinitions['共同体主義'], PlayerId.PLAYER1);
        p1.ideology = communitarianismCard;
        communitarianismCard.location = Location.FIELD;
        gameState.all_card_instances[communitarianismCard.instance_id] = communitarianismCard;

        const initialConsciousness = p1.consciousness;

        // 2. Execution (First discard)
        const eventCard1 = createCardInstance(cardDefinitions['ダミー事象カード'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(eventCard1);
        let stateAfterFirstDiscard = playCard(gameState, PlayerId.PLAYER1, eventCard1.instance_id);
        stateAfterFirstDiscard = processEffects(stateAfterFirstDiscard);

        // 3. Verification (First discard)
        assert.strictEqual(stateAfterFirstDiscard.players[PlayerId.PLAYER1].consciousness, initialConsciousness + 1, 'Consciousness should increase by 1 after first discard');

        // 4. Execution (Second discard)
        const eventCard2 = createCardInstance(cardDefinitions['ダミー事象カード'], PlayerId.PLAYER1, { location: Location.HAND });
        stateAfterFirstDiscard.players[PlayerId.PLAYER1].hand.push(eventCard2);
        let stateAfterSecondDiscard = playCard(stateAfterFirstDiscard, PlayerId.PLAYER1, eventCard2.instance_id);
        stateAfterSecondDiscard = processEffects(stateAfterSecondDiscard);

        // 5. Verification (Second discard)
        assert.strictEqual(stateAfterSecondDiscard.players[PlayerId.PLAYER1].consciousness, initialConsciousness + 2, 'Consciousness should increase by 2 after second discard');
    });
});
