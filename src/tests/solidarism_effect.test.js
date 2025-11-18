const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard, startTurn } = require('../gameLogic/main.js');

describe('結束主義 (Solidarism) Card Effect', () => {

    const cardDefinitions = {
        "結束主義": {
            name: "結束主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 0,
            description: "配置時、自分の規模を1にする。さらに捨て札すべてを除外し、除外した枚数と同じだけ意識をプラスする。ターン開始時、財が場の上限枚数未満なら「戦士」を1枚手札に加える。相手の意識が減少するたびカードを1枚引き、自分の規模+3。",
            triggers: {
                [TriggerType.CARD_PLACED_THIS]: [
                    { effect_type: EffectType.SET_SCALE, args: { player_id: "self", amount: 1 } },
                    {
                        effect_type: EffectType.PROCESS_CARD_OPERATION,
                        args: {
                            player_id: "self",
                            operation: "remove",
                            source_pile: "discard",
                            selection_method: "all",
                            store_count_key: "removed_discard_count"
                        }
                    },
                    {
                        effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
                        args: {
                            player_id: "self",
                            amount_based_on_temp_value: "removed_discard_count"
                        }
                    }
                ],
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: EffectType.ADD_CARD_TO_GAME,
                        args: {
                            player_id: "self",
                            card_template_name: "戦士",
                            destination_pile: "hand",
                            condition_field_wealth_limit: 0
                        }
                    }
                ],
                [TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT]: [
                    { effect_type: EffectType.MOVE_CARD, args: { card_id: "draw_from_deck", source_pile: "deck", destination_pile: "hand", player_id: "self" } },
                    { effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: "self", amount: 3 } }
                ]
            }
        },
        "戦士": { name: "戦士", card_type: CardType.WEALTH, durability: 1, required_scale: 0 },
        "農民": { name: "農民", card_type: CardType.WEALTH, durability: 1, required_scale: 0 },
        "ダミー事象": { name: "ダミー事象", card_type: CardType.EVENT, required_scale: 0 },
    };

    test('should set scale to 1, remove discard pile, and gain consciousness on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;
        p1.scale = 50; // Set a high scale initially

        // Add 3 cards to discard pile
        p1.discard.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['戦士'], PlayerId.PLAYER1));
        const discardCount = p1.discard.length;

        const solidarismCard = createCardInstance(cardDefinitions['結束主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(solidarismCard);

        let nextState = playCard(gameState, PlayerId.PLAYER1, solidarismCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 1, "Player scale should be set to 1");
        assert.strictEqual(finalP1.discard.length, 0, "Discard pile should be empty");
        assert.strictEqual(finalP1.consciousness, initialConsciousness + discardCount, `Consciousness should be increased by ${discardCount}`);
    });

    test('should add a Warrior card at start of turn if field is not full', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.field_limit = 7;
        p1.field = Array(6).fill(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));

        const solidarismCard = createCardInstance(cardDefinitions['結束主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = solidarismCard;

        const initialHandSize = p1.hand.length;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const warriorInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === '戦士');
        assert.ok(warriorInHand, 'Should have a Warrior card in hand');
    });

    test('should NOT add a Warrior card at start of turn if field is full', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.field_limit = 7;
        p1.field = Array(7).fill(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));

        const solidarismCard = createCardInstance(cardDefinitions['結束主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = solidarismCard;

        const initialHandSize = p1.hand.length;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const warriorInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === '戦士');
        assert.strictEqual(warriorInHand, undefined, 'Should NOT have a Warrior card in hand');
    });

    test('should draw a card and gain scale when opponent consciousness decreases', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.deck.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1)); // Card to draw

        const solidarismCard = createCardInstance(cardDefinitions['結束主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = solidarismCard;

        const initialHandSize = p1.hand.length;
        const initialScale = p1.scale;

        // Manually queue an effect to decrease opponent's consciousness
        gameState.effect_queue.push([{
            effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
            args: { player_id: PlayerId.PLAYER2, amount: -5 }
        }, null]);

        let finalState = gameState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, initialHandSize + 1, "Hand size should increase by 1");
        assert.strictEqual(finalP1.scale, initialScale + 3, "Scale should increase by 3");
    });
});