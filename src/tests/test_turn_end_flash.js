/**
 * ターン終了時の点滅機能のテスト
 */

// モックデータ
const mockGameState = {
    current_turn: 'player1',
    round_number: 1,
    first_player: 'player1',
    game_log: []
};

const mockEnhancedLog = {
    getFilteredEntries: (filter) => {
        return [
            {
                id: 'entry1',
                description: 'プレイヤー1がカードをプレイしました',
                type: 'effect'
            },
            {
                id: 'entry2', 
                description: 'プレイヤー1がターン終了しました',
                type: 'effect'
            }
        ];
    }
};

// テスト関数
function testTurnEndDetection() {
    console.log('=== ターン終了検出テスト ===');
    
    // ターン終了メッセージの検出テスト
    const turnEndMessages = [
        'プレイヤー1がターン終了しました',
        'ターンを終了します',
        'ターン終了',
        'あなたのターンが終了しました'
    ];
    
    turnEndMessages.forEach(message => {
        const isDetected = message.toLowerCase().includes('ターン終了') || 
                          message.toLowerCase().includes('ターンを終了');
        console.log(`メッセージ: "${message}" -> 検出: ${isDetected ? '✅' : '❌'}`);
    });
    
    console.log('\n=== 非ターン終了メッセージテスト ===');
    
    const nonTurnEndMessages = [
        'カードをプレイしました',
        'ダメージを受けました',
        '意識が変化しました',
        'カードを配置しました'
    ];
    
    nonTurnEndMessages.forEach(message => {
        const isDetected = message.toLowerCase().includes('ターン終了') || 
                          message.toLowerCase().includes('ターンを終了');
        console.log(`メッセージ: "${message}" -> 検出: ${isDetected ? '❌ (誤検出)' : '✅'}`);
    });
}

// テスト実行
if (typeof window !== 'undefined') {
    // ブラウザ環境
    window.testTurnEndFlash = testTurnEndDetection;
    console.log('ターン終了点滅テストが利用可能です。testTurnEndFlash()を実行してください。');
} else {
    // Node.js環境
    testTurnEndDetection();
}

export { testTurnEndDetection };