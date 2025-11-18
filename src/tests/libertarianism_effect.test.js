
import { playCard, startTurn, endTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions
const card_definitions_map = {
    "リバタリアニズム": {
        "name": "リバタリアニズム",
        "card_type": "イデオロギー",
        "required_scale": 25,
        "description": "自分の意識も規模も増えなくなる。カードを出すたび「マネー」を手札に加える。ターン開始時、自分の場にある「マネー」の耐久値を-70%か+100%する。",
        "triggers": {
            "PLAYER_PLAY_CARD_ACTION": [
                {
                    "effect_type": "ADD_CARD_TO_GAME",
                    "args": {
                        "player_id": "self",
                        "card_template_name": "マネー",
                        "destination_pile": "hand",
                        "initial_durability": 1
                    }
                }
            ],
            "START_TURN_OWNER": [
                {
                    "effect_type": "PROCESS_MODIFY_MONEY_DURABILITY_RANDOM",
                    "args": {
                        "player_id": "self",
                        "change_type": "percent_decrease_or_percent_increase",
                        "value1": 70,
                        "value2": 100
                    }
                }
            ],
            "MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER": [
                {
                    "effect_type": "ADD_MODIFY_PARAMETER_CORRECTION",
                    "args": {
                        "player_id": "self",
                        "correct_target": "consciousness",
                        "correct_direction": "increase",
                        "correct_type": "limit",
                        "amount": 0
                    }
                }
            ],
            "MODIFY_SCALE_INCREASE_RESERVE_OWNER": [
                {
                    "effect_type": "ADD_MODIFY_PARAMETER_CORRECTION",
                    "args": {
                        "player_id": "self",
                        "correct_target": "scale",
                        "correct_direction": "increase",
                        "correct_type": "limit",
                        "amount": 0
                    }
                }
            ]
        },
        "is_token": true
    },
    "マネー": {
        "name": "マネー",
        "card_type": "財",
        "required_scale": 0,
        "durability": 10, // Test with a base durability
        "is_token": true
    },
    "豊作": {
        "name": "豊作",
        "card_type": "事象",
        "required_scale": 0,
        "description": "自分の意識+3、自分の規模+3。",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": { "player_id": "self", "amount": 3 }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": { "player_id": "self", "amount": 3 }
                }
            ]
        }
    },
    "ダミーカード": {
        "name": "ダミーカード",
        "card_type": "事象",
        "required_scale": 0
    }
};

const createTestGameState = (p1Cards, p2Cards, p1Ideology, p2Ideology) => {
    const gameState = {
        players: {
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, consciousness: 50, scale: 30, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, consciousness: 50, scale: 30, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
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
        log: [],
        turn_events: {
            cards_played_this_turn: [],
        },
    };

    const addCard = (player, cardName, location) => {
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

    p1Cards.forEach(c => addCard(gameState.players[PlayerId.PLAYER1], c.name, c.location));
    p2Cards.forEach(c => addCard(gameState.players[PlayerId.PLAYER2], c.name, c.location));
    if (p1Ideology) addCard(gameState.players[PlayerId.PLAYER1], p1Ideology, 'ideology');
    if (p2Ideology) addCard(gameState.players[PlayerId.PLAYER2], p2Ideology, 'ideology');
    
    return gameState;
};

describe('リバタリアニズム カード効果テスト', () => {
    let gameState;

    test('パッシブ効果：意識と規模の増加が0になる', () => {
        gameState = createTestGameState([{ name: '豊作', location: 'hand' }], [], 'リバタリアニズム', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;
        const initialScale = p1.scale;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialConsciousness);
        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(initialScale);
    });

    test('リアクション効果：カードをプレイすると「マネー」が手札に加わる', () => {
        gameState = createTestGameState([{ name: 'ダミーカード', location: 'hand' }], [], 'リバタリアニズム', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialHandSize = p1.hand.length;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER1].hand.length).toBe(initialHandSize); // ダミーカードがプレイされ、マネーが加わるので枚数は同じ
        const moneyCard = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');
        expect(moneyCard).toBeDefined();
        expect(moneyCard.current_durability).toBe(1);
    });

    test('ターン開始時効果：「マネー」の耐久値が-70%または+100%される', () => {
        gameState = createTestGameState([{ name: 'マネー', location: 'field' }], [], 'リバタリアニズム', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const moneyCard = p1.field[0];
        const initialDurability = moneyCard.current_durability; // 10

        const expectedDurability1 = initialDurability - Math.floor(initialDurability * 0.7); // 10 - 7 = 3
        const expectedDurability2 = initialDurability + initialDurability; // 10 + 10 = 20

        let stateAfterTurnStart = startTurn(gameState);
        let finalState = processEffects(stateAfterTurnStart);

        const finalDurability = finalState.players[PlayerId.PLAYER1].field[0].current_durability;
        expect([expectedDurability1, expectedDurability2]).toContain(finalDurability);
    });
});
