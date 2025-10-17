const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard } = require('../gameLogic/main.js');

describe('分離主義 (Separatism) Card Effect', () => {
    const cardDefinitions = {
        "分離主義": {
            name: "分離主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 30,
            description: "配置時、自分の意識+15、自分の規模-50%、自分の場-1。自分の規模より高い必要規模を持つカードが手札に加わるたび、それを捨て札にして自分の意識を+1、カードを1枚引く。",
            triggers: {
                CARD_PLACED_THIS: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: 15 }
                    },
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: { player_id: "self", amount_percentage: -50, round_down: true }
                    },
                    {
                        effect_type: "MODIFY_FIELD_LIMIT",
                        args: { player_id: "self", amount: -1 }
                    }
                ],
                CARD_ADDED_TO_HAND_OWNER: [
                    {
                        effect_type: "PROCESS_CARD_OPERATION",
                        args: {
                            operation: "move_card",
                            target_card_id: "last_added_card",
                            destination_pile: "discard" // Corrected from 'destination'
                        }
                    },
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: 1 }
                    },
                    {
                        effect_type: "DRAW_CARD",
                        args: { player_id: "self" }
                    }
                ]
            }
        },
        "HighCostCard": { name: 'HighCostCard', required_scale: 50, card_type: CardType.EVENT },
        "CardToDraw": { name: 'CardToDraw', required_scale: 10, card_type: CardType.EVENT }
    };

    // Test 1: Placement Effects
    test('should apply placement effects correctly', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 100;
        p1.scale = 50;
        p1.field_limit = 5;
        p1.hand.push(createCardInstance(cardDefinitions['分離主義'], PlayerId.PLAYER1, { location: Location.HAND }));

        let nextState = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 115, "P1 consciousness should be 100 + 15");
        assert.strictEqual(finalP1.scale, 25, "P1 scale should be 50 * 0.5");
        assert.strictEqual(finalP1.field_limit, 4, "P1 field limit should be 5 - 1");
        assert.strictEqual(finalP1.ideology.name, '分離主義', "Separatism should be the ideology");
    });

    // Test 2: Reaction Effect
    test('should trigger reaction when a high-cost card is added to hand', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        
        // Setup player state
        p1.consciousness = 100;
        p1.scale = 40; // Player's scale is 40, high cost card is 50
        const separatismCard = createCardInstance(cardDefinitions['分離主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = separatismCard;
        gameState.all_card_instances[separatismCard.instance_id] = separatismCard;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw'], PlayerId.PLAYER1));

        // Add the ADD_CARD_TO_GAME effect to the queue as a [effect, sourceCard] tuple
        gameState.effect_queue.push([
            { // The effect object
                effect_type: 'ADD_CARD_TO_GAME',
                args: {
                    player_id: PlayerId.PLAYER1,
                    card_template_name: 'HighCostCard',
                    destination_pile: 'hand'
                }
            },
            null // The sourceCard, which is null in this test setup
        ]);

        // Process the effects
        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const highCostCardInDiscard = finalP1.discard.find(c => c.name === 'HighCostCard');

        assert.ok(highCostCardInDiscard, "HighCostCard should be in the discard pile");
        assert.strictEqual(finalP1.hand.find(c => c.name === 'HighCostCard'), undefined, "HighCostCard should not be in hand");
        assert.strictEqual(finalP1.consciousness, 101, "P1 consciousness should be 100 + 1");
        assert.strictEqual(finalP1.hand.length, 1, "Player should have drawn one card");
        assert.strictEqual(finalP1.hand[0].name, 'CardToDraw', "The drawn card should be CardToDraw");
        assert.strictEqual(finalP1.deck.length, 0, "Deck should be empty after drawing");
    });
});