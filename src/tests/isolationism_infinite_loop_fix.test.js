import { playCard } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, EffectType, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions for testing
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
    "攻撃カード-4": {
        "name": "攻撃カード-4",
        "card_type": "事象",
        "required_scale": 0,
        "triggers": {
            "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -4 } }]
        }
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

describe('孤立主義 無限ループ修正テスト', () => {
    let gameState;

    test('孤立主義の自爆効果が無限ループしない', () => {
        gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP1Consciousness = p1.consciousness;
        const initialP1Scale = p1.scale;
        const isolationismCard = p1.ideology;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        
        // This should complete without infinite loop
        let finalState;
        expect(() => {
            finalState = processEffects(stateAfterPlay);
        }).not.toThrow();
        
        // Expected: 4 damage reduced to 1, then +10 consciousness and +10 scale from self-destruct
        const expectedConsciousness = initialP1Consciousness - 1 + 10; // 50 - 1 + 10 = 59
        const expectedScale = initialP1Scale + 10; // 20 + 10 = 30

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(expectedConsciousness);
        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(expectedScale);
        expect(finalState.players[PlayerId.PLAYER1].ideology).toBeNull();
        
        // Verify the card was moved to discard pile
        const discardedCard = finalState.players[PlayerId.PLAYER1].discard.find(c => c.instance_id === isolationismCard.instance_id);
        expect(discardedCard).toBeTruthy();
    });

    test('孤立主義が捨て札に移動後は反応しない', () => {
        gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        // First attack triggers self-destruct
        let stateAfterFirstPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let stateAfterFirstEffects = processEffects(stateAfterFirstPlay);
        
        // Verify 孤立主義 is now in discard pile
        expect(stateAfterFirstEffects.players[PlayerId.PLAYER1].ideology).toBeNull();
        const discardedCard = stateAfterFirstEffects.players[PlayerId.PLAYER1].discard.find(c => c.name === '孤立主義');
        expect(discardedCard).toBeTruthy();
        expect(discardedCard.location).toBe('discard');

        // Add another attack card to test that discarded 孤立主義 doesn't react
        const secondAttackCard = createCardInstance(card_definitions_map['攻撃カード-4'], PlayerId.PLAYER2);
        stateAfterFirstEffects.all_card_instances[secondAttackCard.instance_id] = secondAttackCard;
        stateAfterFirstEffects.players[PlayerId.PLAYER2].hand.push(secondAttackCard);
        secondAttackCard.location = 'hand';

        const consciousnessBeforeSecondAttack = stateAfterFirstEffects.players[PlayerId.PLAYER1].consciousness;
        const scaleBeforeSecondAttack = stateAfterFirstEffects.players[PlayerId.PLAYER1].scale;

        // Second attack should not trigger any 孤立主義 effects
        let stateAfterSecondPlay = playCard(stateAfterFirstEffects, PlayerId.PLAYER2, secondAttackCard.instance_id);
        let finalState = processEffects(stateAfterSecondPlay);

        // Should take full damage (no 孤立主義 protection)
        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(consciousnessBeforeSecondAttack - 4);
        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(scaleBeforeSecondAttack); // No scale bonus
        
        // 孤立主義 should still be in discard pile, not moved again
        expect(finalState.players[PlayerId.PLAYER1].ideology).toBeNull();
        const stillDiscardedCard = finalState.players[PlayerId.PLAYER1].discard.find(c => c.name === '孤立主義');
        expect(stillDiscardedCard).toBeTruthy();
    });
});