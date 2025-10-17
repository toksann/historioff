const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, GamePhase, INITIAL_CONSCIOUSNESS, INITIAL_SCALE, INITIAL_FIELD_LIMIT, MAX_HAND_SIZE, EffectType } = require('../gameLogic/constants');

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

describe('資源 (Resource) Card Effect', () => {
    test('should give a Money card to the attacker when damaged', () => {
        // 1. Setup
        const cardDefinitions = {
            "資源": {
                "name": "資源",
                "card_type": "財",
                "required_scale": 40,
                "durability": 30,
                "description": "これの耐久値が減るたび、耐久値を減らした側が減少量と同じ耐久値の「マネー」を1枚手札に加える。",
                "triggers": {
                    "DAMAGE_THIS": [
                        {
                            "effect_type": "ADD_CARD_TO_GAME",
                            "args": {
                                "player_id": "source",
                                "card_template_name": "マネー",
                                "destination_pile": "hand",
                                "initial_durability": "damage_this"
                            }
                        }
                    ]
                },
                "is_token": true
            },
            "マネー": { "name": "マネー", "card_type": "財", "is_token": true },
            "攻撃カード": { "name": "攻撃カード", "card_type": "事象" },
        };

        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        const resourceCard = { ...cardDefinitions['資源'], instance_id: 'p1-resource-1', owner: PlayerId.PLAYER1, location: Location.FIELD, current_durability: 30 };
        const attackerCard = { ...cardDefinitions['攻撃カード'], instance_id: 'p2-attacker-1', owner: PlayerId.PLAYER2, location: Location.HAND };

        p1.field.push(resourceCard);
        p2.hand.push(attackerCard);

        gameState.all_card_instances[resourceCard.instance_id] = resourceCard;
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        // 2. Execution
        // Simulate Player 2 dealing 5 damage to the Resource card
        const damageAmount = -5;
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: resourceCard.instance_id,
                amount: damageAmount,
                source_card_id: attackerCard.instance_id // Attacker is the source
            }
        };

        gameState.effect_queue.push([damageEffect, attackerCard]);
        let nextState = processEffects(gameState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const p2Final = nextState.players[PlayerId.PLAYER2];

        // Verify resource card's durability
        const resourceOnField = p1Final.field.find(c => c.instance_id === resourceCard.instance_id);
        assert.strictEqual(resourceOnField.current_durability, 25, 'Resource durability should be reduced by 5');

        // Verify Player 2 (attacker) gets a Money card
        const moneyCardInP2Hand = p2Final.hand.find(c => c.name === 'マネー');
        assert.ok(moneyCardInP2Hand, 'Player 2 should have received a Money card');
        assert.strictEqual(moneyCardInP2Hand.current_durability, Math.abs(damageAmount), 'Money card should have durability equal to the damage dealt');

        // Verify Player 1 (owner) did not get a Money card
        const moneyCardInP1Hand = p1Final.hand.find(c => c.name === 'マネー');
        assert.strictEqual(moneyCardInP1Hand, undefined, 'Player 1 should not have received a Money card');
    });
});
