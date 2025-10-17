const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

// Helper to find card definitions
const findCard = (name) => {
    return card_definitions_map[name];
};

// Helper to create a minimal game state for testing, based on successful tests like 'Deconstruction'
const createTestGameState = () => {
    return {
        players: {
            [PlayerId.PLAYER1]: {
                id: PlayerId.PLAYER1,
                name: 'Player 1',
                consciousness: INITIAL_CONSCIOUSNESS,
                scale: INITIAL_SCALE,
                field_limit: INITIAL_FIELD_LIMIT,
                deck: [],
                hand: [],
                field: [],
                discard: [],
                ideology: null,
                hand_capacity: MAX_HAND_SIZE,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            },
            [PlayerId.PLAYER2]: {
                id: PlayerId.PLAYER2,
                name: 'Player 2',
                consciousness: INITIAL_CONSCIOUSNESS,
                scale: INITIAL_SCALE,
                field_limit: INITIAL_FIELD_LIMIT,
                deck: [],
                hand: [],
                field: [],
                discard: [],
                ideology: null,
                hand_capacity: MAX_HAND_SIZE,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            }
        },
        current_turn: PlayerId.PLAYER1,
        phase: GamePhase.START_TURN,
        log: ["Game initialized for test."],
        effect_queue: [],
        awaiting_input: null,
        effects_to_skip: {},
        game_over: false,
        winner: null,
        temp_effect_data: {},
        all_card_instances: {},
        cardDefs: card_definitions_map,
    };
}

describe('啓蒙時代 (Enlightenment Era) Card Effect', () => {
    test('should discard all ideology cards from both fields and let the player choose one from deck or discard pile', () => {
        // 1. Setup
        let gameState = createTestGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        // --- Create Card Instances ---
        const p1IdeologyTemplate = findCard('理想主義');
        const p2IdeologyTemplate = findCard('物質主義');
        const p1DeckIdeologyTemplate = findCard('共同体主義');
        const p1DiscardIdeologyTemplate = findCard('現実主義');
        const enlightenmentEraTemplate = findCard('啓蒙時代');

        assert.ok(p1IdeologyTemplate, 'Card definition for "理想主義" not found');
        assert.ok(p2IdeologyTemplate, 'Card definition for "物質主義" not found');
        assert.ok(p1DeckIdeologyTemplate, 'Card definition for "共同体主義" not found');
        assert.ok(p1DiscardIdeologyTemplate, 'Card definition for "現実主義" not found');
        assert.ok(enlightenmentEraTemplate, 'Card definition for "啓蒙時代" not found');

        const p1FieldIdeology = { ...p1IdeologyTemplate, instance_id: 'p1-field-ideology-1', owner: PlayerId.PLAYER1, location: Location.FIELD };
        const p2FieldIdeology = { ...p2IdeologyTemplate, instance_id: 'p2-field-ideology-1', owner: PlayerId.PLAYER2, location: Location.FIELD };
        const p1DeckIdeology = { ...p1DeckIdeologyTemplate, instance_id: 'p1-deck-ideology-1', owner: PlayerId.PLAYER1, location: Location.DECK };
        const p1DiscardIdeology = { ...p1DiscardIdeologyTemplate, instance_id: 'p1-discard-ideology-1', owner: PlayerId.PLAYER1, location: Location.DISCARD };
        const enlightenmentEraCard = { ...enlightenmentEraTemplate, instance_id: 'p1-enlightenment-1', owner: PlayerId.PLAYER1, location: Location.HAND };

        // --- Populate Game State ---
        p1.ideology = p1FieldIdeology;
        p2.ideology = p2FieldIdeology;
        p1.deck.push(p1DeckIdeology);
        p1.discard.push(p1DiscardIdeology);
        p1.hand.push(enlightenmentEraCard);

        Object.values(p1).flat().concat(Object.values(p2).flat()).forEach(card => {
            if (card && card.instance_id) {
                gameState.all_card_instances[card.instance_id] = card;
            }
        });
        // Manually add cards from hand/deck/discard/field
        gameState.all_card_instances[p1FieldIdeology.instance_id] = p1FieldIdeology;
        gameState.all_card_instances[p2FieldIdeology.instance_id] = p2FieldIdeology;
        gameState.all_card_instances[p1DeckIdeology.instance_id] = p1DeckIdeology;
        gameState.all_card_instances[p1DiscardIdeology.instance_id] = p1DiscardIdeology;
        gameState.all_card_instances[enlightenmentEraCard.instance_id] = enlightenmentEraCard;


        p1.scale = 20; // Set scale to meet requirement

        // 2. Execution (Play the card)
        let nextState = playCard(gameState, PlayerId.PLAYER1, enlightenmentEraCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification (Part 1: Ideologies discarded)
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].field.some(c => c.card_type === CardType.IDEOLOGY), false, 'Player 1 field should not have ideology cards');
        assert.strictEqual(nextState.players[PlayerId.PLAYER2].field.some(c => c.card_type === CardType.IDEOLOGY), false, 'Player 2 field should not have ideology cards');
        assert.ok(nextState.players[PlayerId.PLAYER1].discard.some(c => c.instance_id === p1FieldIdeology.instance_id), 'Player 1 ideology card not in discard pile');
        assert.ok(nextState.players[PlayerId.PLAYER2].discard.some(c => c.instance_id === p2FieldIdeology.instance_id), 'Player 2 ideology card not in discard pile');

        // 4. Verification (Part 2: Awaiting input)
        assert.ok(nextState.awaiting_input, 'Game should be awaiting input');
        assert.strictEqual(nextState.awaiting_input.type, 'CHOICE_CARD_FROM_PILE', 'Awaiting input type is not CHOICE_CARD_FROM_PILE');
        assert.strictEqual(nextState.awaiting_input.player_id, PlayerId.PLAYER1, 'Awaiting input from wrong player');
        
        const choiceOptions = nextState.awaiting_input.options.map(c => c.instance_id);
        assert.ok(choiceOptions.includes(p1DeckIdeology.instance_id), 'Choice options should include the ideology from deck');
        assert.ok(choiceOptions.includes(p1DiscardIdeology.instance_id), 'Choice options should include the ideology originally in the discard');
        assert.ok(choiceOptions.includes(p1FieldIdeology.instance_id), 'Choice options should include the ideology moved from the field');       
        assert.strictEqual(choiceOptions.length, 3, 'Should have exactly three choices');

        // 5. Execution (Resolve input)
        // Player chooses the card from the deck
        let finalState = resolveInput(nextState, p1DeckIdeology);
        finalState = processEffects(finalState);

        // 6. Verification (Part 3: Card moved to hand)
        const p1FinalHand = finalState.players[PlayerId.PLAYER1].hand;
        const p1FinalDeck = finalState.players[PlayerId.PLAYER1].deck;

        assert.ok(p1FinalHand.some(c => c.instance_id === p1DeckIdeology.instance_id), 'Chosen ideology card was not added to hand');
        assert.strictEqual(p1FinalDeck.some(c => c.instance_id === p1DeckIdeology.instance_id), false, 'Chosen ideology card should not be in the deck anymore');
        assert.strictEqual(finalState.awaiting_input, null, 'Game should not be awaiting input after resolution');
    });
});
