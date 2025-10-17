const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard } = require('../gameLogic/main.js');

describe('Mutual Assured Destruction Effects', () => {
    const cardDefinitions = {
        "相互確証破壊": {
            name: "相互確証破壊",
            card_type: CardType.EVENT,
            required_scale: 50,
            is_token: true,
            triggers: {
                [TriggerType.PLAY_EVENT_THIS]: [
                    { effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: "self", card_template_name: "確証破壊能力", destination_pile: "deck", position: "random" } },
                    { effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: "opponent", card_template_name: "確証破壊能力", destination_pile: "deck", position: "random" } },
                ]
            }
        },
        "確証破壊能力": {
            name: "確証破壊能力",
            card_type: CardType.EVENT,
            required_scale: 100,
            is_token: true,
            triggers: {
                [TriggerType.PLAY_EVENT_THIS]: [
                    { effect_type: EffectType.PROCESS_EXPOSE_CARD_BY_TYPE, args: { player_id: "opponent", source_piles: ["hand"], count: 1, card_name: "確証破壊能力" } }
                ],
                [TriggerType.FAILED_PROCESS]: [
                    { effect_type: EffectType.SET_CONSCIOUSNESS, args: { player_id: "opponent", amount: 0 } }
                ],
                [TriggerType.SUCCESS_PROCESS]: [
                    { effect_type: EffectType.MOVE_CARD, args: { player_id: "opponent", card_id: "target", source_pile: "hand", destination_pile: "discard" } },
                    { effect_type: EffectType.PROCESS_CARD_OPERATION, args: { player_id: "self", operation: "move", source_piles: ["field", "ideology"], destination_pile: "discard", selection_method: "all" } },
                    { effect_type: EffectType.PROCESS_CARD_OPERATION, args: { player_id: "opponent", operation: "move", source_piles: ["field", "ideology"], destination_pile: "discard", selection_method: "all" } },
                    { effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, args: { player_id: "self", amount_percentage: -90, round_down: true } },
                    { effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: "self", amount_percentage: -90, round_down: true } },
                    { effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, args: { player_id: "opponent", amount_percentage: -90, round_down: true } },
                    { effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: "opponent", amount_percentage: -90, round_down: true } },
                ]
            }
        },
        "TestIdeology": { name: "TestIdeology", card_type: CardType.IDEOLOGY },
        "TestWealth": { name: "TestWealth", card_type: CardType.WEALTH, durability: 1 },
    };

    test('相互確証破壊 (Mutual Assured Destruction) should add cards to both decks', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 50;
        const cardToPlay = createCardInstance(cardDefinitions['相互確証破壊'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER1].deck.some(c => c.name === '確証破壊能力'), true, "P1 deck should contain Assured Destruction Capability");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].deck.some(c => c.name === '確証破壊能力'), true, "P2 deck should contain Assured Destruction Capability");
    });

    test('確証破壊能力 (Assured Destruction Capability) - Opponent does NOT have it', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 100;
        p2.consciousness = 100;
        const cardToPlay = createCardInstance(cardDefinitions['確証破壊能力'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, 0, "Opponent consciousness should be 0");
    });

    test('確証破壊能力 (Assured Destruction Capability) - Opponent HAS it', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 100;
        p1.consciousness = 100;
        p2.scale = 100;
        p2.consciousness = 100;

        // Add cards to field for both players
        p1.field.push(createCardInstance(cardDefinitions['TestWealth'], PlayerId.PLAYER1));
        p2.ideology = createCardInstance(cardDefinitions['TestIdeology'], PlayerId.PLAYER2);

        const cardToPlay = createCardInstance(cardDefinitions['確証破壊能力'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);
        const opponentCard = createCardInstance(cardDefinitions['確証破壊能力'], PlayerId.PLAYER2, { location: Location.HAND });
        p2.hand.push(opponentCard);
        // Manually add to all_card_instances for the PROCESS_EXPOSE_CARD_BY_TYPE to find it
        gameState.all_card_instances[opponentCard.instance_id] = opponentCard;

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];

        assert.strictEqual(finalP2.consciousness, 10, "Opponent consciousness should be 100 * 0.1 = 10");
        assert.strictEqual(finalP1.consciousness, 10, "Player1 consciousness should be 100 * 0.1 = 10");
        assert.strictEqual(finalP2.scale, 10, "Opponent scale should be 100 * 0.1 = 10");
        assert.strictEqual(finalP1.scale, 10, "Player1 scale should be 100 * 0.1 = 10");

        assert.strictEqual(finalP1.field.length, 0, "Player 1 field should be empty");
        assert.strictEqual(finalP2.ideology, null, "Player 2 ideology should be gone");
        assert(finalP2.discard.some(c => c.instance_id === opponentCard.instance_id), "Opponent's AD Capability should be in their discard pile");
    });
});
