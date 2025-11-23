const { PlayerId, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');

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
        game_log: ["Game initialized for test."],
        animation_queue: [],
        effect_queue: [],
        awaiting_input: null,
        effects_to_skip: {}, 
        game_over: false,
        winner: null,
        temp_effect_data: {}, 
        all_card_instances: {},
        cardDefs: cardDefs,
        processing_status: {
            is_processing_turn_end: false,
            effects_remaining: 0,
            awaiting_input_for: null,
            pending_turn_transition: false
        },
    };

    // Helper to create and register cards within this gameState
    gameState.addCardToGameState = (cardTemplate, ownerId, overrides = {}) => {
        const newCard = createCardInstance(cardTemplate, ownerId, overrides);
        gameState.all_card_instances[newCard.instance_id] = newCard;
        return newCard;
    };

    return gameState;
}

const simpleCard = (name, required_scale, durability, effects, triggerType, card_type = '財') => {
    const cardTemplate = {
        name: name,
        card_type: card_type,
        required_scale: required_scale,
        durability: durability,
        triggers: {
            [triggerType]: effects
        }
    };
    return cardTemplate;
};

const processAllEffects = (gameState) => {
    let newState = gameState;
    let safetyBreak = 0;
    while ((newState.effect_queue.length > 0 || (newState.delayedEffects && newState.delayedEffects.length > 0)) && safetyBreak < 100) {
        if (newState.delayedEffects && newState.delayedEffects.length > 0) {
            newState.effect_queue.unshift(...newState.delayedEffects);
            newState.delayedEffects = [];
        }
        newState = processEffects(newState);
        safetyBreak++;
    }
    return newState;
};

module.exports = { createCardInstance, createTestGameState, simpleCard, processAllEffects };