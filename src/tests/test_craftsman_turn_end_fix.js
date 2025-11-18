import { initializeGame, endTurn, resolveInput } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import { PlayerId, CardType, TriggerType, EffectType } from '../gameLogic/constants.js';

/**
 * Test for craftsman card turn end effect bug fix
 */
export const testCraftsmanTurnEndFix = () => {
    console.log('=== 職人カードのターン終了バグ修正テスト ===');

    // Card definitions for test
    const cardDefinitions = {
        "職人": {
            name: "職人",
            card_type: CardType.WEALTH,
            required_scale: 1,
            durability: 3,
            description: "ターン終了時、自分の手札の財の必要規模-1。",
            triggers: {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_CARD_OPERATION",
                        "args": {
                            "player_id": "self",
                            "operation": "modify_required_scale",
                            "source_pile": "hand",
                            "card_type": "財",
                            "count": 1,
                            "selection_method": "choice",
                            "amount": -1,
                            "min_value": 0
                        }
                    }
                ]
            }
        },
        "商人": {
            name: "商人",
            card_type: CardType.WEALTH,
            required_scale: 2,
            durability: 2,
            description: "テスト用財カード"
        },
        "農民": {
            name: "農民", 
            card_type: CardType.WEALTH,
            required_scale: 1,
            durability: 1,
            description: "テスト用財カード"
        }
    };

    // Create preset decks for testing
    const presetDecks = [
        {
            name: "test_deck",
            description: "Test deck for craftsman bug fix",
            cards: ["職人", "商人", "農民"]
        }
    ];

    // Initialize game
    let gameState = initializeGame(cardDefinitions, presetDecks, "test_deck", "test_deck");
    
    const player1 = gameState.players[PlayerId.PLAYER1];
    const player2 = gameState.players[PlayerId.PLAYER2];

    // Set up test scenario
    gameState.current_turn = PlayerId.PLAYER1;
    
    // Add craftsman to player1's field
    const craftsmanCard = createCardInstance(cardDefinitions["職人"], PlayerId.PLAYER1);
    craftsmanCard.location = 'field';
    player1.field.push(craftsmanCard);
    gameState.all_card_instances[craftsmanCard.instance_id] = craftsmanCard;
    
    // Add merchant to player1's hand for the effect to target
    const merchantCard = createCardInstance(cardDefinitions["商人"], PlayerId.PLAYER1);
    merchantCard.location = 'hand';
    player1.hand.push(merchantCard);
    gameState.all_card_instances[merchantCard.instance_id] = merchantCard;

    console.log('初期状態:');
    console.log(`  プレイヤー1の場: ${player1.field.map(c => c.name)}`);
    console.log(`  プレイヤー1の手札: ${player1.hand.map(c => c.name)}`);
    console.log(`  現在のターン: ${gameState.current_turn}`);
    console.log(`  商人の必要規模: ${merchantCard.required_scale}`);

    // Test 1: End turn should trigger craftsman effect and wait for input
    console.log('\n--- テスト1: ターン終了で職人の効果が発動し、入力待ちになる ---');
    
    let newState = endTurn(gameState);
    
    console.log(`  awaiting_input: ${newState.awaiting_input ? 'あり' : 'なし'}`);
    console.log(`  turn_end_state: ${newState.turn_end_state}`);
    console.log(`  現在のターン: ${newState.current_turn}`);
    
    // Verify that we're awaiting input
    if (!newState.awaiting_input) {
        console.error('❌ 入力待ち状態になっていません');
        return false;
    }
    
    if (newState.awaiting_input.type !== 'CHOICE_CARDS_FOR_OPERATION') {
        console.error('❌ 入力タイプが正しくありません:', newState.awaiting_input.type);
        return false;
    }
    
    if (newState.current_turn !== PlayerId.PLAYER1) {
        console.error('❌ ターンが予期せず進んでしまいました');
        return false;
    }
    
    console.log('✅ 正しく入力待ち状態になりました');

    // Test 2: Resolve input should continue turn end processing
    console.log('\n--- テスト2: 入力解決後にターン終了処理が続行される ---');
    
    // Resolve input by choosing the merchant card
    const resolvedState = resolveInput(newState, [merchantCard]);
    
    console.log(`  awaiting_input: ${resolvedState.awaiting_input ? 'あり' : 'なし'}`);
    console.log(`  turn_end_state: ${resolvedState.turn_end_state}`);
    console.log(`  現在のターン: ${resolvedState.current_turn}`);
    console.log(`  商人の必要規模: ${merchantCard.required_scale}`);
    
    // Verify that input was resolved and turn advanced
    if (resolvedState.awaiting_input) {
        console.error('❌ まだ入力待ち状態です');
        return false;
    }
    
    if (resolvedState.current_turn !== PlayerId.PLAYER2) {
        console.error('❌ ターンがプレイヤー2に移っていません');
        return false;
    }
    
    if (merchantCard.required_scale !== 1) { // Should be reduced from 2 to 1
        console.error('❌ 商人の必要規模が正しく変更されていません:', merchantCard.required_scale);
        return false;
    }
    
    if (resolvedState.turn_end_state !== 'ready_for_next_turn') {
        console.error('❌ ターン終了状態が正しくありません:', resolvedState.turn_end_state);
        return false;
    }
    
    console.log('✅ 入力解決後にターンが正常に進みました');
    console.log('✅ 職人の効果が正しく適用されました');

    // Test 3: Verify processing status is cleared
    console.log('\n--- テスト3: 処理状態が正しくクリアされる ---');
    
    if (resolvedState.processing_status.is_processing_turn_end) {
        console.error('❌ ターン終了処理フラグがクリアされていません');
        return false;
    }
    
    if (resolvedState.processing_status.pending_turn_transition) {
        console.error('❌ ターン移行待機フラグがクリアされていません');
        return false;
    }
    
    if (resolvedState.processing_status.awaiting_input_for) {
        console.error('❌ 入力待ち情報がクリアされていません');
        return false;
    }
    
    console.log('✅ 処理状態が正しくクリアされました');

    console.log('\n🎉 すべてのテストが成功しました！職人カードのバグが修正されています。');
    return true;
};

// Run test if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    testCraftsmanTurnEndFix();
}