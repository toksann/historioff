/**
 * アニメーション状態管理システム
 * カードのアニメーション状態を追跡し、初期表示を制御する
 */
class AnimationStateManager {
    constructor() {
        // アニメーション待ちのカードIDを管理
        this.pendingAnimations = new Set();
        // 完了したアニメーションのカードIDを管理
        this.completedAnimations = new Set();
    }

    /**
     * カードをアニメーション待ち状態に設定
     * @param {string} cardId - カードID
     */
    setPendingAnimation(cardId) {
        console.log('🎬ANIM [StateManager] Setting pending animation for card:', cardId);
        this.pendingAnimations.add(cardId);
    }

    /**
     * カードのアニメーションを完了状態に設定
     * @param {string} cardId - カードID
     */
    setAnimationCompleted(cardId) {
        console.log('🎬ANIM [StateManager] Animation completed for card:', cardId);
        this.pendingAnimations.delete(cardId);
        this.completedAnimations.add(cardId);
    }

    /**
     * カードがアニメーション待ち状態かチェック
     * @param {string} cardId - カードID
     * @returns {boolean}
     */
    isPendingAnimation(cardId) {
        return this.pendingAnimations.has(cardId);
    }

    /**
     * カードのアニメーションが完了しているかチェック
     * @param {string} cardId - カードID
     * @returns {boolean}
     */
    isAnimationCompleted(cardId) {
        return this.completedAnimations.has(cardId);
    }

    /**
     * カードの状態をクリア
     * @param {string} cardId - カードID
     */
    clearCardState(cardId) {
        console.log('🎬ANIM [StateManager] Clearing state for card:', cardId);
        this.pendingAnimations.delete(cardId);
        this.completedAnimations.delete(cardId);
    }

    /**
     * 全ての状態をクリア
     */
    clearAllStates() {
        console.log('🎬ANIM [StateManager] Clearing all animation states');
        this.pendingAnimations.clear();
        this.completedAnimations.clear();
    }

    /**
     * デバッグ用：現在の状態を取得
     */
    getDebugInfo() {
        return {
            pending: Array.from(this.pendingAnimations),
            completed: Array.from(this.completedAnimations)
        };
    }
}

// シングルトンインスタンス
const animationStateManager = new AnimationStateManager();

export default animationStateManager;