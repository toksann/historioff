const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard, startTurn } = require('../gameLogic/main.js');

describe('自由主義 (Liberalism) Card Effect', () => {
    const cardDefinitions = {
        "自由主義": {
            name: "自由主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 15,
            description: "ターン開始時意識-2し、カードを1枚引く。カードを引くたび規模+2。カードを出すたび意識+1。自分の規模がプラスされたとき25を超えたなら「ニューリベラリズム」「ネオリベラリズム」「リバタリアニズム」から1枚選んで手札に加える。",
            triggers: {
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: {
                            player_id: "self",
                            amount: -2
                        }
                    },
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
                [TriggerType.CARD_DRAWN_OWNER]: [
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: {
                            player_id: "self",
                            amount: 2
                        }
                    }
                ],
                [TriggerType.PLAYER_PLAY_CARD_ACTION]: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: {
                            player_id: "self",
                            amount: 1
                        }
                    }
                ],
                [EffectType.MODIFY_SCALE]: [
                    {
                        effect_type: "PROCESS_ADD_CHOICE_CARD_TO_HAND",
                        args: {
                            player_id: "self",
                            options: [
                                "ニューリベラリズム",
                                "ネオリベラリズム",
                                "リバタリアニズム"
                            ],
                            "condition_scale_exceeds_25": true
                        }
                    }
                ]
            }
        },
        "TestCard": { name: 'TestCard', required_scale: 1, card_type: CardType.EVENT },
        "CardToDraw1": { name: 'CardToDraw1', card_type: CardType.EVENT },
        "CardToDraw2": { name: 'CardToDraw2', card_type: CardType.EVENT },
        "ニューリベラリズム": { name: "ニューリベラリズム", card_type: CardType.IDEOLOGY },
        "ネオリベラリズム": { name: "ネオリベラリズム", card_type: CardType.IDEOLOGY },
        "リバタリアニズム": { name: "リバタリアニズム", card_type: CardType.IDEOLOGY },
    };

    // Test 1: Start of Turn Effect
    test('should decrease consciousness by 2 and draw a card at the start of the turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        p1.scale = 10;
        const liberalismCard = createCardInstance(cardDefinitions['自由主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = liberalismCard;
        gameState.all_card_instances[liberalismCard.instance_id] = liberalismCard;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw1'], PlayerId.PLAYER1));

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 48, "P1 consciousness should be 50 - 2");
        assert.strictEqual(finalP1.hand.length, 1, "P1 should have drawn 1 card");
        assert.strictEqual(finalP1.hand[0].name, 'CardToDraw1', "The drawn card should be CardToDraw1");
        // Drawing a card triggers scale +2
        assert.strictEqual(finalP1.scale, 12, "P1 scale should be 10 + 2");
    });

    // Test 2: Card Drawn Effect
    test('should increase scale by 2 every time a card is drawn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10;
        const liberalismCard = createCardInstance(cardDefinitions['自由主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = liberalismCard;
        gameState.all_card_instances[liberalismCard.instance_id] = liberalismCard;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw1'], PlayerId.PLAYER1));
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw2'], PlayerId.PLAYER1));

        // Manually trigger two card draws
        gameState.effect_queue.push([{ effect_type: 'MOVE_CARD', args: { card_id: 'draw_from_deck', source_pile: 'deck', destination_pile: 'hand', player_id: PlayerId.PLAYER1 } }, liberalismCard]);
        gameState.effect_queue.push([{ effect_type: 'MOVE_CARD', args: { card_id: 'draw_from_deck', source_pile: 'deck', destination_pile: 'hand', player_id: PlayerId.PLAYER1 } }, liberalismCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 14, "P1 scale should be 10 + 2 + 2");
        assert.strictEqual(finalP1.hand.length, 2, "P1 should have drawn 2 cards");
    });

    // Test 3: Card Play Effect
    test('should increase consciousness by 1 every time a card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        const liberalismCard = createCardInstance(cardDefinitions['自由主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = liberalismCard;
        gameState.all_card_instances[liberalismCard.instance_id] = liberalismCard;
        const testCard = createCardInstance(cardDefinitions['TestCard'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(testCard);

        let nextState = playCard(gameState, PlayerId.PLAYER1, testCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 51, "P1 consciousness should be 50 + 1");
    });

    // Test 4: Scale Increase Effect (Below Threshold)
    test('should not trigger choice when scale increases but does not exceed 25', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;
        const liberalismCard = createCardInstance(cardDefinitions['自由主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = liberalismCard;
        gameState.all_card_instances[liberalismCard.instance_id] = liberalismCard;

        gameState.effect_queue.push([{ effect_type: 'MODIFY_SCALE_RESERVE', args: { player_id: PlayerId.PLAYER1, amount: 5 } }, liberalismCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 25, "P1 scale should be 20 + 5");
        assert.strictEqual(finalState.awaiting_input, null, "Should not be awaiting input");
    });

    // Test 5: Scale Increase Effect (Exceeds Threshold)
    test('should trigger choice when scale increases and exceeds 25', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 24;
        const liberalismCard = createCardInstance(cardDefinitions['自由主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = liberalismCard;
        gameState.all_card_instances[liberalismCard.instance_id] = liberalismCard;

        // This will trigger the CARD_DRAWN_OWNER effect, increasing scale by 2
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw1'], PlayerId.PLAYER1));
        gameState.effect_queue.push([{ effect_type: 'MOVE_CARD', args: { card_id: 'draw_from_deck', source_pile: 'deck', destination_pile: 'hand', player_id: PlayerId.PLAYER1 } }, liberalismCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 26, "P1 scale should be 24 + 2");
        assert.notStrictEqual(finalState.awaiting_input, null, "Should be awaiting input");
        assert.strictEqual(finalState.awaiting_input.player_id, PlayerId.PLAYER1, "Awaiting input from P1");
        assert.deepStrictEqual(finalState.awaiting_input.options, ["ニューリベラリズム", "ネオリベラリズム", "リバタリアニズム"], "Should have correct choice options");
    });
});