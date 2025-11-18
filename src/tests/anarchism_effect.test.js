const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard } = require('../gameLogic/main.js');

describe('アナーキズム (Anarchism) Card Effect', () => {

    const cardDefinitions = {
        "アナーキズム": {
            name: "アナーキズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 0,
            description: "財を出すたびカードを1枚引く。事象を出すたび自分のすべての財の耐久値+1。",
            triggers: {
                [TriggerType.CARD_PLACED_OWNER]: [
                    {
                        effect_type: "MOVE_CARD",
                        args: {
                            card_id: "draw_from_deck",
                            source_pile: "deck",
                            destination_pile: "hand",
                            player_id: "self"
                        }
                    }
                ],
                [TriggerType.PLAY_EVENT_OWNER]: [
                    {
                        effect_type: "PROCESS_CARD_OPERATION",
                        args: {
                            player_id: "self",
                            operation: "modify_durability",
                            target_player_id: "self",
                            selection_method: "all",
                            amount: 1
                        }
                    }
                ]
            }
        },
        "農民": {
            name: "農民",
            card_type: CardType.WEALTH,
            required_scale: 5,
            durability: 5,
            description: "テスト用財カード",
        },
        "ただの事象": {
            name: "ただの事象",
            card_type: CardType.EVENT,
            required_scale: 0,
            description: "テスト用事象カード",
        },
        "ダミーイデオロギー": {
            name: "ダミーイデオロギー",
            card_type: CardType.IDEOLOGY,
            required_scale: 0,
            description: "テスト用イデオロギーカード",
        }
    };

    test('should draw a card when a wealth card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.deck.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1)); // Add a card to draw

        const anarchismCard = createCardInstance(cardDefinitions['アナーキズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = anarchismCard;
        gameState.all_card_instances[anarchismCard.instance_id] = anarchismCard;

        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(peasantCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;

        const initialHandSize = p1.hand.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, peasantCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // Hand size should increase by 1 (draw) and decrease by 1 (play) = 0 change, plus the drawn card = +1
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].hand.length, initialHandSize, 'Should draw one card and play one card, hand size should be same.');
    });

    test('should increase durability of all own wealth cards when an event card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        const anarchismCard = createCardInstance(cardDefinitions['アナーキズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = anarchismCard;
        gameState.all_card_instances[anarchismCard.instance_id] = anarchismCard;

        const p1Peasant = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 5 });
        p1.field.push(p1Peasant);
        gameState.all_card_instances[p1Peasant.instance_id] = p1Peasant;

        const p2Peasant = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER2, { location: Location.FIELD, current_durability: 5 });
        p2.field.push(p2Peasant);
        gameState.all_card_instances[p2Peasant.instance_id] = p2Peasant;

        const eventCard = createCardInstance(cardDefinitions['ただの事象'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(eventCard);
        gameState.all_card_instances[eventCard.instance_id] = eventCard;

        let nextState = playCard(gameState, PlayerId.PLAYER1, eventCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1Peasant = finalState.all_card_instances[p1Peasant.instance_id];
        const finalP2Peasant = finalState.all_card_instances[p2Peasant.instance_id];

        assert.strictEqual(finalP1Peasant.current_durability, 6, 'P1 Peasant durability should be 5 + 1');
        assert.strictEqual(finalP2Peasant.current_durability, 5, 'P2 Peasant durability should not change');
    });

    test('should NOT draw a card when an ideology card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.deck.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));

        const anarchismCard = createCardInstance(cardDefinitions['アナーキズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = anarchismCard;
        gameState.all_card_instances[anarchismCard.instance_id] = anarchismCard;

        const dummyIdeologyCard = createCardInstance(cardDefinitions['ダミーイデオロギー'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(dummyIdeologyCard);
        gameState.all_card_instances[dummyIdeologyCard.instance_id] = dummyIdeologyCard;

        const initialHandSize = p1.hand.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, dummyIdeologyCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // Hand size should decrease by 1 (play), and not draw a card.
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].hand.length, initialHandSize - 1, 'Should not draw a card, hand size should decrease by 1.');
    });
});