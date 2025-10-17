import '../App.css';

const GameLogOverlay = ({ gameState, onClose }) => {
    if (!gameState) return null;

    const handleOverlayClick = (e) => {
        // オーバーレイの背景をクリックした場合のみ閉じる
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const { game_log = [], round_number = 1, current_turn, first_player } = gameState;

    // ログエントリーのフォーマット
    const formatLogEntry = (entry, index) => {
        if (typeof entry === 'string') {
            return entry;
        }
        
        // オブジェクト形式の場合
        if (entry.message) {
            return entry.message;
        }
        
        // フォールバック
        return `効果 ${index + 1}`;
    };

    return (
        <div className="game-log-overlay" onClick={handleOverlayClick}>
            <div className="game-log-modal">
                <div className="game-log-header">
                    <h2>ゲームログ (現在: {current_turn === first_player ? '先攻' : '後攻'} ターン{round_number})</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="game-log-content">
                    {game_log.length === 0 ? (
                        <div className="no-log">
                            まだログがありません
                        </div>
                    ) : (
                        <div className="log-entries">
                            {game_log.map((entry, index) => (
                                <div key={index} className="log-entry">
                                    <div className="log-index">{index + 1}</div>
                                    <div className="log-message">
                                        {formatLogEntry(entry, index)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="game-log-footer">
                    <div className="log-stats">
                        総ログ数: {game_log.length}件
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameLogOverlay;