import React, { useState, useEffect, useRef, useCallback } from 'react';
import LogEntryGenerator from '../gameLogic/LogEntryGenerator.js';

/**
 * 強化されたゲームログを管理するカスタムフック
 * @param {Object} gameState - 現在のゲーム状態
 * @param {Object} effectMonitor - グローバルなEffectMonitorインスタンス
 * @returns {Object} ログデータと制御関数
 */
const useEnhancedLog = (gameState, effectMonitor) => {
    const [enhancedEntries, setEnhancedEntries] = useState([]);
    const [isEnabled, setIsEnabled] = useState(true);
    const effectMonitorRef = useRef(effectMonitor); // Use the passed effectMonitor directly
    const logGeneratorRef = useRef(null);

    // 初期化
    useEffect(() => {
        if (!logGeneratorRef.current) {
            logGeneratorRef.current = new LogEntryGenerator();
        }

        // エフェクト処理完了時のコールバックを登録
        const handleEffectProcessingComplete = () => {
            console.log('[useEnhancedLog] 🔔 Effect processing complete callback triggered');
            // 強制的にuseEffectを再実行するためにstateを更新
            setEnhancedEntries(prevEntries => [...prevEntries]);
        };
        
        // Ensure effectMonitor is available before registering callback
        if (effectMonitorRef.current) {
            effectMonitorRef.current.onEffectProcessingComplete(handleEffectProcessingComplete);
        }

        // クリーンアップ関数
        return () => {
            if (effectMonitorRef.current) {
                effectMonitorRef.current.removeEffectProcessingCallback(handleEffectProcessingComplete);
            }
        };
    }, [effectMonitor]); // effectMonitorを依存配列に追加

    // ゲーム状態の変化を監視
    useEffect(() => {
        if (!gameState || !isEnabled || !effectMonitorRef.current || !logGeneratorRef.current) {
            return;
        }

        try {
            // console.log('DEBUG: useEnhancedLog useEffect - gameState:', gameState); // Removed
            // エフェクトキューの変化を監視
            const rawEntries = effectMonitorRef.current.watchEffectQueue(gameState);
            
            if (rawEntries.length > 0) {
                console.log('DEBUG: useEnhancedLog rawEntries found:', rawEntries.length);
                console.log('[useEnhancedLog] New entries found:', rawEntries.map(e => ({
                    source: e.source,
                    effectType: e.effectType,
                    description: e.description
                })));
                
                // LogEntryGeneratorを使用してエフェクトエントリーを処理
                const processedEntries = [];
                
                for (const entry of rawEntries) {
                    if (entry.source === 'effect_queue' && entry.effect) {
                        // エフェクトからログエントリーを生成
                        const generatedEntry = logGeneratorRef.current.generateEntry(
                            entry.effect.effect_type,
                            entry.effect.args || {},
                            entry.sourceCard,
                            gameState
                        );
                        
                        if (generatedEntry) {
                            generatedEntry.id = entry.id;
                            generatedEntry.timestamp = entry.timestamp;
                            processedEntries.push(generatedEntry);
                        } else {
                            console.log('[useEnhancedLog] LogEntryGenerator returned null for:', entry.effect.effect_type);
                        }
                    }
                     else {
                        // 状態変化から生成されたエントリーはそのまま使用
                        processedEntries.push(entry);
                    }
                }
                
                console.log('[useEnhancedLog] Processed entries:', processedEntries.length);
                
                // 新しいエントリーを追加
                setEnhancedEntries(prevEntries => {
                    const updatedEntries = [...prevEntries, ...processedEntries];
                    console.log('DEBUG: useEnhancedLog setEnhancedEntries called. New total entries:', updatedEntries.length);
                    
                    // 最大エントリー数を制限（パフォーマンス考慮）
                    const maxEntries = 100;
                    if (updatedEntries.length > maxEntries) {
                        return updatedEntries.slice(-maxEntries);
                    }
                    
                    return updatedEntries;
                });
            } else {
                // console.log('DEBUG: useEnhancedLog rawEntries is empty.'); // Removed
            }
        } catch (error) {
            console.error('[useEnhancedLog] Error monitoring effects:', error);
        }
    }, [gameState, isEnabled, effectMonitor]); // effectMonitorを依存配列に追加

    /**
     * ログをクリア
     */
    const clearLog = useCallback(() => {
        console.log('DEBUG: clearLog called. Clearing enhancedEntries.'); // NEW DEBUG
        setEnhancedEntries([]);
        if (effectMonitorRef.current) {
            effectMonitorRef.current.reset();
        }
    }, []); // No dependencies, as it only clears state

    /**
     * ログの有効/無効を切り替え
     */
    const toggleEnabled = useCallback(() => {
        setIsEnabled(prev => !prev);
    }, []); // No dependencies, as it only toggles state

    // ゲームリセット時の処理
    useEffect(() => {
        if (gameState?.game_over || !gameState) {
            return;
        }

        // 新しいゲームが開始された場合の検出
        if (gameState.round_number === 1 && enhancedEntries.length > 0) {
            // 自動的にログをクリア（確認なし）
            clearLog();
        }
    }, [gameState?.round_number, enhancedEntries.length, clearLog]); // Add clearLog to dependencies

    return React.useMemo(() => {
        /**
         * 既存のゲームログと強化されたログを統合
         */
        const getCombinedLog = () => {
            // EffectMonitorで従来ログも処理されるため、enhancedEntriesのみを返す
            // タイムスタンプでソート
            return [...enhancedEntries].sort((a, b) => a.timestamp - b.timestamp);
        };

        /**
         * エントリーをタイプでフィルタリング
         */
        const getFilteredEntries = (filterType = 'all') => {
            const combinedLog = getCombinedLog();
            
            if (filterType === 'all') {
                return combinedLog;
            }

            return combinedLog.filter(entry => {
                // 進行ログ（game_log由来）は常に表示
                if (entry.source === 'game_log') {
                    return true;
                }

                // 効果ログ（effect_queue由来）のみフィルタリング対象
                switch (filterType) {
                    case 'card_play':
                        return entry.effectType === 'PLAYER_ACTION' || 
                               entry.description.includes('プレイ') ||
                               entry.description.includes('配置');
                    case 'damage':
                        return entry.effectType === 'MODIFY_CARD_DURABILITY' ||
                               entry.effectType === 'MODIFY_CARD_DURABILITY_RESERVE' ||
                               entry.description.includes('ダメージ') ||
                               entry.description.includes('回復');
                    case 'resource':
                        return entry.effectType === 'MODIFY_CONSCIOUSNESS_RESERVE' ||
                               entry.effectType === 'MODIFY_SCALE_RESERVE' ||
                               entry.effectType === 'MODIFY_CONSCIOUSNESS' ||
                               entry.effectType === 'MODIFY_SCALE' ||
                               entry.description.includes('意識') ||
                               entry.description.includes('規模');
                    case 'card_move':
                        return entry.effectType === 'MOVE_CARD' ||
                               entry.description.includes('移動') ||
                               entry.description.includes('ドロー');

                    default:
                        return true;
                }
            });
        };

        /**
         * 統計情報を取得
         */
        const getLogStats = () => {
            const combinedLog = getCombinedLog();
            const effectLogCount = enhancedEntries.filter(entry => entry.source === 'effect_queue').length;
            const progressLogCount = enhancedEntries.filter(entry => entry.source === 'game_log').length;
            
            return {
                total: combinedLog.length,
                effect: effectLogCount,
                progress: progressLogCount,
                isEnabled
            };
        };

        return {
            // データ
            enhancedEntries,
            combinedLog: getCombinedLog(),
            
            // フィルタリング
            getFilteredEntries,
            
            // 制御
            clearLog,
            toggleEnabled,
            isEnabled,
            
            // 統計
            getLogStats,
            
            // デバッグ用
            effectMonitor: effectMonitorRef.current,
            logGenerator: logGeneratorRef.current,
            
            // 演出システム用
            getEffectMonitor: () => effectMonitorRef.current
        };
    }, [enhancedEntries, isEnabled, gameState?.round_number, effectMonitor]);
};

export default useEnhancedLog;