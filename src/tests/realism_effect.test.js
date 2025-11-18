const assert = require('assert');
const { startTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('現実主義 (Realism) Card Effect', () => {
    const cardDefinitions = {
        "現実主義": {
            "name": "現実主義",
            "card_type": "イデオロギー",
            "required_scale": 0,
            "description": "ターン開始時、自分の場の財の数が相手より少ないなら、自分の規模+3。さらに、相手のデッキの枚数が、自分より少ないならカードを1枚引く。",
            "triggers": {
                "START_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": 3,
                            "condition_fewer_wealth_than_opponent": true
                        }
                    },
                    {
                        "effect_type": "MOVE_CARD",
                        "args": {
                            "card_id": "draw_from_deck",
                            "source_pile": "deck",
                            "destination_pile": "hand",
                            "player_id": "self",
                            "condition_opponent_deck_smaller": true
                        }
                    }
                ]
            }
        },
        "財宝": { "name": "財宝", "card_type": "財", "durability": 10 },
        "ダミーカード": { "name": "ダミーカード", "card_type": "事象" },
    };

    let gameState;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];

        // Place Realism as Player 1's ideology
        const realismCard = createCardInstance(cardDefinitions['現実主義'], PlayerId.PLAYER1);
        p1.ideology = realismCard;
        gameState.all_card_instances[realismCard.instance_id] = realismCard;
        realismCard.location = Location.FIELD; // Ideologies are considered on the field
    });

    test('should increase scale and draw a card when both conditions are met', () => {
        // 1. Setup: P1 has fewer wealth cards and P2 has a smaller deck
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.field = []; // 0 wealth
        p2.field = [createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER2)]; // 1 wealth

        p1.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1), createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1)]; // 2 cards
        p2.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2)]; // 1 card

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let nextState = startTurn(gameState);
        nextState = processEffects(nextState);

        // 3. Verification
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].scale, initialScale + 3, 'P1 scale should increase by 3');
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].hand.length, initialHandCount + 1, 'P1 should draw one card');
    });

    test('should only increase scale when only wealth condition is met', () => {
        // 1. Setup: P1 has fewer wealth cards, P2\'s deck is not smaller
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.field = []; // 0 wealth
        p2.field = [createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER2)]; // 1 wealth

        p1.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1)]; // 1 card
        p2.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2), createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2)]; // 2 cards

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let nextState = startTurn(gameState);
        nextState = processEffects(nextState);

        // 3. Verification
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].scale, initialScale + 3, 'P1 scale should increase by 3');
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].hand.length, initialHandCount + 1, 'P1 should draw one card by default');
    });

    test('should only draw a card when only deck condition is met', () => {
        // 1. Setup: P1 does not have fewer wealth cards, P2 has a smaller deck
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.field = [createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER1)]; // 1 wealth
        p2.field = [createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER2)]; // 1 wealth

        p1.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1), createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1)]; // 2 cards
        p2.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2)]; // 1 card

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let nextState = startTurn(gameState);
        nextState = processEffects(nextState);

        // 3. Verification
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].scale, initialScale, 'P1 scale should not change');
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].hand.length, initialHandCount + 1, 'P1 should draw one card');
    });

    test('should do nothing when neither condition is met', () => {
        // 1. Setup: P1 does not have fewer wealth cards, P2\'s deck is not smaller
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.field = [createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER1)]; // 1 wealth
        p2.field = []; // 0 wealth

        p1.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER1)]; // 1 card
        p2.deck = [createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2), createCardInstance(cardDefinitions['ダミーカード'], PlayerId.PLAYER2)]; // 2 cards

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let nextState = startTurn(gameState);
        nextState = processEffects(nextState);

        // 3. Verification
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].scale, initialScale, 'P1 scale should not change');
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].hand.length, initialHandCount + 1, 'P1 should draw one card by default');
    });
});
