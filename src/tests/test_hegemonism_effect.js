import { playCard, startTurn, endTurn, resolveInput } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, GamePhase } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions
const card_definitions_map = {
    "覇権主義": {
        "name": "覇権主義",
        "card_type": "イデオロギー",
        "required_scale": 70,
        "description": "配置時、「内戦」か「隘路」を手札に加え、自分の場に「マネー」があればその耐久値と同じ値だけ自分の規模をプラスし、「マネー」を捨て札にする。ターン終了時、自分の規模が相手の規模を上回っているなら自分の意識+5。",
        "triggers": {
            "CARD_PLACED_THIS": [
                {
                    "effect_type": "PROCESS_ADD_CHOICE_CARD_TO_HAND",
                    "args": { "player_id": "self", "options": ["内戦", "隘路"] }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": { "player_id": "self", "amount_based_on_money_durability": true }
                },
                {
                    "effect_type": "MOVE_CARD",
                    "args": { "card_id": "self_money_on_field", "source_pile": "field", "destination_pile": "discard", "player_id": "self" }
                }
            ],
            "END_TURN_OWNER": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": { "player_id": "self", "amount": 5, "condition_self_scale_higher": true }
                }
            ]
        }
    },
    "マネー": {
        "name": "マネー",
        "card_type": "財",
        "required_scale": 0,
        "durability": 10,
        "is_token": true
    },
    "内戦": { "name": "内戦", "card_type": "事象" },
    "隘路": { "name": "隘路", "card_type": "財" },
};

const createTestGameState = (p1Cards, p2Cards, p1Ideology, p2Ideology) => {
    const gameState = {
        players: {
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, consciousness: 50, scale: 70, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, consciousness: 50, scale: 70, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
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

describe('覇権主義 カード効果テスト', () => {
    let gameState;

    test('配置時効果（マネーなし）：カード選択が発生し、手札に加わる', () => {
        gameState = createTestGameState([{ name: '覇権主義', location: 'hand' }], [], null, null);
        const p1 = gameState.players[PlayerId.PLAYER1];

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let stateAfterEffects = processEffects(stateAfterPlay);

        // Check for awaiting input
        expect(stateAfterEffects.awaiting_input).not.toBeNull();
        expect(stateAfterEffects.awaiting_input.type).toBe('CHOICE_CARD_TO_ADD');
        expect(stateAfterEffects.awaiting_input.options).toEqual(['内戦', '隘路']);

        // Resolve input
        let stateAfterInput = resolveInput(stateAfterEffects, '内戦');
        let finalState = processEffects(stateAfterInput);

        expect(finalState.players[PlayerId.PLAYER1].hand.some(c => c.name === '内戦')).toBe(true);
    });

    test('配置時効果（マネーあり）：規模が増加し、マネーが捨て札になる', () => {
        gameState = createTestGameState([
            { name: '覇権主義', location: 'hand' },
            { name: 'マネー', location: 'field' }
        ], [], null, null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialScale = p1.scale;
        const moneyDurability = p1.field[0].current_durability;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let stateAfterEffects = processEffects(stateAfterPlay);

        // Resolve card choice
        let stateAfterInput = resolveInput(stateAfterEffects, '隘路');
        let finalState = processEffects(stateAfterInput);

        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(initialScale + moneyDurability);
        expect(finalState.players[PlayerId.PLAYER1].field.some(c => c.name === 'マネー')).toBe(false);
        expect(finalState.players[PlayerId.PLAYER1].discard.some(c => c.name === 'マネー')).toBe(true);
        expect(finalState.players[PlayerId.PLAYER1].hand.some(c => c.name === '隘路')).toBe(true);
    });

    test('ターン終了時効果（条件満たす）：意識が+5される', () => {
        gameState = createTestGameState([], [], '覇権主義', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 80;
        const p2 = gameState.players[PlayerId.PLAYER2];
        p2.scale = 70;
        const initialConsciousness = p1.consciousness;

        let stateAfterEnd = endTurn(gameState);
        let finalState = processEffects(stateAfterEnd);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialConsciousness + 5);
    });

    test('ターン終了時効果（条件満たさず）：意識は変わらない', () => {
        gameState = createTestGameState([], [], '覇権主義', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 70;
        const p2 = gameState.players[PlayerId.PLAYER2];
        p2.scale = 80;
        const initialConsciousness = p1.consciousness;

        let stateAfterEnd = endTurn(gameState);
        let finalState = processEffects(stateAfterEnd);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialConsciousness);
    });
});
