const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('啓蒙時代 (Enlightenment Era) Card Effect', () => {
    const cardDefinitions = {
        "啓蒙時代": {
            "name": "啓蒙時代",
            "card_type": "事象",
            "required_scale": 15,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "self_ideology", "source_pile": "field", "destination_pile": "discard", "player_id": "self" } },
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "opponent_ideology", "source_pile": "field", "destination_pile": "discard", "player_id": "opponent", "target_player_id": "opponent" } },
                    { "effect_type": "PROCESS_CHOOSE_AND_MOVE_CARD_FROM_PILE", "args": { "player_id": "self", "card_type": "イデオロギー", "source_piles": ["discard", "deck"], "destination_pile": "hand" } }
                ]
            }
        },
        "理想主義": { "name": "理想主義", "card_type": "イデオロギー" },
        "物質主義": { "name": "物質主義", "card_type": "イデオロギー" },
        "共同体主義": { "name": "共同体主義", "card_type": "イデオロギー" },
        "現実主義": { "name": "現実主義", "card_type": "イデオロギー" }
    };

    test('should discard ideologies and let player choose a new one', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        const p1FieldIdeology = createCardInstance(cardDefinitions['理想主義'], p1.id, { location: Location.IDEOLOGY });
        const p2FieldIdeology = createCardInstance(cardDefinitions['物質主義'], p2.id, { location: Location.IDEOLOGY });
        const p1DeckIdeology = createCardInstance(cardDefinitions['共同体主義'], p1.id);
        const p1DiscardIdeology = createCardInstance(cardDefinitions['現実主義'], p1.id, { location: Location.DISCARD });
        const enlightenmentEraCard = createCardInstance(cardDefinitions['啓蒙時代'], p1.id);

        p1.ideology = p1FieldIdeology;
        p2.ideology = p2FieldIdeology;
        p1.deck.push(p1DeckIdeology);
        p1.discard.push(p1DiscardIdeology);
        p1.hand.push(enlightenmentEraCard);
        p1.scale = 20;
        Object.values(gameState.players).forEach(p => {
            if(p.ideology) gameState.all_card_instances[p.ideology.instance_id] = p.ideology;
            p.deck.forEach(c => gameState.all_card_instances[c.instance_id] = c);
            p.discard.forEach(c => gameState.all_card_instances[c.instance_id] = c);
            p.hand.forEach(c => gameState.all_card_instances[c.instance_id] = c);
        });

        // 2. Execution (Play the card)
        let newState = playCard(gameState, PlayerId.PLAYER1, enlightenmentEraCard.instance_id);
        while (newState.effect_queue.length > 0 && !newState.awaiting_input) {
            newState = processEffects(newState);
        }

        // 3. Verification (Part 1: Ideologies discarded)
        assert.strictEqual(newState.players[PlayerId.PLAYER1].ideology, null, 'Player 1 ideology should be null');
        assert.strictEqual(newState.players[PlayerId.PLAYER2].ideology, null, 'Player 2 ideology should be null');
        assert.ok(newState.players[PlayerId.PLAYER1].discard.some(c => c.instance_id === p1FieldIdeology.instance_id), 'P1 ideology not in discard');
        assert.ok(newState.players[PlayerId.PLAYER2].discard.some(c => c.instance_id === p2FieldIdeology.instance_id), 'P2 ideology not in discard');

        // 4. Verification (Part 2: Awaiting input)
        assert.ok(newState.awaiting_input, 'Game should be awaiting input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARD_FROM_PILE', 'Input type is not CHOICE_CARD_FROM_PILE');
        
        const choiceOptions = newState.awaiting_input.options.map(c => c.instance_id);
        assert.ok(choiceOptions.includes(p1DeckIdeology.instance_id), 'Choice should include ideology from deck');
        assert.ok(choiceOptions.includes(p1DiscardIdeology.instance_id), 'Choice should include ideology from discard');
        assert.ok(choiceOptions.includes(p1FieldIdeology.instance_id), 'Choice should include the ideology moved from the field');

        // 5. Execution (Resolve input)
        let finalState = resolveInput(newState, p1DeckIdeology);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 6. Verification (Part 3: Card moved to hand)
        assert.ok(finalState.players[PlayerId.PLAYER1].hand.some(c => c.instance_id === p1DeckIdeology.instance_id), 'Chosen card was not added to hand');
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].deck.some(c => c.instance_id === p1DeckIdeology.instance_id), false, 'Chosen card should not be in deck');
    });
});
