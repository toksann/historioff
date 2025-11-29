import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../App.css';

const GameInfo = ({ gameState, enhancedLog, onShowLog, onShowRules }) => {
    const [isFlashing, setIsFlashing] = useState(false);
    const [lastProcessedEntryId, setLastProcessedEntryId] = useState(null);
    const [lastSeenTurnNumber, setLastSeenTurnNumber] = useState(1);
    const [lastSeenPlayer, setLastSeenPlayer] = useState(null);
    const timerRef = useRef(null);
    
    // 最新の効果を取得（最大2行）
    const getLatestEffects = () => {
        if (!gameState) return ['ゲーム情報読み込み中...'];
        
        const { game_log = [] } = gameState;
        
        if (enhancedLog && enhancedLog.getFilteredEntries) {
            // GameLogOverlayと同じ方法でログを取得
            const allEntries = enhancedLog.getFilteredEntries('all');
            if (allEntries.length === 0) {
                return ['ゲーム開始'];
            }
            
            // 最新の3件を取得
            const recent = allEntries.slice(-3);
            return recent.map(entry => {
                if (entry.type === 'effect' && entry.playerName && entry.sourceCard) {
                    return `[${entry.playerName}][${entry.sourceCard}] ${entry.description}`;
                }
                return entry.description || entry.message || entry.toString();
            });
        } else {
            // フォールバック: 従来のゲームログを使用
            if (game_log.length === 0) {
                return ['ゲーム開始'];
            }
            
            const recent = game_log.slice(-3);
            return recent.map(entry => entry.message || entry.toString());
        }
    };

    const latestEffects = getLatestEffects();

    // 点滅アニメーションをトリガー
    const triggerFlash = useCallback(() => {        
        if (isFlashing) {
            return; // 既に点滅中の場合は無視
        }
        
        setIsFlashing(true);
        
        // 既存のタイマーをクリア
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        
        // 600ms後に点滅を終了
        timerRef.current = setTimeout(() => {
            setIsFlashing(false);
            timerRef.current = null;
        }, 600);
    }, [isFlashing]);

    // ターン終了を検出して点滅をトリガー
    const checkForTurnEnd = useCallback(() => {        
        if (!enhancedLog || !gameState) return;
        
        // 最新のログエントリーからターン終了を検出
        const allEntries = enhancedLog.getFilteredEntries ? enhancedLog.getFilteredEntries('all') : [];
        
        if (allEntries.length === 0) return;
        
        const latestEntry = allEntries[allEntries.length - 1];
        const entryId = latestEntry.id || `${allEntries.length - 1}-${latestEntry.description || latestEntry.message}`;
        
        // 既に処理済みのエントリーの場合はスキップ
        if (entryId === lastProcessedEntryId) {
            return;
        }
        
        const entryText = (latestEntry.description || latestEntry.message || latestEntry.toString()).toLowerCase();
        
        // ターン開始メッセージからターン番号を抽出してターン終了を検出
        const isTurnStart = entryText.includes('ターン') && entryText.includes('開始');
        let shouldTriggerFlash = false;
        
        if (isTurnStart) {
            // ターン番号とプレイヤーを抽出（例: "先攻 ターン2 開始" → ターン2, 先攻）
            const turnMatch = entryText.match(/ターン(\d+)/);
            const playerMatch = entryText.match(/(先攻|後攻)/);
            
            if (turnMatch) {
                const currentTurnNumber = parseInt(turnMatch[1], 10);
                const currentPlayer = playerMatch ? playerMatch[1] : null;
                
                // ターン番号が増加した場合、またはプレイヤーが変わった場合
                const turnIncreased = currentTurnNumber > lastSeenTurnNumber;
                const playerChanged = currentPlayer && currentPlayer !== lastSeenPlayer;
                
                if (turnIncreased || playerChanged) {
                    shouldTriggerFlash = true;
                    setLastSeenTurnNumber(currentTurnNumber);
                    setLastSeenPlayer(currentPlayer);
                }
            }
        }
        
        // 従来のターン終了メッセージも検出
        const isDirectTurnEnd = entryText.includes('ターン終了') || 
                               entryText.includes('ターンを終了') ||
                               entryText.includes('のターン終了') ||
                               entryText.includes('turn end') ||
                               entryText.includes('end turn');
        
        const isTurnEnd = isDirectTurnEnd || shouldTriggerFlash;
        
        if (isTurnEnd) {
            triggerFlash();
        }
        
        // 処理済みエントリーIDを更新
        setLastProcessedEntryId(entryId);
    }, [enhancedLog, gameState, lastProcessedEntryId, lastSeenTurnNumber, lastSeenPlayer, triggerFlash]);

    // ゲーム状態の初期化
    useEffect(() => {
        if (gameState && gameState.round_number) {
            // ゲーム開始時に現在のターン番号を設定
            if (lastSeenTurnNumber === 1 && gameState.round_number === 1) {
                setLastSeenTurnNumber(gameState.round_number);
                // 初期プレイヤーも設定
                const isCurrentPlayerFirst = gameState.current_turn === gameState.first_player;
                setLastSeenPlayer(isCurrentPlayerFirst ? '先攻' : '後攻');
            }
        }
    }, [gameState, lastSeenTurnNumber]);

    // ターン終了の監視（ログエントリーの変化を監視）
    useEffect(() => {
        checkForTurnEnd();
    }, [latestEffects, enhancedLog, gameState, checkForTurnEnd]);

    // コンポーネントのアンマウント時にタイマーをクリア
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);
    
    if (!gameState) return <div>ゲーム情報読み込み中...</div>;

    const { current_turn, round_number = 1, first_player } = gameState;
    
    // 先攻後攻の判定
    const isCurrentPlayerFirst = current_turn === first_player;
    const turnOrder = isCurrentPlayerFirst ? '先攻' : '後攻';

    return (
        <div className="game-info">
            <div className="game-info-header">
                <h3>h1$tor!0</h3>
                {onShowRules && (
                    <button 
                        className="rules-button"
                        onClick={onShowRules}
                        title="ルールを表示"
                    >
                        ？
                    </button>
                )}
            </div>
            
            <div className="turn-info-compact">
                <div className="turn-details">
                    <span className="turn-number">{turnOrder} ターン{round_number}</span>
                </div>
            </div>
            
            <div className="log-section-full">
                <div 
                    className={`latest-effects-compact clickable-log ${isFlashing ? 'log-flash-turn' : ''}`}
                    onClick={onShowLog}
                    title="クリックでプレイログを開く"
                >
                    <div className="effects-scroll">
                        {latestEffects.map((effect, index) => (
                            <div key={index} className="effect-line-compact">
                                {effect}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameInfo;