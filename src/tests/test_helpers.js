const { PlayerId, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE } = require('../gameLogic/constants');

let cardInstanceCounter = 0;

const createCardInstance = (cardTemplate, ownerId, overrides = {}) => {
    if (!cardTemplate) {
        console.error("createCardInstance received undefined cardTemplate. OwnerId:", ownerId);
        return {
            instance_id: `error-instance-${cardInstanceCounter++}`,
            name: 'Error - Undefined Template',
            card_type: 'Error',
            owner: ownerId,
            location: 'limbo',
            ...overrides,
        };
    }
    return {
        ...cardTemplate,
        instance_id: `${cardTemplate.name.replace(/\s/g, '_')}-${cardInstanceCounter++}`,
        owner: ownerId,
        durability: cardTemplate.durability,
        location: null,
        ...overrides,
    };
};

const createTestGameState = (cardDefs) => {
    cardInstanceCounter = 0; // Reset counter for each test run
    const gameState = {
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
        cardDefs: cardDefs,
    };

    // Helper to create and register cards within this gameState
    gameState.addCardToGameState = (cardTemplate, ownerId, overrides = {}) => {
        const newCard = createCardInstance(cardTemplate, ownerId, overrides);
        gameState.all_card_instances[newCard.instance_id] = newCard;
        return newCard;
    };

    return gameState;
}

module.exports = { createCardInstance, createTestGameState };