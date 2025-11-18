const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE } = require('../gameLogic/constants');

// Helper to create a minimal game state for testing
const createTestGameState = (cardDefs) => {
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
        cardDefs: cardDefs,
    };
}

describe('資源の発見 (Discovery of Resources) Card Effect', () => {
    const cardDefinitions = {
        "資源の発見": {
            "name": "資源の発見",
            "card_type": "事象",
            "required_scale": 0,
            "description": "「資源」を自分か相手の場にランダムに出す。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "random",
                            "card_template_name": "資源",
                            "destination_pile": "field"
                        }
                    }
                ]
            }
        },
        "資源": { "name": "資源", "card_type": "財", "is_token": true, "durability": 30 },
    };

    test('should randomly place a Resource card on either player\'s field', () => {
        const iterations = 100;
        let p1_counts = 0;
        let p2_counts = 0;

        for (let i = 0; i < iterations; i++) {
            // 1. Setup for each iteration
            let gameState = createTestGameState(cardDefinitions);
            const p1 = gameState.players[PlayerId.PLAYER1];

            const discoveryCard = { ...cardDefinitions['資源の発見'], instance_id: `discovery-${i}`, owner: PlayerId.PLAYER1, location: Location.HAND };
            p1.hand.push(discoveryCard);
            gameState.all_card_instances[discoveryCard.instance_id] = discoveryCard;

            // 2. Execution
            let nextState = playCard(gameState, PlayerId.PLAYER1, discoveryCard.instance_id);
            nextState = processEffects(nextState);

            // 3. Verification for each iteration
            const p1_resource = nextState.players[PlayerId.PLAYER1].field.find(c => c.name === '資源');
            const p2_resource = nextState.players[PlayerId.PLAYER2].field.find(c => c.name === '資源');

            const p1_has_resource = !!p1_resource;
            const p2_has_resource = !!p2_resource;

            assert.ok(p1_has_resource || p2_has_resource, `Iteration ${i}: No resource card was created.`);
            assert.ok(p1_has_resource !== p2_has_resource, `Iteration ${i}: Resource card created on both or neither field.`);

            if (p1_has_resource) {
                p1_counts++;
            } else if (p2_has_resource) {
                p2_counts++;
            }
        }

        // Final verification: check if distribution is random enough
        assert.ok(p1_counts > 0, 'Player 1 never received the resource card.');
        assert.ok(p2_counts > 0, 'Player 2 never received the resource card.');
        assert.strictEqual(p1_counts + p2_counts, iterations, 'Total counts do not match iterations.');

        console.log(`Distribution over ${iterations} iterations: Player 1: ${p1_counts}, Player 2: ${p2_counts}`);
    });
});
