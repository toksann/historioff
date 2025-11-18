/**
 * 略奪カードでのCARD_DURABILITY_CHANGEDイベント発生確認テスト
 */

import { EffectMonitor } from '../gameLogic/EffectMonitor.js';
import { GameState } from '../gameLogic/GameState.js';
import { effectHandler } from '../gameLogic/effectHandler.js';

// テスト用のカード定義
const testCardDefs = {
    "略奪": {
        "name": "略奪",
        "card_type": "事象",
        "required_scale": 0,
        "description": "相手の財カード1枚に2ダメージ。相手の規模-2、自分の規模+2。ダメージを与えたとき、その対象が「マネー」ならさらに自分の規模+3",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH",
                    "args": {
                        "player_id": "self",
                        "target_player_id": "opponent",
                        "amount": -2,
                        "bonus_effect_if_money": true,
                        "bonus_scale_amount": 3
                    }
                }
            ],
            "SUCCESS_PROCESS": [
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "opponent",
                        "amount": -2
                    }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "self",
                        "amount": 2
                    }
                }
            ]
        }
    },
    "戦士": {
        "name": "戦士",
        "card_type": "財",
        "required_scale": 1,
        "durability": 2,
        "description": "ターン終了ごとに正面にある相手の財にこのカードの耐久値と同じ値のダメージを与え、相手の意識を-1する。",
        "triggers": {
            "END_TURN_OWNER": [
                {
                    "effect_type": "MODIFY_CARD_DURABILITY_RESERVE",
                    "args": {
                        "card_id": "front",
                        "amount_based_on_self_durability": "minus"
                    }
                },
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": {
                        "player_id": "opponent",
                        "amount": -1
                    }
                }
            ]
        }
    },
    "マネー": {
        "name": "マネー",
        "card_type": "財",
        "required_scale": 0,
        "durability": 1,
        "description": "配置時、自分の規模+1。"
    }
};

function createTestGameState() {
    const gameState = new GameState();
    
    // プレイヤー設定
    gameState.players.player1 = {
        id: 'player1',
        consciousness: 10,
        scale: 5,
        hand: [],
        deck: [],
        discard: [],
        field: [],
        ideology: null
    };
    
    gameState.players.player2 = {
        id: 'player2', 
        consciousness: 10,
        scale: 5,
        hand: [],
        deck: [],
        discard: [],
        field: [],
        ideology: null
    };
    
    // 略奪カードをプレイヤー1の手札に追加
    const lootingCard = {
        instance_id: 'looting_1',
        name: '略奪',
        card_type: '事象',
        owner: 'player1',
        location: 'hand',
        required_scale: 0
    };
    gameState.players.player1.hand.push(lootingCard);
    
    // マネーカードをプレイヤー2の場に配置
    const moneyCard = {
        instance_id: 'money_1',
        name: 'マネー',
        card_type: '財',
        owner: 'player2',
        location: 'field',
        required_scale: 0,
        durability: 1,
        current_durability: 1
    };
    gameState.players.player2.field.push(moneyCard);
    
    gameState.current_player = 'player1';
    gameState.all_card_instances = [lootingCard, moneyCard];
    
    return gameState;
}

function testLootingDurabilityChange() {
    console.log('=== 略奪カードでのCARD_DURABILITY_CHANGEDイベント発生テスト ===');
    
    const gameState = createTestGameState();
    const effectMonitor = new EffectMonitor();
    
    console.log('初期状態:');
    console.log('- プレイヤー1手札:', gameState.players.player1.hand.map(c => c.name));
    console.log('- プレイヤー2場:', gameState.players.player2.field.map(c => `${c.name}(${c.current_durability})`));
    
    // 略奪カードをプレイ
    const lootingCard = gameState.players.player1.hand[0];
    console.log('\n略奪カードをプレイ...');
    
    // PLAY_EVENT_THISトリガーを実行
    const playEffect = {
        effect_type: 'PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH',
        args: {
            player_id: 'player1',
            target_player_id: 'player2',
            amount: -2,
            bonus_effect_if_money: true,
            bonus_scale_amount: 3
        }
    };
    
    // エフェクトキューを作成
    const effectsQueue = [];
    
    // PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTHを実行
    effectHandler[playEffect.effect_type](gameState, playEffect.args, testCardDefs, lootingCard, effectsQueue);
    
    console.log('選択プロセス後のエフェクトキュー:', effectsQueue.length, '個');
    
    // 選択を自動で行う（マネーカードを選択）
    if (gameState.awaiting_input && gameState.awaiting_input.type === 'CHOICE_CARD_FOR_EFFECT') {
        console.log('カード選択中... マネーカードを自動選択');
        
        // 選択されたカードでRESOLVEDエフェクトを実行
        const resolvedEffect = {
            effect_type: 'PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH_RESOLVED',
            args: {
                ...gameState.awaiting_input.source_effect.args,
                card_id: 'money_1'
            }
        };
        
        gameState.awaiting_input = null;
        
        // RESOLVEDエフェクトを実行
        effectHandler[resolvedEffect.effect_type](gameState, resolvedEffect.args, testCardDefs, lootingCard, effectsQueue);
        
        console.log('RESOLVED後のエフェクトキュー:', effectsQueue.length, '個');
        
        // エフェクトキューを処理
        let processedEffects = [];
        while (effectsQueue.length > 0) {
            const [effect, sourceCard] = effectsQueue.shift();
            console.log(`処理中エフェクト: ${effect.effect_type}`);
            processedEffects.push(effect);
            
            if (effectHandler[effect.effect_type]) {
                effectHandler[effect.effect_type](gameState, effect.args, testCardDefs, sourceCard, effectsQueue);
            }
        }
        
        console.log('\n処理されたエフェクト一覧:');
        processedEffects.forEach((effect, index) => {
            console.log(`${index + 1}. ${effect.effect_type}`, effect.args);
        });
        
        // CARD_DURABILITY_CHANGEDが含まれているかチェック
        const durabilityChangeEffects = processedEffects.filter(e => e.effect_type === 'CARD_DURABILITY_CHANGED');
        console.log(`\nCARD_DURABILITY_CHANGEDエフェクト数: ${durabilityChangeEffects.length}`);
        
        if (durabilityChangeEffects.length > 0) {
            console.log('✅ CARD_DURABILITY_CHANGEDイベントが発生しました');
            durabilityChangeEffects.forEach((effect, index) => {
                console.log(`  ${index + 1}:`, effect.args);
            });
        } else {
            console.log('❌ CARD_DURABILITY_CHANGEDイベントが発生していません');
        }
        
        // 最終状態を確認
        const moneyCard = gameState.players.player2.field.find(c => c.instance_id === 'money_1');
        console.log('\n最終状態:');
        console.log('- マネーカード耐久値:', moneyCard ? moneyCard.current_durability : 'カードが見つからない');
        
    } else {
        console.log('❌ 選択プロセスが開始されませんでした');
        console.log('awaiting_input:', gameState.awaiting_input);
    }
}

// テスト実行
testLootingDurabilityChange();