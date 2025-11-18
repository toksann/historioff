import { playCard } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, EffectType, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions for debugging
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
                    "args": { "player_id": "self", "amount": 10 }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": { "player_id": "self", "amount": 10 }
                },
                {
                    "effect_type": "MOVE_CARD",
                    "args": { "card_id": "self", "source_pile": "field", "destination_pile": "discard", "player_id": "self" }
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

describe('孤立主義 デバッグテスト', () => {
    test('孤立主義の無限ループをデバッグ', () => {
        console.log('=== 孤立主義デバッグテスト開始 ===');
        
        const gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        
        console.log('初期状態:', {
            p1_consciousness: p1.consciousness,
            p1_scale: p1.scale,
            p1_ideology: p1.ideology?.name
        });

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        console.log('カードプレイ後、エフェクト処理前:', {
            effect_queue_length: stateAfterPlay.effect_queue.length
        });
        
        // Process effects with limited iterations to prevent infinite loop in test
        let iterations = 0;
        const maxIterations = 50;
        let currentState = stateAfterPlay;
        
        while (currentState.effect_queue.length > 0 && iterations < maxIterations) {
            iterations++;
            console.log(`=== エフェクト処理 ${iterations} 回目 ===`);
            console.log('キューの長さ:', currentState.effect_queue.length);
            
            const nextEffect = currentState.effect_queue[0];
            console.log('次のエフェクト:', nextEffect[0].effect_type, nextEffect[0].args);
            
            currentState = processEffects(currentState);
            
            console.log('処理後の状態:', {
                p1_consciousness: currentState.players[PlayerId.PLAYER1].consciousness,
                p1_scale: currentState.players[PlayerId.PLAYER1].scale,
                p1_ideology: currentState.players[PlayerId.PLAYER1].ideology?.name,
                queue_length: currentState.effect_queue.length
            });
            
            if (iterations >= maxIterations) {
                console.log('⚠️ 最大反復回数に達しました - 無限ループの可能性');
                break;
            }
        }
        
        console.log('=== 最終結果 ===');
        console.log('反復回数:', iterations);
        console.log('最終状態:', {
            p1_consciousness: currentState.players[PlayerId.PLAYER1].consciousness,
            p1_scale: currentState.players[PlayerId.PLAYER1].scale,
            p1_ideology: currentState.players[PlayerId.PLAYER1].ideology?.name
        });
        
        // Test should not reach max iterations (indicating infinite loop)
        expect(iterations).toBeLessThan(maxIterations);
    });
});