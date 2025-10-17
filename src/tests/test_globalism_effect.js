import { playCard, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions
const card_definitions_map = {
    "グローバリズム": {
        "name": "グローバリズム",
        "card_type": "イデオロギー",
        "required_scale": 25,
        "description": "配置時自分の意識-30%。ターン開始時、自分の規模+1し、相手のデッキに「移民」を加える。相手がカードを出すたび自分の意識+1。",
        "triggers": {
            "CARD_PLACED_THIS": [
                { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount_percentage": -30, "round_down": true } }
            ],
            "START_TURN_OWNER": [
                { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 1 } },
                { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "opponent", "card_template_name": "移民", "destination_pile": "deck" } }
            ],
            "PLAYER_PLAY_CARD_ACTION": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": { "player_id": "self", "amount": 1 },
                    "condition": { "check": "is_opponent_play" }
                }
            ]
        }
    },
    "移民": {
        "name": "移民",
        "card_type": "事象",
        "required_scale": 0,
        "description": "自分の意識-1。自分の規模+1。",
        "is_token": true
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

describe('グローバリズム カード効果テスト', () => {
    let gameState;

    test('配置時：意識が-30%される', () => {
        gameState = createTestGameState([{ name: 'グローバリズム', location: 'hand' }], [], null, null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness; // 50
        const expectedConsciousness = initialConsciousness - Math.floor(initialConsciousness * 0.3); // 50 - 15 = 35

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(expectedConsciousness);
    });

    test('ターン開始時：規模+1、相手デッキに「移民」追加', () => {
        gameState = createTestGameState([], [], 'グローバリズム', null);
        gameState.current_turn = PlayerId.PLAYER1;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP1Scale = p1.scale;
        const initialP2DeckSize = p2.deck.length;

        let stateAfterTurnStart = startTurn(gameState);
        let finalState = processEffects(stateAfterTurnStart);

        expect(finalState.players[PlayerId.PLAYER1].scale).toBe(initialP1Scale + 1);
        expect(finalState.players[PlayerId.PLAYER2].deck.length).toBe(initialP2DeckSize + 1);
        expect(finalState.players[PlayerId.PLAYER2].deck[0].name).toBe('移民');
    });

    test('相手のカードプレイ時：自分の意識+1', () => {
        gameState = createTestGameState([], [{ name: 'ダミーカード', location: 'hand' }], 'グローバリズム', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        const initialP1Consciousness = p1.consciousness;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialP1Consciousness + 1);
    });

    test('自分のカードプレイ時：自分の意識は増えない（バグ確認）', () => {
        gameState = createTestGameState([{ name: 'ダミーカード', location: 'hand' }], [], 'グローバリズム', null);
        gameState.current_turn = PlayerId.PLAYER1;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialP1Consciousness = p1.consciousness;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        expect(finalState.players[PlayerId.PLAYER1].consciousness).toBe(initialP1Consciousness);
    });
});