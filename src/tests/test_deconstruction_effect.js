const assert = require('assert');
const { initializeGame, playCard, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

// Helper to find card definitions more reliably
const findCard = (name) => {
    if (name === '解体') {
        return card_definitions_array.find(c => c.name === '解体' && c.description.includes('4ダメージ'));
    }
    for (const key in card_definitions_map) {
        if (card_definitions_map[key].name === name) {
            return card_definitions_map[key];
        }
    }
    return null;
};

// Helper to create a minimal game state for testing
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

describe('Deconstruction Card Effect', () => {
    test('should deal 4 damage to a friendly wealth card and add one "Money" card to hand', () => {
        // 1. Setup
        let gameState = createTestGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        
        const peasantTemplate = findCard('農民');
        assert.ok(peasantTemplate, 'Card definition for "Peasant" not found');
        const peasantCard = { ...peasantTemplate, instance_id: 'p1-peasant-1', owner: PlayerId.PLAYER1, location: Location.FIELD, current_durability: 5 };
        p1.field.push(peasantCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;

        const deconstructionTemplate = findCard('解体');
        assert.ok(deconstructionTemplate, 'Card definition for "Deconstruction" not found');
        const deconstructionCard = { ...deconstructionTemplate, instance_id: 'p1-deconstruction-1', owner: PlayerId.PLAYER1, location: Location.HAND };
        p1.hand.push(deconstructionCard);
        gameState.all_card_instances[deconstructionCard.instance_id] = deconstructionCard;

        p1.scale = 2;

        const initial_peasant_durability = peasantCard.current_durability;
        console.log(`  Initial state: Peasant durability=${initial_peasant_durability}`);

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, deconstructionCard.instance_id);
        nextState = processEffects(nextState);

        assert.ok(nextState.awaiting_input, 'Game is not awaiting input');
        assert.strictEqual(nextState.awaiting_input.type, 'CHOICE_CARDS_FOR_OPERATION', 'Awaiting input type is not CHOICE_CARDS_FOR_OPERATION');
        
        const choice = nextState.awaiting_input.options.find(opt => opt.instance_id === peasantCard.instance_id);
        assert.ok(choice, 'Choice option for Peasant card not found');

        nextState = resolveInput(nextState, [choice.instance_id]);
        let finalState = processEffects(nextState);

        // 3. Verification
        const final_peasant = finalState.players[PlayerId.PLAYER1].field.find(c => c.instance_id === peasantCard.instance_id);
        const moneyCardInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');

        console.log(`  Final state: Peasant durability=${final_peasant ? final_peasant.current_durability : 'destroyed'}`);

        assert.ok(final_peasant, 'Peasant card is not on the field');
        assert.strictEqual(final_peasant.current_durability, initial_peasant_durability - 4, 'Peasant durability did not decrease by 4');
        assert.ok(moneyCardInHand, '"Money" card was not added to hand');
    });
});