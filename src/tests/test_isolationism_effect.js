
import { playCard, endTurn, resolveInput, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, EffectType, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions
const card_definitions_map = {
    "孤立主義": {
        "name": "孤立主義",
        "card_type": "イデオロギー",
        "required_scale": 15,
        "description": "自分が受ける意識の減少効果を-3。相手が受ける意識の減少効果を0にする。自分の場のすべての財が受けるダメージ-1。自分の意識が1以上の減少効果を受けるとき、自分の意識と規模を+10して、このカードを捨て札にする。",
        "triggers": {
            "MODIFY_CONSCIOUSNESS": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": { "player_id": "self", "amount": 10 },
                    "condition": { "target": "self", "check": "consciousness_decreased_by_opponent" }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": { "player_id": "self", "amount": 10 },
                    "condition": { "target": "self", "check": "consciousness_decreased_by_opponent" }
                },
                {
                    "effect_type": "MOVE_CARD",
                    "args": { "card_id": "self", "source_pile": "field", "destination_pile": "discard", "player_id": "self" },
                    "condition": { "target": "self", "check": "consciousness_decreased_by_opponent" }
                }
            ],
            "MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER": [
                {
                    "effect_type": "ADD_MODIFY_PARAMETER_CORRECTION",
                    "args": { "player_id": "self", "correct_target": "consciousness", "correct_direction": "decrease", "correct_type": "attenuation", "amount": 3 }
                }
            ],
            "MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT": [
                {
                    "effect_type": "ADD_MODIFY_PARAMETER_CORRECTION",
                    "args": { "player_id": "opponent", "correct_target": "consciousness", "correct_direction": "decrease", "correct_type": "limit", "amount": 0 }
                }
            ],
            [EffectType.MODIFY_CARD_DURABILITY_RESERVE]: [
                {
                    "effect_type": "ADD_MODIFY_PARAMETER_CORRECTION",
                    "args": { "player_id": "self", "correct_target": "wealth", "correct_direction": "decrease", "correct_type": "attenuation", "amount": 1 }
                }
            ]
        }
    },
    "攻撃カード": {
        "name": "攻撃カード",
        "card_type": "事象",
        "required_scale": 0,
        "triggers": {
            "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -5 } }]
        }
    },
    "財攻撃カード": {
        "name": "財攻撃カード",
        "card_type": "事象",
        "required_scale": 0,
        "triggers": {
            "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CARD_DURABILITY_RESERVE", "args": { "card_id": "target_card", "amount": -3 } }]
        }
    },
    "戦士": {
        "name": "戦士",
        "card_type": "財",
        "required_scale": 1,
        "durability": 5
    }
};

const createTestGameState = (p1Cards, p2Cards, p1Ideology, p2Ideology) => {
    const gameState = {
        players: {
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
        },
        current_turn: PlayerId.PLAYER1,
        turn_number: 1,
        effect_queue: [],
        awaiting_input: null,
        game_over: false,
        winner: null,
        cardDefs: card_definitions_map,
        all_card_instances: {},
        temp_effect_data: {},
        effects_to_skip: {},
    };

    const addCard = (player, cardName, location, card_definitions_map) => {
        const card = createCardInstance(card_definitions_map[cardName], player.id);
        gameState.all_card_instances[card.instance_id] = card;
        if (location === 'ideology') {
            player.ideology = card;
            card.location = 'field';
        } else {
            player[location].push(card);
            card.location = location;
        }
        return card;
    };

    p1Cards.forEach(c => addCard(gameState.players[PlayerId.PLAYER1], c.name, c.location, card_definitions_map));
    p2Cards.forEach(c => addCard(gameState.players[PlayerId.PLAYER2], c.name, c.location, card_definitions_map));
    if (p1Ideology) addCard(gameState.players[PlayerId.PLAYER1], p1Ideology, 'ideology', card_definitions_map);
    if (p2Ideology) addCard(gameState.players[PlayerId.PLAYER2], p2Ideology, 'ideology', card_definitions_map);
    
    return gameState;
};

describe('孤立主義 カード効果テスト', () => {
    let gameState;

    // Helper to create a customized attack card in the mock definitions
    const createAttackCard = (damage) => ({
        name: `攻撃カード-${damage}`,
        card_type: "事象",
        required_scale: 0,
        triggers: {
            "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -damage } }]
        }
    });

    card_definitions_map['攻撃カード-3'] = createAttackCard(3);
    card_definitions_map['攻撃カード-4'] = createAttackCard(4);

    test('3以下の意識ダメージは0に軽減され、自爆しない', () => {
        gameState = createTestGameState([], [{ name: '攻撃カード-3', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP1Consciousness = p1.consciousness;
        const initialP1Scale = p1.scale;
        const isolationismCard = p1.ideology;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        // Damage is reduced to 0 (3-3=0), so consciousness should not change
        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialP1Consciousness);
        // Self-destruct should not trigger
        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(initialP1Scale);
        expect(finalState.players[PlayerId.PLAYER1].ideology).not.toBeNull();
        const discardedCard = finalState.players[PlayerId.PLAYER1].discard.find(c => c.instance_id === isolationismCard.instance_id);
        expect(discardedCard).toBeFalsy();
    });

    test('4以上の意識ダメージは軽減され、その後自爆する', () => {
        gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP1Consciousness = p1.consciousness;
        const initialP1Scale = p1.scale;
        const isolationismCard = p1.ideology;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);
        
        // 1. Damage is attenuated to -1 (4-3=1)
        // 2. Self-destruct effect triggers: consciousness +10, scale +10
        const expectedConsciousness = initialP1Consciousness - 1 + 10;
        const expectedScale = initialP1Scale + 10;

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(expectedConsciousness);
        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(expectedScale);
        expect(finalState.players[PlayerId.PLAYER1].ideology).toBeNull();
        const discardedCard = finalState.players[PlayerId.PLAYER1].discard.find(c => c.instance_id === isolationismCard.instance_id);
        expect(discardedCard).toBeTruthy();
    });

    test('相手への意識ダメージが0になる', () => {
        gameState = createTestGameState([{ name: '攻撃カード-4', location: 'hand' }], [], '孤立主義', null);
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP2Consciousness = p2.consciousness;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, gameState.players[PlayerId.PLAYER1].hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER2].consciousness).toBe(initialP2Consciousness); // 4 -> 0
    });

    test('自分の場の財へのダメージが1軽減される', () => {
        gameState = createTestGameState(
            [{ name: '戦士', location: 'field' }],
            [{ name: '財攻撃カード', location: 'hand' }],
            '孤立主義',
            null
        );
        gameState.current_turn = PlayerId.PLAYER2;
        const p1Warrior = gameState.players[PlayerId.PLAYER1].field[0];
        const p2AttackCard = gameState.players[PlayerId.PLAYER2].hand[0];
        const initialDurability = p1Warrior.durability;

        // Manually set target for the attack card
        p2AttackCard.triggers.PLAY_EVENT_THIS[0].args.card_id = p1Warrior.instance_id;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2AttackCard.instance_id);
        let finalState = processEffects(stateAfterPlay);
        
        const finalWarrior = finalState.all_card_instances[p1Warrior.instance_id];
        expect(finalWarrior.current_durability).toBe(initialDurability - 2); // 3 - 1 = 2
    });
});
