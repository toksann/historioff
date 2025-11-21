/**
 * エフェクトキューの変化を監視し、処理されたエフェクトを特定するクラス
 */
export class EffectMonitor {
    constructor() {
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
        // MOVE_CARD is handled by direct pushes to the animation_queue in its handler.
        // Notifying here would cause duplicate animations.
        if (effect.effect_type === 'MOVE_CARD') {
            return;
        }

        this.pendingEffects = true;
        
        // 演出システムに通知する前に、effectとsourceCardをディープクローンする
        const clonedEffect = JSON.parse(JSON.stringify(effect));
        const clonedSourceCard = sourceCard ? JSON.parse(JSON.stringify(sourceCard)) : null;

        this.notifyAnimationCallbacks(gameState, clonedEffect, clonedSourceCard);
    }

    /**
     * エフェクト処理完了を通知
     */
    notifyEffectProcessingComplete() {
        if (this.pendingEffects) {
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
}

export const effectMonitor = new EffectMonitor();