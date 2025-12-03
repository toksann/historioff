import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 強化されたゲームログを管理するカスタムフック
 * @param {Object} gameState - 現在のゲーム状態
 * @param {Object} effectMonitor - グローバルなEffectMonitorインスタンス (アニメーション連携のため維持)
 * @returns {Object} ログデータと制御関数
 */
const useEnhancedLog = (gameState, effectMonitor) => {
    const [isEnabled, setIsEnabled] = useState(true); // ログ表示の有効/無効状態は維持
    const effectMonitorRef = useRef(effectMonitor); // EffectMonitorの参照は維持 (アニメーション用)

    // アニメーションシステムへのコールバック登録/解除ロジックは維持
    useEffect(() => {
        // エフェクト処理完了時のコールバックはログ生成の役目を終えたため削除
        // しかし、animationCallbacksの登録は必要
        // (App.jsでpresentationControllerにeffectMonitorを渡すため)
        // ここでのonEffectProcessingCompleteコールバック登録はもはやログには関係しない

        // クリーンアップ関数
        return () => {
            // effectMonitor.removeEffectProcessingCallback はログ生成とは関係なくなったため削除
        };
    }, [effectMonitor]); // effectMonitorを依存配列に追加

    /**
     * ログをクリア (現在はgameState.game_logがリセットされるのに依存)
     */
    const clearLog = useCallback(() => {
        // ログのクリアはinitializeGameでgameState.game_logがリセットされることに依存するか、
        // もしApp.jsからログクリアのdispatchが渡されるならそれを呼び出す
        // 現時点では、ここで直接gameStateを変更しない
        //console.log('DEBUG: clearLog called. Log state is reset via initializeGame or external dispatch.');
    }, []);

    /**
     * ログの有効/無効を切り替え
     */
    const toggleEnabled = useCallback(() => {
        setIsEnabled(prev => !prev);
    }, []);

    // ゲームリセット時の処理 (gameState.game_logの初期化に依存)
    useEffect(() => {
        if (!gameState) {
            return;
        }

        // 新しいゲームが開始された場合の検出 (gameState.game_logの内容に依存)
        // game_logはinitializeGameでリセットされるので、ここでは何もしない
        // 必要であれば、ここでフィルタリング状態などをリセットすることは可能
    }, [gameState?.round_number]);

    return React.useMemo(() => {
        // game_logが直接真の情報源となる
        const gameLog = gameState?.game_log || [];

        /**
         * 既存のゲームログをそのまま返す (すでに統合済み)
         */
        const getCombinedLog = () => {
            // game_logはすでにソート済みと仮定、またはGameLogOverlayでソート
            return [...gameLog];
        };

        /**
         * エントリーをタイプでフィルタリング
         */
        const getFilteredEntries = (filterType = 'all') => {
            if (!isEnabled) {
                return [];
            }
            const combinedLog = getCombinedLog();
            
            if (filterType === 'all') {
                return combinedLog;
            }

            return combinedLog.filter(entry => {
                // game_logのエントリは常に表示
                if (entry.source === 'game_log') { // ここは'effect_queue'のエントリも含む
                    return true;
                }
                // LogEntryGeneratorで生成されたエントリはeffectTypeを持つ
                switch (filterType) {
                    case 'card_play':
                        return entry.effectType === 'PLAYER_ACTION' || 
                               (entry.description && (entry.description.includes('プレイ') || entry.description.includes('配置')));
                    case 'damage':
                        return entry.effectType === 'CARD_DURABILITY_CHANGED' || // 実際の変化をログ
                               (entry.description && (entry.description.includes('ダメージ') || entry.description.includes('回復')));
                    case 'resource':
                        return entry.effectType === 'CONSCIOUSNESS_CHANGED' ||
                               entry.effectType === 'SCALE_CHANGED' ||
                               entry.effectType === 'SET_CONSCIOUSNESS' ||
                               entry.effectType === 'SET_SCALE' ||
                               (entry.description && (entry.description.includes('意識') || entry.description.includes('規模')));
                    case 'card_move':
                        return entry.effectType === 'MOVE_CARD' ||
                               (entry.description && (entry.description.includes('移動') || entry.description.includes('ドロー')));

                    default:
                        return true;
                }
            });
        };

        /**
         * 統計情報を取得
         */
        const getLogStats = () => {
            const currentLog = getCombinedLog();
            const effectLogCount = currentLog.filter(entry => entry.source === 'effect_queue').length;
            const progressLogCount = currentLog.filter(entry => entry.source === 'game_log').length; // game_logはEffectMonitor時代の名残、EffectQueue由来も含む
            
            return {
                total: currentLog.length,
                effect: effectLogCount,
                progress: progressLogCount, // progressログはgame_log由来とEffectQueue由来の区別が曖昧になるため、実質effectも含む
                isEnabled
            };
        };

        return {
            // データ (enhancedEntriesはもはや存在しない)
            combinedLog: getCombinedLog(),
            
            // フィルタリング
            getFilteredEntries,
            
            // 制御
            clearLog, // 現状はno-op
            toggleEnabled,
            isEnabled,
            
            // 統計
            getLogStats,
            
            // 演出システム用
            getEffectMonitor: () => effectMonitorRef.current
        };
    }, [gameState?.game_log, isEnabled, gameState?.round_number, effectMonitor]); // gameState.game_logを依存配列に追加
};

export default useEnhancedLog;