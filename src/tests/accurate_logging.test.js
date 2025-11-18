import { playCard } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType, EffectType, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import { EffectMonitor } from '../gameLogic/EffectMonitor.js';
import LogEntryGenerator from '../gameLogic/LogEntryGenerator.js';

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
    },
    "戦士": {
        "name": "戦士",
        "card_type": "財",
        "required_scale": 1,
        "durability": 5
    },
    "財攻撃カード": {
        "name": "財攻撃カード",
        "card_type": "事象",
        "required_scale": 0,
        "triggers": {
            "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CARD_DURABILITY_RESERVE", "args": { "card_id": "target_card", "amount": -3 } }]
        }
    }
};

const createTestGameState = (p1Cards, p2Cards, p1Ideology, p2Ideology) => {
    const gameState = {
        players: {
            [PlayerId.PLAYER1]: { id: PlayerId.PLAYER1, name: 'プレイヤー1', consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
            [PlayerId.PLAYER2]: { id: PlayerId.PLAYER2, name: 'プレイヤー2', consciousness: 50, scale: 20, hand: [], field: [], deck: [], discard: [], ideology: null, field_limit: 5, hand_capacity: 7, modify_parameter_corrections: [] },
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

describe('正確なログ表示テスト', () => {
    let effectMonitor;
    let logGenerator;

    beforeEach(() => {
        effectMonitor = new EffectMonitor();
        logGenerator = new LogEntryGenerator();
    });

    test('孤立主義による意識ダメージ軽減がログに正確に反映される', () => {
        const gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        // エフェクトモニターを設定
        effectMonitor.reset();
        
        // エフェクトハンドラーにエフェクトロガーを設定
        const { setEffectLogger } = require('../gameLogic/effectHandler.js');
        setEffectLogger(effectMonitor);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        // エフェクトログを取得
        const rawEntries = effectMonitor.watchEffectQueue(finalState);
        
        // CONSCIOUSNESS_CHANGEDエフェクトを探す
        const consciousnessChangedEntries = rawEntries.filter(entry => 
            entry.effect && entry.effect.effect_type === 'CONSCIOUSNESS_CHANGED'
        );

        expect(consciousnessChangedEntries.length).toBeGreaterThan(0);

        // 最初の意識変化（攻撃による）を確認
        const attackDamageEntry = consciousnessChangedEntries.find(entry => 
            entry.effect.args.original_amount === -4
        );

        expect(attackDamageEntry).toBeTruthy();
        expect(attackDamageEntry.effect.args.actual_amount).toBe(-1); // 4-3=1ダメージ

        // ログエントリーを生成
        const logEntry = logGenerator.generateEntry(
            attackDamageEntry.effect.effect_type,
            attackDamageEntry.effect.args,
            attackDamageEntry.sourceCard,
            finalState
        );

        expect(logEntry).toBeTruthy();
        expect(logEntry.description).toContain('意識を1減少（元：-4）');
        expect(logEntry.details.corrected).toBe(true);
        expect(logEntry.details.originalAmount).toBe(-4);
        expect(logEntry.details.actualAmount).toBe(-1);
    });

    test('孤立主義による財ダメージ軽減がログに正確に反映される', () => {
        const gameState = createTestGameState(
            [{ name: '戦士', location: 'field' }],
            [{ name: '財攻撃カード', location: 'hand' }],
            '孤立主義',
            null
        );
        gameState.current_turn = PlayerId.PLAYER2;
        const p1Warrior = gameState.players[PlayerId.PLAYER1].field[0];
        const p2AttackCard = gameState.players[PlayerId.PLAYER2].hand[0];

        // 攻撃対象を設定
        p2AttackCard.triggers.PLAY_EVENT_THIS[0].args.card_id = p1Warrior.instance_id;

        // エフェクトモニターを設定
        effectMonitor.reset();
        
        // エフェクトハンドラーにエフェクトロガーを設定
        const { setEffectLogger } = require('../gameLogic/effectHandler.js');
        setEffectLogger(effectMonitor);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2AttackCard.instance_id);
        let finalState = processEffects(stateAfterPlay);

        // エフェクトログを取得
        const rawEntries = effectMonitor.watchEffectQueue(finalState);
        
        // CARD_DURABILITY_CHANGEDエフェクトを探す
        const durabilityChangedEntries = rawEntries.filter(entry => 
            entry.effect && entry.effect.effect_type === 'CARD_DURABILITY_CHANGED'
        );

        expect(durabilityChangedEntries.length).toBeGreaterThan(0);

        const damageEntry = durabilityChangedEntries[0];
        expect(damageEntry.effect.args.original_amount).toBe(-3);
        expect(damageEntry.effect.args.actual_amount).toBe(-2); // 3-1=2ダメージ

        // ログエントリーを生成
        const logEntry = logGenerator.generateEntry(
            damageEntry.effect.effect_type,
            damageEntry.effect.args,
            damageEntry.sourceCard,
            finalState
        );

        expect(logEntry).toBeTruthy();
        expect(logEntry.description).toContain('戦士に2ダメージ（元：-3）');
        expect(logEntry.details.corrected).toBe(true);
        expect(logEntry.details.originalAmount).toBe(-3);
        expect(logEntry.details.actualAmount).toBe(-2);
    });

    test('補正なしの場合は元の値のみ表示される', () => {
        const gameState = createTestGameState([], [{ name: '攻撃カード-4', location: 'hand' }], null, null);
        gameState.current_turn = PlayerId.PLAYER2;
        const p2 = gameState.players[PlayerId.PLAYER2];

        // エフェクトモニターを設定
        effectMonitor.reset();
        
        // エフェクトハンドラーにエフェクトロガーを設定
        const { setEffectLogger } = require('../gameLogic/effectHandler.js');
        setEffectLogger(effectMonitor);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, p2.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        // エフェクトログを取得
        const rawEntries = effectMonitor.watchEffectQueue(finalState);
        
        // CONSCIOUSNESS_CHANGEDエフェクトを探す
        const consciousnessChangedEntries = rawEntries.filter(entry => 
            entry.effect && entry.effect.effect_type === 'CONSCIOUSNESS_CHANGED'
        );

        expect(consciousnessChangedEntries.length).toBeGreaterThan(0);

        const damageEntry = consciousnessChangedEntries[0];
        expect(damageEntry.effect.args.original_amount).toBe(-4);
        expect(damageEntry.effect.args.actual_amount).toBe(-4); // 補正なし

        // ログエントリーを生成
        const logEntry = logGenerator.generateEntry(
            damageEntry.effect.effect_type,
            damageEntry.effect.args,
            damageEntry.sourceCard,
            finalState
        );

        expect(logEntry).toBeTruthy();
        expect(logEntry.description).toBe('意識を4減少'); // 補正情報なし
        expect(logEntry.details.corrected).toBe(false);
        expect(logEntry.details.originalAmount).toBe(-4);
        expect(logEntry.details.actualAmount).toBe(-4);
    });

    test('孤立主義により相手への意識ダメージが0になった場合もログに表示される', () => {
        // 孤立主義を持つプレイヤー1に対して、プレイヤー2が攻撃
        // 孤立主義の効果で相手（プレイヤー2）への意識ダメージは0になる
        const gameState = createTestGameState([{ name: '攻撃カード-4', location: 'hand' }], [], '孤立主義', null);
        gameState.current_turn = PlayerId.PLAYER1;
        const p1 = gameState.players[PlayerId.PLAYER1];

        // エフェクトモニターを設定
        effectMonitor.reset();
        
        // エフェクトハンドラーにエフェクトロガーを設定
        const { setEffectLogger } = require('../gameLogic/effectHandler.js');
        setEffectLogger(effectMonitor);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(stateAfterPlay);

        // エフェクトログを取得
        const rawEntries = effectMonitor.watchEffectQueue(finalState);
        
        // CONSCIOUSNESS_CHANGEDエフェクトを探す（プレイヤー2への攻撃）
        const consciousnessChangedEntries = rawEntries.filter(entry => 
            entry.effect && 
            entry.effect.effect_type === 'CONSCIOUSNESS_CHANGED' &&
            entry.effect.args.player_id === 'PLAYER2' &&
            entry.effect.args.original_amount === -4
        );

        expect(consciousnessChangedEntries.length).toBeGreaterThan(0);

        const damageEntry = consciousnessChangedEntries[0];
        expect(damageEntry.effect.args.original_amount).toBe(-4);
        expect(Math.abs(damageEntry.effect.args.actual_amount)).toBe(0); // 孤立主義により0に

        // ログエントリーを生成
        const logEntry = logGenerator.generateEntry(
            damageEntry.effect.effect_type,
            damageEntry.effect.args,
            damageEntry.sourceCard,
            finalState
        );

        expect(logEntry).toBeTruthy();
        expect(logEntry.description).toBe('意識への効果が無効化（元：-4）');
        expect(logEntry.details.corrected).toBe(true);
        expect(logEntry.details.originalAmount).toBe(-4);
        expect(Math.abs(logEntry.details.actualAmount)).toBe(0);
    });
});