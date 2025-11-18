import { playCard } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, EffectType, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import { NPCActions } from '../components/NPCActions.js';

// Mock card definitions for testing
const card_definitions_map = {
    "解体": {
        "name": "解体",
        "card_type": "事象",
        "required_scale": 2,
        "description": "自分の場の財1枚に4ダメージを与え、「マネー」を1枚手札に加える。",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "PROCESS_CARD_OPERATION",
                    "args": {
                        "player_id": "self",
                        "operation": "modify_durability",
                        "target_player_id": "self",
                        "selection_method": "choice",
                        "amount": -4,
                        "count": 1 // Ensure count is 1
                    }
                },
                {
                    "effect_type": "ADD_CARD_TO_GAME",
                    "args": {
                        "player_id": "self",
                        "card_template_name": "マネー",
                        "destination_pile": "hand",
                        "initial_durability": 1
                    }
                }
            ]
        }
    },
    "技術革新": {
        "name": "技術革新",
        "card_type": "事象",
        "required_scale": 3,
        "description": "自分の規模+2、自分の場の財1枚の耐久値+1。",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "self",
                        "amount": 2
                    }
                },
                {
                    "effect_type": "PROCESS_CARD_OPERATION",
                    "args": {
                        "player_id": "self",
                        "operation": "modify_durability",
                        "target_player_id": "self",
                        "selection_method": "choice",
                        "amount": 1,
                        "count": 1 // Ensure count is 1
                    }
                }
            ]
        }
    },
    "戦士": {
        "name": "戦士",
        "card_type": "財",
        "required_scale": 1,
        "durability": 5
    },
    "農民": {
        "name": "農民",
        "card_type": "財",
        "required_scale": 0,
        "durability": 1
    },
    "マネー": {
        "name": "マネー",
        "card_type": "財",
        "required_scale": 0,
        "durability": 1
    }
};

const createTestGameState = (p1Cards, p2Cards, p1Ideology, p2Ideology) => {
    const gameState = {
        players: {
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, name: 'プレイヤー1', consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, name: 'NPC', consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
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
        turn_end_state: 'ready_for_next_turn',
        processing_status: {
            is_processing_turn_end: false,
            effects_remaining: 0,
            awaiting_input_for: null,
            pending_turn_transition: false
        },
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

describe('NPC カード選択修正テスト', () => {
    test('NPCが解体をプレイする際に1枚だけ選択する', () => {
        // NPCが解体カードを持ち、場に複数の財カードがある状況
        const gameState = createTestGameState(
            [],
            [
                { name: '解体', location: 'hand' },
                { name: '戦士', location: 'field' },
                { name: '農民', location: 'field' }
            ],
            null,
            null
        );
        gameState.current_turn = PlayerId.PLAYER2;
        const npcPlayer = gameState.players[PlayerId.PLAYER2];
        const deconstructionCard = npcPlayer.hand[0];

        // 解体カードをプレイ
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, deconstructionCard.instance_id);
        
        // エフェクトをすべて処理
        let stateAfterEffects = stateAfterPlay;
        while(stateAfterEffects.effect_queue.length > 0 && !stateAfterEffects.awaiting_input) {
            stateAfterEffects = processEffects(stateAfterEffects);
        }

        // 選択待ち状態になることを確認
        expect(stateAfterEffects.awaiting_input).toBeTruthy();
        expect(stateAfterEffects.awaiting_input.type).toBe('CHOICE_CARDS_FOR_OPERATION');
        expect(stateAfterEffects.awaiting_input.count).toBe(1); // 1枚だけ選択

        // NPCが選択を行う
        const selectedCards = NPCActions.makeRandomCardSelection(
            stateAfterEffects.awaiting_input.options,
            stateAfterEffects.awaiting_input.count
        );

        expect(selectedCards.length).toBe(1); // 1枚だけ選択されることを確認
        expect(selectedCards[0].card_type).toBe('財'); // 財カードが選択されることを確認
    });

    test('NPCが技術革新をプレイする際に1枚だけ選択する', () => {
        // NPCが技術革新カードを持ち、場に複数の財カードがある状況
        const gameState = createTestGameState(
            [],
            [
                { name: '技術革新', location: 'hand' },
                { name: '戦士', location: 'field' },
                { name: '農民', location: 'field' }
            ],
            null,
            null
        );
        gameState.current_turn = PlayerId.PLAYER2;
        const npcPlayer = gameState.players[PlayerId.PLAYER2];
        const techInnovationCard = npcPlayer.hand[0];

        // 技術革新カードをプレイ
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, techInnovationCard.instance_id);
        
        // エフェクトをすべて処理
        let stateAfterEffects = stateAfterPlay;
        while(stateAfterEffects.effect_queue.length > 0 && !stateAfterEffects.awaiting_input) {
            stateAfterEffects = processEffects(stateAfterEffects);
        }
        
        expect(stateAfterEffects.awaiting_input).toBeTruthy();
        expect(stateAfterEffects.awaiting_input.type).toBe('CHOICE_CARDS_FOR_OPERATION');
        expect(stateAfterEffects.awaiting_input.count).toBe(1); // 1枚だけ選択

        // NPCが選択を行う
        const selectedCards = NPCActions.makeRandomCardSelection(
            stateAfterEffects.awaiting_input.options,
            stateAfterEffects.awaiting_input.count
        );

        expect(selectedCards.length).toBe(1); // 1枚だけ選択されることを確認
        expect(selectedCards[0].card_type).toBe('財'); // 財カードが選択されることを確認
    });

    test('NPCのmakeRandomCardSelectionが正しいcount数を尊重する', () => {
        const mockCards = [
            { name: '戦士', card_type: '財' },
            { name: '農民', card_type: '財' },
            { name: 'マネー', card_type: '財' }
        ];

        // count=1の場合
        const selection1 = NPCActions.makeRandomCardSelection(mockCards, 1);
        expect(selection1.length).toBe(1);

        // count=2の場合
        const selection2 = NPCActions.makeRandomCardSelection(mockCards, 2);
        expect(selection2.length).toBe(2);

        // count=undefinedの場合（デフォルト1）
        const selectionDefault = NPCActions.makeRandomCardSelection(mockCards);
        expect(selectionDefault.length).toBe(1); // デフォルトは1枚
    });
});