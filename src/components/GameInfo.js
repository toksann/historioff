import React from 'react';
import '../App.css';

const GameInfo = ({ gameState, onShowLog }) => {
    if (!gameState) return <div>ゲーム情報読み込み中...</div>;

    const { current_turn, round_number = 1, first_player, players, game_log = [] } = gameState;
    const currentPlayerName = players[current_turn]?.name || 'Unknown';
    
    // 先攻後攻の判定
    const isCurrentPlayerFirst = current_turn === first_player;
    const turnOrder = isCurrentPlayerFirst ? '先攻' : '後攻';
    
    // 最新の効果を取得（最大2行）
    const getLatestEffects = () => {
        if (game_log.length === 0) {
            return ['ゲーム開始'];
        }
        
        // 最新の1-2件を取得
        const recent = game_log.slice(-2);
        return recent.map(entry => entry.message || entry.toString());
    };

    const latestEffects = getLatestEffects();

    return (
        <div className="game-info">
            <h3>H1$†or!0</h3>
            
            <div className="turn-info">
                <div className="turn-number">{turnOrder} ターン{round_number}</div>
                <div className="current-player">
                    {currentPlayerName}のターン
                </div>
            </div>
            
            <button 
                className="log-button"
                onClick={onShowLog}
            >
                📜 ログを見る
            </button>
            
            <div className="latest-effects">
                <div className="latest-effects-title">最新の効果:</div>
                {latestEffects.map((effect, index) => (
                    <div key={index} className="effect-line">
                        {effect}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GameInfo;