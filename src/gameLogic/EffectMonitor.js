/**
 * エフェクトキューの変化を監視し、処理されたエフェクトを特定するクラス
 */
export class EffectMonitor {
    constructor() {
        this.recordedEffects = []; // processEffects内で記録されたエフェクト
        this.previousGameLogLength = 0; // 前回のゲームログの長さ
        this.lastReturnedEffects = []; // 最後に返したエフェクト（重複防止用）
        this.pendingEffects = false; // エフェクト処理中フラグ
        this.effectProcessingCallbacks = []; // エフェクト処理完了時のコールバック
        this.animationCallbacks = []; // 演出システム用コールバック
    }

    /**
     * processEffects内からエフェクトを記録
     * @param {Object} gameState - 現在のゲーム状態
     * @param {Object} effect - エフェクト
     * @param {Object} sourceCard - 発生源カード
     */
    recordEffect(gameState, effect, sourceCard) {
            
        // カード関連のエフェクトを特別にログ出力（演出調査用）
        if (effect.effect_type && (effect.effect_type.includes('CARD') || effect.effect_type.includes('HAND') || effect.effect_type.includes('DRAW') || effect.effect_type === 'MOVE_CARD' || effect.effect_type.includes('ADD_CARD') || effect.effect_type.includes('EVENT') || effect.effect_type.includes('DURABILITY'))) {
            
            
            
            
            // 場への配置を特別にマーク
            if (effect.args.destination_pile === 'field' || effect.args.location === 'field') {
                
            }
            
            // イデオロギーカードの配置を特別にマーク
            if (sourceCard?.type === 'イデオロギー' || effect.args.destination_pile === 'ideology') {
                
            }
            
            // 意識・規模変化を特別にマーク
            if (effect.effect_type.includes('CONSCIOUSNESS') || effect.effect_type.includes('SCALE')) {
                
                
            }
        }
        
        if (this.shouldLogEffect(effect)) {
            // ゲーム進行エフェクトの特別ログ
            if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
                
            }
            
            if (effect.effect_type === 'DRAW_CARD') {
                const turnNumber = gameState?.turn_number || 'N/A';
                
            }

            const logEntry = this.createLogEntryFromEffect({ effect, sourceCard }, null);
            if (logEntry) {
                // 重要なエフェクトのみログ出力
                
                this.recordedEffects.push(logEntry);
                
                this.pendingEffects = true; // エフェクト処理中フラグを立てる
                
                // 演出システムに通知する前に、effectとsourceCardをディープクローンする
                const clonedEffect = JSON.parse(JSON.stringify(effect));
                const clonedSourceCard = sourceCard ? JSON.parse(JSON.stringify(sourceCard)) : null;

                
                // ゲーム進行エフェクトの特別ログ
                if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
                    
                }
                
                this.notifyAnimationCallbacks(gameState, clonedEffect, clonedSourceCard);
            } else {
            }
        } else {
        }
    }

    /**
     * エフェクト処理完了を通知
     */
    notifyEffectProcessingComplete() {
        if (this.pendingEffects && this.recordedEffects.length > 0) {
            
            this.pendingEffects = false;
            // コールバックを実行
            this.effectProcessingCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('[EffectMonitor] Error in effect processing callback:', error);
                }
            });
        }
    }

    /**
     * エフェクト処理完了時のコールバックを登録
     */
    onEffectProcessingComplete(callback) {
        this.effectProcessingCallbacks.push(callback);
    }

    /**
     * コールバックを削除
     */
    removeEffectProcessingCallback(callback) {
        const index = this.effectProcessingCallbacks.indexOf(callback);
        if (index > -1) {
            this.effectProcessingCallbacks.splice(index, 1);
        }
    }

    /**
     * 演出システム用コールバックを登録
     * @param {Function} callback - コールバック関数
     */
    registerAnimationCallback(callback) {
        
        this.animationCallbacks.push(callback);
    }

    /**
     * 演出システム用コールバックを削除
     * @param {Function} callback - コールバック関数
     */
    removeAnimationCallback(callback) {
        const index = this.animationCallbacks.indexOf(callback);
        if (index > -1) {
            this.animationCallbacks.splice(index, 1);
            
        }
    }

    /**
     * 指定されたコールバックが登録されているかを確認
     * @param {Function} callback - 確認するコールバック関数
     * @returns {boolean} 登録されていればtrue
     */
    isCallbackRegistered(callback) {
        return this.animationCallbacks.includes(callback);
    }

    /**
     * 演出システムに効果を通知
     * @param {Object} gameState - 現在のゲーム状態
     * @param {Object} effect - エフェクト
     * @param {Object} sourceCard - 発生源カード
     */
    notifyAnimationCallbacks(gameState, effect, sourceCard) {
        
        
        
        
        if (!effect || !effect.effect_type) {
            console.warn('🎮GAME_ANIM [EffectMonitor] notifyAnimationCallbacks received null or invalid effect. Skipping.');
            return;
        }

        // ゲーム進行エフェクトの特別ログ
        if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
            
            
        }
        
        if (effect.effect_type === 'DRAW_CARD') {
            
        }

        if (this.animationCallbacks.length === 0) {
            
            return;
        }
        
        
        this.animationCallbacks.forEach((callback, index) => {
            
            try {
                callback(gameState, effect, sourceCard);
            } catch (error) {
                console.error('🎬ANIM [EffectMonitor] Error in animation callback:', error);
            }
        });
    }

    /**
     * エフェクトキューの変化を監視（シンプル版）
     * @param {Object} gameState - 現在のゲーム状態
     * @returns {Array} 新しく生成されたログエントリー
     */
    watchEffectQueue(gameState) {
        
        const newLogEntries = [];

        // processEffects内で記録されたエフェクトを追加
        if (this.recordedEffects.length > 0) {
            
            
            newLogEntries.push(...this.recordedEffects);
            this.recordedEffects = []; // クリア
            
        } else {
            
        }

        // 従来ログの変化も監視
        const gameLogEntries = this.detectGameLogChanges(gameState);
        if (gameLogEntries.length > 0) {
            
        }
        newLogEntries.push(...gameLogEntries);

        if (newLogEntries.length > 0) {
            
        }
        return newLogEntries;
    }

    /**
     * エフェクトをログに記録すべきかどうかを判定
     * @param {Object} effect - エフェクト
     * @returns {boolean} ログに記録すべきかどうか
     */
    shouldLogEffect(effect) {
        if (!effect || !effect.effect_type) return false;
        
        // ゲーム進行エフェクトの特別ログ
        if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
            
        }

        // 仮想ドローエフェクトを除外（演出重複防止）
        if (effect.effect_type === 'MOVE_CARD' && 
            effect.args.source_pile === 'deck' && 
            effect.args.destination_pile === 'hand' &&
            effect.args.card_id === 'draw_from_deck') {
            
            return false;
        }

        // 除外するエフェクト（内部処理のみ）
        const excludedEffects = [
            'ADD_MODIFY_PARAMETER_CORRECTION',
            'REMOVE_MODIFY_PARAMETER_CORRECTION',
            'CLEAR_MODIFY_PARAMETER_CORRECTIONS',
            'TRIGGER_EFFECT',
            'CHECK_REACTION',
            'START_TURN_OWNER', // Exclude game logic trigger from animation logging
            'START_TURN_OPPONENT' // Exclude game logic trigger from animation logging
        ];

        if (excludedEffects.includes(effect.effect_type)) {
            return false;
        }

        // 重要なエフェクト（実際の変化や行動）
        const importantEffects = [
            // プレイヤー行動
            'PLAYER_ACTION',
            'DRAW_CARD', // DRAW_CARDをログ対象に含める
            'PLAY_EVENT_THIS',
            
            // カード配置・移動 (gameState.animation_queueで処理されるため除外)
            // 'CARD_PLACED_OWNER',
            // 'CARD_PLACED_OPPONENT', 
            // 'MOVE_CARD',
            'ADD_CARD_TO_GAME',
            'ADD_CARD_TO_FIELD',
            
            // ターン管理
            'END_TURN_OWNER',
            'START_TURN_OWNER',
            
            // 実際の値変更（最終結果のみ記録） (gameState.animation_queueで処理されるため除外)
            // 'MODIFY_CARD_DURABILITY',
            // 'MODIFY_CARD_DURABILITY_RESERVE', // 内部処理のみ
            // 'MODIFY_CONSCIOUSNESS', // 内部処理のみ
            // 'MODIFY_CONSCIOUSNESS_RESERVE', // 内部処理のみ
            // 'MODIFY_SCALE', // 内部処理のみ
            // 'MODIFY_SCALE_RESERVE', // 内部処理のみ
            
            // カード状態変化
            'WEALTH_DURABILITY_ZERO_THIS',
            'CARD_DESTROYED',
            
            // NPC行動
            'NPC_ACTION',
            'NPC_CARD_SELECTION',
            'NPC_TURN_START',
            'NPC_TURN_END',
            
            // 変化結果 (gameState.animation_queueで処理されるため除外)
            // 'CONSCIOUSNESS_CHANGED',
            // 'SCALE_CHANGED', 
            // 'CARD_DURABILITY_CHANGED', // gameState.animation_queueで処理されるため除外
            
            // ゲーム進行演出
            // 'TURN_START', // gameState.animation_queueで処理されるため除外
            // 'TURN_END', // gameState.animation_queueで処理されるため除外
            // 'GAME_RESULT', // gameState.animation_queueで処理されるため除外
            // 'TURN_ORDER_DECISION', // gameState.animation_queueで処理されるため除外
            
            // 警告・制限演出
            // 'LIMIT_WARNING', // gameState.animation_queueで処理されるため除外
            // 'EFFECT_NULLIFIED' // gameState.animation_queueで処理されるため除外
        ];

        let shouldLog = importantEffects.includes(effect.effect_type);

        // MOVE_CARD (deck -> hand) は特別にログ対象とする
        if (effect.effect_type === 'MOVE_CARD' && effect.args.source_pile === 'deck' && effect.args.destination_pile === 'hand') {
            shouldLog = true;
        }
        
        // ゲーム進行エフェクトの結果ログ
        if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
            
        }
        
        return shouldLog;
    }

    /**
     * エフェクトからログエントリーを作成
     * @param {Object} effectData - エフェクトデータ
     * @param {Object} gameState - ゲーム状態
     * @returns {Object|null} ログエントリー
     */
    createLogEntryFromEffect(effectData, gameState) {
        try {
            const { effect, sourceCard } = effectData;
            const timestamp = Date.now();
            
            return {
                id: `effect-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
                timestamp,
                source: 'effect_queue',
                effect,
                sourceCard,
                effectType: effect.effect_type,
                args: effect.args || {}
            };
        } catch (error) {
            console.error('[EffectMonitor] Error creating log entry from effect:', error);
            return null;
        }
    }

    /**
     * 従来ログの変化を検出
     * @param {Object} gameState - ゲーム状態
     * @returns {Array} 新しいログエントリー
     */
    detectGameLogChanges(gameState) {
        const gameLog = gameState.game_log || [];
        const newEntries = [];

        // 新しく追加されたログエントリーを検出
        if (gameLog.length > this.previousGameLogLength) {
            const newGameLogEntries = gameLog.slice(this.previousGameLogLength);
            
            for (const entry of newGameLogEntries) {
                let description = typeof entry === 'string' ? entry : entry.message || 'ゲームイベント';
                
                // ゲーム開始ログはスキップ（先攻情報はPlayerStatsで表示されるため）
                if (description.includes('ゲーム開始')) {
                    continue;
                }
                
                newEntries.push({
                    id: `game-log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    timestamp: Date.now(),
                    source: 'game_log',
                    type: 'game_log',
                    playerName: '不明',
                    sourceCard: 'システム',
                    effectType: 'game_event',
                    description,
                    details: typeof entry === 'object' ? entry : {},
                    isOriginal: true
                });
            }
        }

        this.previousGameLogLength = gameLog.length;
        return newEntries;
    }

    /**
     * 監視状態をリセット
     */
    reset() {
        this.recordedEffects = [];
        this.previousGameLogLength = 0;
        this.lastReturnedEffects = [];
    }
}

export const effectMonitor = new EffectMonitor();