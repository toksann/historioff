const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard, startTurn, resolveInput } = require('../gameLogic/main.js');

describe('ポピュリズム (Populism) Card Effect', () => {
    const cardDefinitions = {
        "ポピュリズム": {
            name: "ポピュリズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 70,
            is_token: true,
            triggers: {
                [TriggerType.START_TURN_OWNER]: [
                    { effect_type: "MOVE_CARD", args: { card_id: "self", source_pile: "current", destination_pile: "field", player_id: "self" } }
                ],
                [TriggerType.CARD_PLACED_THIS]: [
                    { effect_type: "ADD_CARD_TO_GAME", args: { player_id: "self", card_template_name: "マネー", destination_pile: "hand", initial_durability_based_on_scale: true, min_durability: 1 } },
                    { effect_type: "SET_SCALE", args: { player_id: "self", amount: 0 } },
                    { effect_type: "ADD_CARD_TO_GAME", args: { player_id: "self", card_template_name: "ウルトラナショナリズム", destination_pile: "discard" } },
                    { effect_type: "PROCESS_CHOOSE_AND_MOVE_CARD_FROM_PILE", args: { player_id: "self", card_type: CardType.IDEOLOGY, source_piles: ["discard"], destination_pile: "deck", position: "top" } }
                ],
                [TriggerType.PLAYER_PLAY_CARD_ACTION]: [
                    { effect_type: "MODIFY_CONSCIOUSNESS_RESERVE", args: { player_id: "self", amount: 2 } },
                    { effect_type: "MOVE_CARD", args: { card_id: "draw_from_deck", source_pile: "deck", destination_pile: "hand", player_id: "self" } }
                ],
                [TriggerType.CARD_DISCARDED_THIS]: [
                    { effect_type: "MODIFY_CONSCIOUSNESS_RESERVE", args: { player_id: "self", amount: 5 } }
                ]
            }
        },
        "マネー": { name: "マネー", card_type: CardType.WEALTH, is_token: true },
        "ウルトラナショナリズム": { name: "ウルトラナショナリズム", card_type: CardType.IDEOLOGY, is_token: true },
        "TestIdeology": { name: "TestIdeology", card_type: CardType.IDEOLOGY },
        "TestCard": { name: 'TestCard', required_scale: 1, card_type: CardType.EVENT },
        "CardToDraw": { name: 'CardToDraw', card_type: CardType.EVENT },
    };

    test('Auto-placement effect (conditions met)', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 5;
        p1.ideology = null;
        const populismCard = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(populismCard);
        gameState.all_card_instances[populismCard.instance_id] = populismCard;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        
        assert(nextState.players[PlayerId.PLAYER1].ideology?.name === 'ポピュリズム', "Populism should be placed on the field");
    });

    test('Auto-placement effect (consciousness too high)', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 6;
        p1.ideology = null;
        const populismCard = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(populismCard);
        gameState.all_card_instances[populismCard.instance_id] = populismCard;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);

        assert.strictEqual(nextState.players[PlayerId.PLAYER1].ideology, null, "Populism should not be placed");
    });

    test('Auto-placement effect (condition not met - populism already exists)', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 5;
        // Set Populism as the ideology
        const existingPopulism = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = existingPopulism;
        gameState.all_card_instances[existingPopulism.instance_id] = existingPopulism;

        // Have another Populism in hand
        const populismInHand = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(populismInHand);
        gameState.all_card_instances[populismInHand.instance_id] = populismInHand;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);

        // The ideology should remain the original one
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].ideology.instance_id, existingPopulism.instance_id, "Populism should not be replaced");
        // The one in hand should not be played
        assert(nextState.players[PlayerId.PLAYER1].hand.some(c => c.instance_id === populismInHand.instance_id), "Populism in hand should remain in hand");
    });

    test('Card play effect', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const ideologyCard = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = ideologyCard;
        gameState.all_card_instances[ideologyCard.instance_id] = ideologyCard;

        p1.consciousness = 50;
        p1.deck.push(createCardInstance(cardDefinitions['CardToDraw'], PlayerId.PLAYER1));
        const cardToPlay = createCardInstance(cardDefinitions['TestCard'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(cardToPlay);
        const initialHandSize = p1.hand.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, cardToPlay.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 52, "P1 consciousness should be 50 + 2");
        assert.strictEqual(finalP1.hand.length, initialHandSize, "Hand size should be same after playing 1 and drawing 1");
    });

    test('Discard effect', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.consciousness = 50;
        const populismCard = createCardInstance(cardDefinitions['ポピュリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = populismCard;
        gameState.all_card_instances[populismCard.instance_id] = populismCard;

        // Manually trigger discard effect
        gameState.effect_queue.push([{ effect_type: EffectType.MOVE_CARD, args: { player_id: PlayerId.PLAYER1, card_id: populismCard.instance_id, source_pile: 'field', destination_pile: 'discard' } }, populismCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, 55, "P1 consciousness should be 50 + 5");
    });
});
