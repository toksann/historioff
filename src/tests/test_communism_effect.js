
import { playCard, startTurn, endTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Mock card definitions
const card_definitions_map = {
    "共産主義": {
        "name": "共産主義",
        "card_type": "イデオロギー",
        "required_scale": 40,
        "description": "ターン開始時、自分の場の財をすべて手札に戻す。ターン終了時手札の財をすべてデッキに戻し、同じ枚数デッキからカードを引く。カードを引くたび、自分の場のすべての財の耐久値+1。",
        "triggers": {
            "START_TURN_OWNER": [
                {
                    "effect_type": "PROCESS_CARD_OPERATION",
                    "args": {
                        "player_id": "self",
                        "operation": "move",
                        "source_pile": "field",
                        "destination_pile": "hand",
                        "card_type": "財",
                        "selection_method": "all"
                    }
                }
            ],
            "END_TURN_OWNER": [
                {
                    "effect_type": "PROCESS_MOVE_HAND_WEALTH_TO_DECK_AND_DRAW",
                    "args": {
                        "player_id": "self"
                    }
                }
            ],
            "CARD_DRAWN_OWNER": [
                {
                    "effect_type": "PROCESS_CARD_OPERATION",
                    "args": {
                        "player_id": "self",
                        "operation": "modify_durability",
                        "target_player_id": "self",
                        "card_type": "財",
                        "selection_method": "all",
                        "amount": 1
                    }
                }
            ]
        }
    },
    "農民": {
        "name": "農民",
        "card_type": "財",
        "required_scale": 0,
        "durability": 1
    },
    "予感": {
        "name": "予感",
        "card_type": "事象",
        "required_scale": 0,
        "description": "デッキからカードを2枚引く。",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "MOVE_CARD",
                    "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" }
                },
                {
                    "effect_type": "MOVE_CARD",
                    "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" }
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
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, consciousness: 50, scale: 40, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, consciousness: 50, scale: 40, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
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

describe('共産主義 カード効果テスト', () => {
    let gameState;

    test('ターン開始時：場の財がすべて手札に戻る', () => {
        gameState = createTestGameState([
            { name: '農民', location: 'field' },
            { name: '農民', location: 'field' }
        ], [], '共産主義', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        expect(p1.field.length).toBe(2);
        expect(p1.hand.length).toBe(0);

        let stateAfterTurnStart = startTurn(gameState);
        let finalState = processEffects(stateAfterTurnStart);

        expect(finalState.players[PlayerId.PLAYER1].field.length).toBe(0);
        expect(finalState.players[PlayerId.PLAYER1].hand.length).toBe(2);
        expect(finalState.players[PlayerId.PLAYER1].hand[0].name).toBe('農民');
    });

    test('ターン終了時：手札の財をデッキに戻し、同数ドローする', () => {
        gameState = createTestGameState([
            { name: '農民', location: 'hand' },
            { name: '農民', location: 'hand' },
            { name: 'ダミーカード', location: 'deck' },
            { name: 'ダミーカード', location: 'deck' },
        ], [], '共産主義', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialHandCount = p1.hand.length; // 2
        const initialDeckCount = p1.deck.length; // 2

        let stateAfterEndTurn = endTurn(gameState);
        let finalState = processEffects(stateAfterEndTurn);

        expect(finalState.players[PlayerId.PLAYER1].hand.length).toBe(initialHandCount);
        expect(finalState.players[PlayerId.PLAYER1].deck.length).toBe(initialDeckCount);
        // Check if the wealth cards are gone from hand
        expect(finalState.players[PlayerId.PLAYER1].hand.some(c => c.name === '農民')).toBe(false);
        // Check if dummy cards are now in hand
        expect(finalState.players[PlayerId.PLAYER1].hand.filter(c => c.name === 'ダミーカード').length).toBe(2);
    });

    test('カードを引くたび：場の財の耐久値+1', () => {
        gameState = createTestGameState([
            { name: '農民', location: 'field' },
            { name: '予感', location: 'hand' },
            { name: 'ダミーカード', location: 'deck' },
            { name: 'ダミーカード', location: 'deck' },
        ], [], '共産主義', null);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const farmer = p1.field[0];
        const initialDurability = farmer.current_durability;

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        // 予感 draws 2 cards, so durability should increase by 2
        expect(finalState.players[PlayerId.PLAYER1].field[0].current_durability).toBe(initialDurability + 2);
    });
});
