import animationStateManager from './AnimationStateManager.js';

/**
 * ゲーム演出を管理するクラス
 * EffectMonitorと連携して、ゲーム内の効果に対応する視覚的演出を実行する
 */
class AnimationManager {
    constructor() {
        // 演出キュー（変化演出用）
        this.animationQueue = [];
        
        // 現在実行中の演出
        this.activeAnimations = new Set();
        
        // 継続演出の状態管理
        this.persistentStates = new Map();
        
        // 演出完了カウンター（デバッグ用）
        this.completedCount = 0;
        
        // エラー記録
        this.errors = [];
        
        // カードプレイ演出専用キュー
        this.cardPlayQueue = [];
        this.isProcessingCardPlay = false;
        
        // カードドロー演出専用キュー
        this.cardDrawQueue = [];
        this.isProcessingCardDraw = false;
        
        // 演出の依存関係管理
        this.animationDependencies = new Map(); // cardId -> { pendingAnimations: Set, completedAnimations: Set }
        this.pendingDestroyAnimations = new Map(); // cardId -> destroyAnimation
        this.scheduledCardRemovals = new Map(); // cardId -> { timestamp, element }
        
        // 要素ごとの実行中演出を追跡（重複防止用）
        this.activeElementAnimations = new Map();
        
        // システム演出キューと操作ロック機能
        this.systemAnimationQueue = []; // システム演出専用キュー
        this.isProcessingSystemAnimation = false; // システム演出処理中フラグ
        this.isGameLocked = false; // ゲーム操作ロックフラグ
        
        // 継続演出管理
        this.persistentAnimations = new Map(); // cardId -> animationType
        this.lastGameState = null; // 前回のゲーム状態
        
        this.gameState = null;

        console.log('🎬ANIM [Init] AnimationManager initialized');
    }

    /**
     * GameStateへの参照を設定
     * @param {Object} gameState - ゲーム状態オブジェクト
     */
    setGameState(gameState) {
        console.log('[DEBUG] AnimationManager.setGameState called.');
        console.log('[DEBUG] AnimationManager.setGameState received gameState:', gameState);
        this.gameState = gameState;
        console.log('[DEBUG] AnimationManager.setGameState - this.gameState after set:', this.gameState);
    }

    /**
     * システム演出かどうかを判定
     * @param {string} effectType - 演出タイプ
     * @returns {boolean} システム演出かどうか
     */
    isSystemAnimation(effectType) {
        const systemAnimations = ['TURN_ORDER_DECISION', 'TURN_START', 'TURN_END', 'GAME_RESULT'];
        return systemAnimations.includes(effectType);
    }

    /**
     * ゲーム操作をロック
     */
    lockGame() {
        this.isGameLocked = true;
        console.log('🎮GAME_ANIM [Lock] Game locked - operations disabled');
        
        // グローバルフラグも設定
        // window.currentGameState.isAnimationLocked = true; // Removed direct assignment
    }

    /**
     * ゲーム操作のロックを解除
     */
    unlockGame() {
        this.isGameLocked = false;
        console.log('🎮GAME_ANIM [Lock] Game unlocked - operations enabled');
        
        // グローバルフラグもクリア
        // if (window.currentGameState) {
        //     window.currentGameState.isAnimationLocked = false;
        // }
    }

    /**
     * 変化演出をトリガー（非同期）
     * @param {string} effectType - 演出タイプ
     * @param {HTMLElement} target - 対象要素
     * @param {Object} params - 演出パラメータ
     * @returns {Promise<Object>} 演出結果
     */
    async triggerTransientEffect(effectType, target, params = {}) {
        console.log('🎮GAME_ANIM [AnimationManager] *** ANIMATION TRIGGERED ***');
        console.log('🎮GAME_ANIM [AnimationManager] Effect type:', effectType);
        console.log('🎮GAME_ANIM [AnimationManager] Target:', !!target);
        console.log('🎮GAME_ANIM [AnimationManager] Params:', params);
        
        
        // CARD_DRAWエフェクトの場合のみ詳細ログ
        if (effectType === 'CARD_DRAW') {
            console.log('🔥ANIM_DEBUG [CARD_DRAW_CALL] *** CARD_DRAW ANIMATION CALLED ***');
        }
        
        // CARD_DAMAGEエフェクトの詳細ログ
        if (effectType === 'CARD_DAMAGE') {
            console.log('🔥ANIM_DEBUG [CARD_DAMAGE_CALL] *** CARD_DAMAGE ANIMATION CALLED ***');
        }
        
        // CARD_PLAYエフェクトの詳細ログ
        if (effectType === 'CARD_PLAY') {
            console.log('🔥ANIM_DEBUG [CARD_PLAY_CALL] *** CARD_PLAY ANIMATION CALLED ***');
        }
        
        // 仮想演出（targetが不要な演出）のリスト
        const virtualEffects = ['CARD_DRAW', 'TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION', 'EVENT_CARD_PLAYED', 'CARD_REVEALED'];
        
        if (!target && !virtualEffects.includes(effectType)) {
            console.warn('🎬ANIM [Warning] Target element not found for:', effectType);
            return { success: false, error: 'Target not found' };
        }

        const animationId = Date.now() + Math.random();
        
        try {
            // 演出をキューに追加
            const animation = {
                id: animationId,
                type: 'transient',
                effectType,
                target,
                params,
                timestamp: Date.now()
            };
            
            console.log('🎮GAME_ANIM [AnimationManager] Creating animation object:', animation);
            
            // システム演出かどうかで処理を分岐
            if (this.isSystemAnimation(effectType)) {
                console.log('🎮GAME_ANIM [AnimationManager] System animation detected:', effectType);
                return await this.queueSystemAnimation(animation);
            } else {
                // 通常の演出
                this.animationQueue.push(animation);
                console.log('🎮GAME_ANIM [AnimationManager] Animation queued:', effectType, 'Queue length:', this.animationQueue.length);
                
                // 演出を実行
                console.log('🎮GAME_ANIM [AnimationManager] About to call executeAnimation...');
                try {
                    const result = await this.executeAnimation(animation);
                    console.log('🎮GAME_ANIM [AnimationManager] executeAnimation returned:', result);
                    return result;
                } catch (executeError) {
                    console.error('🎮GAME_ANIM [AnimationManager] executeAnimation threw error:', executeError);
                    console.error('🎮GAME_ANIM [AnimationManager] Error stack:', executeError.stack);
                    throw executeError;
                }
            }
        } catch (error) {
            console.error('🎬ANIM [Error] Failed to trigger effect:', effectType, error);
            this.errors.push({ effectType, error, timestamp: Date.now() });
            return { success: false, error: error.message };
        }
    }

    /**
     * システム演出をキューに追加して順次実行
     * @param {Object} animation - 演出オブジェクト
     * @returns {Promise<Object>} 実行結果
     */
    async queueSystemAnimation(animation) {
        return new Promise((resolve) => {
            // システム演出キューに追加
            this.systemAnimationQueue.push({
                animation,
                resolve
            });
            
            console.log('🎮GAME_ANIM [SystemQueue] System animation queued:', animation.effectType, 'Queue length:', this.systemAnimationQueue.length);
            
            // キューの処理を開始
            this.processSystemAnimationQueue();
        });
    }

    /**
     * システム演出キューを順次処理
     */
    async processSystemAnimationQueue() {
        // 既に処理中の場合は何もしない
        if (this.isProcessingSystemAnimation) {
            console.log('🎮GAME_ANIM [SystemQueue] Already processing system animation queue');
            return;
        }
        
        // キューが空の場合は何もしない
        if (this.systemAnimationQueue.length === 0) {
            console.log('🎮GAME_ANIM [SystemQueue] System animation queue is empty');
            return;
        }
        
        this.isProcessingSystemAnimation = true;
        console.log('🎮GAME_ANIM [SystemQueue] Starting to process system animation queue');
        
        // ゲーム操作をロック
        this.lockGame();
        
        while (this.systemAnimationQueue.length > 0) {
            const { animation, resolve } = this.systemAnimationQueue.shift();
            console.log('🎮GAME_ANIM [SystemQueue] Processing system animation:', animation.effectType, 'Remaining in queue:', this.systemAnimationQueue.length);
            
            try {
                const result = await this.executeAnimation(animation);
                resolve(result);
            } catch (error) {
                console.error('🎮GAME_ANIM [SystemQueue] Error processing system animation:', error);
                resolve({ success: false, error: error.message });
            }
        }
        
        this.isProcessingSystemAnimation = false;
        console.log('🎮GAME_ANIM [SystemQueue] Finished processing system animation queue');
        
        // ゲーム操作のロックを解除
        this.unlockGame();
        
        // システム演出完了後、ゲーム状態の更新を通知してNPCの行動をトリガー
        // window.currentGameState.lastUpdate = Date.now(); // Removed direct mutation
        console.log('🎮GAME_ANIM [SystemQueue] Triggering state update for NPC action');
        window.dispatchEvent(new CustomEvent('systemAnimationComplete', { detail: { isGameLocked: this.isGameLocked, lastUpdate: Date.now() } }));
    }

    /**
     * 演出を実行
     * @param {Object} animation - 演出オブジェクト
     * @returns {Promise<Object>} 実行結果
     */
    async executeAnimation(animation) {
        console.log('🎮GAME_ANIM [AnimationManager] executeAnimation method entered');
        console.log('🎮GAME_ANIM [AnimationManager] Animation object:', animation);
        
        const { effectType, target, params } = animation;
        
        console.log('🎮GAME_ANIM [AnimationManager] executeAnimation called with:', effectType);
        console.log('🎮GAME_ANIM [AnimationManager] Animation params:', params);
        
        this.activeAnimations.add(animation.id);
        console.log('🔥ANIM_DEBUG [Execute] Starting animation:', effectType);
        
        let result;
        
        try {
            switch (effectType) {
                case 'CARD_PLAY':
                    console.log('🔥ANIM_DEBUG [Execute] *** EXECUTING CARD_PLAY ANIMATION ***');
                    // キューイングシステムで演出を待機
                    result = await this.queueCardPlayAnimation(target, params);
                    console.log('🔥ANIM_DEBUG [Execute] *** CARD_PLAY ANIMATION RESULT ***', result);
                    break;
                case 'EVENT_CARD_PLAYED':
                    result = await this.animateEventCardPlay(target, params);
                    break;
                case 'CARD_REVEALED':
                    result = await this.animateCardReveal(target, params);
                    break;
                case 'CARD_DRAW':
                    console.log('🎬ANIM [Execute] CARD_DRAW case reached in executeAnimation!'); // New log
                    result = await this.queueCardDrawAnimation(target, params);
                    break;
                case 'CARD_MOVE':
                    result = await this.animateCardMove(target, params);
                    break;
                case 'TURN_START':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing TURN_START case');
                    result = await this.animateTurnStart(params.playerName, params.turnNumber);
                    break;
                case 'TURN_END':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing TURN_END case');
                    result = await this.animateTurnEnd(params.playerName);
                    break;
                case 'GAME_RESULT':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing GAME_RESULT case');
                    result = await this.animateGameResult(params.isVictory, params.message);
                    break;
                case 'TURN_ORDER_DECISION':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing TURN_ORDER_DECISION case');
                    console.log('🎮GAME_ANIM [AnimationManager] Params:', params);
                    result = await this.animateTurnOrderDecision(params.firstPlayer, params.secondPlayer);
                    break;
                case 'CARD_DAMAGE':
                    
                    // ダメージか回復かを判定
                    const damageAmount = this.getCardDamageAmount(params);
                    console.log('🎬ANIM [Execute] *** CARD DAMAGE/HEAL DECISION ***');
                    console.log('🎬ANIM [Execute] Durability change amount:', damageAmount);
                    console.log('🎬ANIM [Execute] Is heal (positive change)?', damageAmount > 0);
                    console.log('🎬ANIM [Execute] Is damage (negative change)?', damageAmount < 0);
                    
                    if (damageAmount > 0) {
                        // 正の値は耐久値増加 = 回復
                        console.log('🎬ANIM [Execute] Executing HEAL animation (durability increased)');
                        result = await this.animateCardHeal(target, params);
                    } else if (damageAmount < 0) {
                        // 負の値は耐久値減少 = ダメージ
                        console.log('🎬ANIM [Execute] Executing DAMAGE animation (durability decreased)');
                        
                        result = await this.animateCardDamage(target, params);
                    } else {
                        // 0の場合はスキップ
                        console.log('🎬ANIM [Execute] Durability change is 0, skipping animation');
                        result = { success: false, reason: 'No durability change' };
                    }
                    break;
                case 'CARD_DESTROY':
                case 'CARD_DISCARD':
                    result = await this.animateCardDestroy(target, params);
                    break;
                case 'CARD_HEAL':
                    result = await this.animateCardHeal(target, params);
                    break;
                case 'CONSCIOUSNESS_CHANGE_RESULT':
                case 'SCALE_CHANGE_RESULT':
                    console.log('🔥ANIM_DEBUG [Execute] *** EXECUTING RESOURCE CHANGE ANIMATION ***');
                    result = await this.animateResourceChange(target, params, effectType);
                    console.log('🔥ANIM_DEBUG [Execute] *** RESOURCE CHANGE ANIMATION RESULT ***', result);
                    break;
                case 'LIMIT_WARNING':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing LIMIT_WARNING case');
                    result = await this.animateLimitWarning(target, params.limitType);
                    break;
                case 'EFFECT_NULLIFIED':
                    console.log('🎮GAME_ANIM [AnimationManager] Executing EFFECT_NULLIFIED case');
                    result = await this.animateEffectNullified(target);
                    break;
                default:
                    console.warn('🎬ANIM [Warning] Unknown effect type:', effectType);
                    result = { success: false, error: 'Unknown effect type' };
            }
        } catch (error) {
            console.error('🎬ANIM [Error] Animation execution failed:', effectType, error);
            result = { success: false, error: error.message };
        }
        
        // 演出完了処理
        this.activeAnimations.delete(animation.id);
        this.completedCount++;
        
        console.log('🎬ANIM [Complete] Animation completed:', effectType, 'Total completed:', this.completedCount);
        
        return result;
    }

    /**
     * テスト用演出
     * @param {HTMLElement} target - 対象要素
     * @returns {Promise<Object>} 実行結果
     */
    async testAnimation(target) {
        console.log('🎬ANIM [Test] Running test animation');
        
        if (!target) {
            return { success: false, error: 'No target element' };
        }
        
        return new Promise((resolve) => {
            // 簡単な点滅演出
            const originalBackground = target.style.backgroundColor;
            target.style.backgroundColor = '#ff0000';
            target.style.transition = 'background-color 0.5s';
            
            setTimeout(() => {
                target.style.backgroundColor = originalBackground;
                resolve({ success: true, message: 'Test animation completed' });
            }, 1000);
        });
    }

    /**
     * カードドロー演出をキューに追加
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async queueCardDrawAnimation(target, params = {}) {
        return new Promise((resolve) => {
            // キューに追加
            this.cardDrawQueue.push({
                target,
                params,
                resolve,
                timestamp: Date.now()
            });
            
            console.log('🎬ANIM [Queue] Card draw animation queued. Queue length:', this.cardDrawQueue.length);
            
            // キューの処理を開始
            this.processCardDrawQueue();
        });
    }

    /**
     * カードプレイ演出をキューに追加
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async queueCardPlayAnimation(target, params = {}) {
        return new Promise((resolve) => {
            // キューに追加
            this.cardPlayQueue.push({
                target,
                params,
                resolve,
                timestamp: Date.now()
            });
            
            console.log('🎬ANIM [Queue] Card play animation queued. Queue length:', this.cardPlayQueue.length);
            
            // キューの処理を開始
            this.processCardPlayQueue();
        });
    }

    /**
     * カードドロー演出キューを処理
     */
    async processCardDrawQueue() {
        console.log('🎬ANIM [Queue] processCardDrawQueue called!'); // New log
        // 既に処理中の場合は何もしない
        if (this.isProcessingCardDraw) {
            console.log('🎬ANIM [Queue] Already processing card draw queue');
            return;
        }
        
        // キューが空の場合は何もしない
        if (this.cardDrawQueue.length === 0) {
            console.log('🎬ANIM [Queue] Card draw queue is empty');
            return;
        }
        
        this.isProcessingCardDraw = true;
        console.log('🎬ANIM [Queue] Starting to process card draw queue');
        
        let delayIndex = 0;
        while (this.cardDrawQueue.length > 0) {
            const animation = this.cardDrawQueue.shift();
            console.log('🎬ANIM [Queue] Processing draw animation. Remaining in queue:', this.cardDrawQueue.length);
            
            // 連続ドロー演出のための遅延（最初は即座、2枚目以降は100msずつ遅延）
            if (delayIndex > 0) {
                console.log('🎬ANIM [Queue] Delaying draw animation by', delayIndex * 100, 'ms');
                await new Promise(resolve => setTimeout(resolve, delayIndex * 100));
            }
            
            try {
                const result = await this.animateCardDraw(animation.target, animation.params);
                animation.resolve(result);
            } catch (error) {
                console.error('🎬ANIM [Queue] Error processing draw animation:', error);
                animation.resolve({ success: false, error: error.message });
            }
            
            delayIndex++;
        }
        
        this.isProcessingCardDraw = false;
        console.log('🎬ANIM [Queue] Finished processing card draw queue');
    }

    /**
     * カードプレイ演出キューを処理
     */
    async processCardPlayQueue() {
        // 既に処理中の場合は何もしない
        if (this.isProcessingCardPlay) {
            console.log('🎬ANIM [Queue] Already processing card play queue');
            return;
        }
        
        // キューが空の場合は何もしない
        if (this.cardPlayQueue.length === 0) {
            console.log('🎬ANIM [Queue] Card play queue is empty');
            return;
        }
        
        this.isProcessingCardPlay = true;
        console.log('🎬ANIM [Queue] Starting to process card play queue');
        
        while (this.cardPlayQueue.length > 0) {
            const animation = this.cardPlayQueue.shift();
            console.log('🎬ANIM [Queue] Processing animation. Remaining in queue:', this.cardPlayQueue.length);
            
            try {
                const result = await this.animateCardPlay(animation.target, animation.params);
                animation.resolve(result);
            } catch (error) {
                console.error('🎬ANIM [Queue] Error processing animation:', error);
                animation.resolve({ success: false, error: error.message });
            }
        }
        
        this.isProcessingCardPlay = false;
        console.log('🎬ANIM [Queue] Finished processing card play queue');
    }

    /**
     * カードプレイ演出 - "ドンッと置く"演出
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardPlay(target, params = {}) {
        console.log('🔥ANIM_DEBUG [CardPlay] Starting "ドンッと置く" card play animation');
        console.log('🔥ANIM_DEBUG [CardPlay] Target element:', target);
        
        return new Promise((resolve) => {
            // 要素が存在するかチェック（可視性チェックを緩和）
            if (!target) {
                console.warn('🎬ANIM [CardPlay] Target element not found, skipping animation');
                console.warn('🎬ANIM [CardPlay] Effect args:', params.effect?.args);
                console.warn('🎬ANIM [CardPlay] Player ID:', params.effect?.args?.player_id);
                console.warn('🎬ANIM [CardPlay] Card ID:', params.effect?.args?.card_id);
                resolve({ success: false, reason: 'Element not found' });
                return;
            }
            

            
            // アニメーション中の要素も許可（offsetParentがnullでも続行）
            if (!target.offsetParent && target.style.position !== 'fixed') {
                console.warn('🎬ANIM [CardPlay] Target element not visible and not in animation, skipping animation');
                resolve({ success: false, reason: 'Element not visible' });
                return;
            }
            
            // 場の中央位置を計算（プレイヤーかNPCかを判定）
            const playerId = params.effect?.args?.player_id || null;
            console.log('🎬ANIM [CardPlay] Player ID from params:', playerId);
            console.log('🎬ANIM [CardPlay] Full params:', params);
            const fieldCenter = this.getFieldCenter(target, playerId || null);
            
            // 初期の最終位置（後で更新）
            let finalX = fieldCenter.x;
            let finalY = fieldCenter.y + 100;
            
            console.log('🔥ANIM_DEBUG [CardPlay] Initial final position:', { x: finalX, y: finalY });
            console.log('🔥ANIM_DEBUG [CardPlay] Field center:', fieldCenter);
            
            // 本体カードを即座に完全に隠す（CSSクラス使用）
            target.classList.add('card-animation-hidden');
            target.style.visibility = 'hidden'; // 追加の隠蔽
            
            // DOM更新を強制実行
            void target.offsetHeight;
            
            // 演出用の複製要素を作成
            const animationCard = target.cloneNode(true);
            
            // デバッグ用のID設定
            animationCard.id = 'animation-card-' + Date.now();
            
            console.log('🔥ANIM_DEBUG [CardPlay] Creating clone element');
            console.log('🔥ANIM_DEBUG [CardPlay] Field center:', fieldCenter);
            console.log('🔥ANIM_DEBUG [CardPlay] Clone ID:', animationCard.id);
            
            // 複製要素のスタイルを設定
            animationCard.classList.remove('card-animation-hidden');
            animationCard.classList.add('card-animation-clone');
            animationCard.style.position = 'fixed';
            animationCard.style.top = fieldCenter.y + 'px';
            animationCard.style.left = fieldCenter.x + 'px';
            animationCard.style.transform = 'translate(-50%, -50%) scale(2.0)';
            animationCard.style.transition = 'all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            animationCard.style.zIndex = '9999';
            animationCard.style.visibility = 'visible'; // 強制的に表示
            animationCard.style.opacity = '1'; // 強制的に不透明
            
            console.log('🔥ANIM_DEBUG [CardPlay] Clone styles set:', animationCard.style.cssText);
            
            // 複製をDOMに追加
            document.body.appendChild(animationCard);
            
            console.log('🔥ANIM_DEBUG [CardPlay] Clone added to DOM');
            
            console.log('🎬ANIM [CardPlay] Clone created and added to DOM:', animationCard);
            console.log('🎬ANIM [CardPlay] Clone styles:', animationCard.style.cssText);
            
            console.log('🎬ANIM [CardPlay] Phase 1: Animation with cloned card');
                
            // フェーズ1の完了を待つ
            setTimeout(() => {
                // フェーズ1.5: 場の中央で待機（0.5秒に延長）
                console.log('🎬ANIM [CardPlay] Phase 1.5: Wait at field center');
                
                // 待機時間の完了を待つ
                setTimeout(() => {
                    // フェーズ2: 正確な配置先座標を取得して移動
                    const updatedRect = target.getBoundingClientRect();
                    let accurateFinalX = updatedRect.left + updatedRect.width / 2;
                    let accurateFinalY = updatedRect.top + updatedRect.height / 2;
                    
                    // 座標が無効な場合のフォールバック
                    if (accurateFinalX <= 0 || accurateFinalY <= 0 || !isFinite(accurateFinalX) || !isFinite(accurateFinalY)) {
                        console.warn('🔥ANIM_DEBUG [CardPlay] Invalid coordinates detected, using field center');
                        accurateFinalX = fieldCenter.x;
                        accurateFinalY = fieldCenter.y + 50;
                    }
                    
                    console.log('🔥ANIM_DEBUG [CardPlay] Phase 2: Move to accurate final position');
                    console.log('🔥ANIM_DEBUG [CardPlay] Updated rect:', updatedRect);
                    console.log('🔥ANIM_DEBUG [CardPlay] Accurate coordinates:', { x: accurateFinalX, y: accurateFinalY });
                    
                    animationCard.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    animationCard.style.transform = 'translate(-50%, -50%) scale(1.0)';
                    animationCard.style.top = accurateFinalY + 'px';
                    animationCard.style.left = accurateFinalX + 'px';
                    
                    // フェーズ2の完了を待つ
                    setTimeout(() => {
                        // フェーズ3: 小刻みな振動（0.2秒）
                        console.log('🎬ANIM [CardPlay] Phase 3: Fine vibration effect');
                        animationCard.style.transition = 'transform 0.05s ease-in-out';
                        
                        let vibrationCount = 0;
                        const maxVibrations = 6;
                        const vibrationIntensity = 1.5;
                        
                        const vibrate = () => {
                            if (vibrationCount >= maxVibrations) {
                                // フェーズ4: 複製を削除して本体を表示
                                console.log('🎬ANIM [CardPlay] Phase 4: Remove clone and show original');
                                
                                // 複製要素を削除
                                document.body.removeChild(animationCard);

                                // トランジションを一時的に無効にして、即座に表示
                                const originalTransition = target.style.transition;
                                target.style.transition = 'none';
                                
                                // 本体カードを表示
                                target.classList.remove('card-animation-hidden');
                                target.style.visibility = '';
                                target.style.opacity = '';
                                target.style.transform = 'scale(1.0)';

                                // ブラウザがスタイルを適用するのを待ってからトランジションを戻す
                                setTimeout(() => {
                                    target.style.transition = originalTransition;
                                }, 50); // わずかな遅延
                                
                                // CSSルールも削除とアニメーション状態をクリア
                                const cardId = target.dataset.cardId;
                                if (cardId) {
                                    const styleElement = document.getElementById(`hide-${cardId}`);
                                    if (styleElement) {
                                        styleElement.remove();
                                        console.log('🔥ANIM_DEBUG [CardPlay] Removed CSS hiding rule for:', cardId);
                                    }
                                    animationStateManager.setAnimationCompleted(cardId);
                                }
                                if (cardId) {
                                    animationStateManager.setAnimationCompleted(cardId);
                                }
                                
                                console.log('🔥ANIM_DEBUG [CardPlay] Animation completed');
                                resolve({ success: true, duration: 1250 }); // 総時間を調整
                                return;
                            }
                            
                            const offsetX = (vibrationCount % 2 === 0) ? vibrationIntensity : -vibrationIntensity;
                            const offsetY = (vibrationCount % 2 === 0) ? vibrationIntensity : -vibrationIntensity;
                            
                            animationCard.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(1.0)`;
                            
                            vibrationCount++;
                            setTimeout(vibrate, 35);
                        };
                        
                        vibrate();
                    }, 400);
                }, 500); // 待機時間を0.3秒から0.5秒に延長
            }, 150); // フェーズ1の完了を待つ
        });
    }

    /**
     * 
     * @param {*} target 
     * @param {*} params 
     * @returns 
     */
    async animateEventCardPlay(target, params = {}) {
        console.log('[DEBUG] animateEventCardPlay: Start');
        return new Promise((resolve) => {
            let animationCard;
    
            if (target) {
                console.log('[DEBUG] animateEventCardPlay: Target found, cloning.');
                animationCard = target.cloneNode(true);
                animationCard.classList.remove('card-animation-hidden');
            } else {
                console.log('[DEBUG] animateEventCardPlay: Target is null, creating virtual card.');
                const cardId = params.effect?.args?.card_id;
                const cardInstance = this.gameState?.all_card_instances[cardId];

                if (!cardInstance || !cardInstance.name || !this.gameState || !this.gameState.cardDefs) {
                    console.log('[DEBUG] animateEventCardPlay: Aborting virtual card creation due to missing data.');
                    console.log(`[DEBUG]   cardId: ${cardId}`);
                    console.log(`[DEBUG]   cardInstance: ${cardInstance ? JSON.stringify(cardInstance) : 'null/undefined'}`);
                    console.log(`[DEBUG]   cardInstance.name: ${cardInstance?.name}`);
                    console.log(`[DEBUG]   this.gameState: ${this.gameState ? 'exists' : 'null/undefined'}`);
                    console.log(`[DEBUG]   this.gameState.cardDefs: ${this.gameState?.cardDefs ? 'exists' : 'null/undefined'}`);
                    resolve({ success: false, reason: 'Missing data for virtual card' });
                    return;
                }
                const cardData = this.gameState.cardDefs[cardInstance.name]; // Use card name for lookup
                if (!cardData) {
                    console.log(`[DEBUG] animateEventCardPlay: Card data not found for name: ${cardInstance.name}`);
                    resolve({ success: false, reason: 'Card definition not found' });
                    return;
                }
    
                // Create a virtual card element
                animationCard = document.createElement('div');
                animationCard.className = `card-game card-type-${cardData.card_type}`;
                animationCard.innerHTML = `
                    <div class="card-header">
                      <div class="card-name">${cardData.name}</div>
                    </div>
                    <div class="card-center"></div>
                    <div class="card-footer">
                      <div class="card-cost">規模: ${cardData.required_scale}</div>
                    </div>
                `;
                console.log(`[DEBUG] animateEventCardPlay: Virtual card created for ${cardData.name}`);
            }
    
            const playerId = params.effect?.args?.player_id || null;
            const fieldCenter = this.getFieldCenter(target, playerId);
            console.log('[DEBUG] animateEventCardPlay: Field center calculated:', fieldCenter);
    
            animationCard.classList.add('card-animation-clone');
            animationCard.style.position = 'fixed';
            animationCard.style.top = `${fieldCenter.y}px`;
            animationCard.style.left = `${fieldCenter.x + 150}px`;
            animationCard.style.transform = 'translate(-50%, -50%) scale(1.5)';
            animationCard.style.transition = 'all 0.3s ease-out';
            animationCard.style.zIndex = '9999';
    
            document.body.appendChild(animationCard);
            console.log('[DEBUG] animateEventCardPlay: Cloned/virtual card appended to body.');
    
            setTimeout(() => {
                console.log('[DEBUG] animateEventCardPlay: Creating particle explosion.');
                this.createParticleExplosion(animationCard, '事象');
                setTimeout(() => {
                    console.log('[DEBUG] animateEventCardPlay: Fading out card.');
                    animationCard.style.transition = 'opacity 0.5s ease-out';
                    animationCard.style.opacity = '0';
                    setTimeout(() => {
                        console.log('[DEBUG] animateEventCardPlay: Removing card from DOM.');
                        if (animationCard.parentNode) {
                            document.body.removeChild(animationCard);
                        }
                        resolve({ success: true, duration: 800 });
                    }, 500);
                }, 300);
            }, 100);
        });
    }

    /**
     * 
     * @param {*} target 
     * @param {*} params 
     * @returns 
     */
    async animateCardReveal(target, params = {}) {
        const cardId = params.effect?.args?.card_id;
        const cardInstance = this.gameState?.all_card_instances[cardId];
        const cardData = cardInstance ? this.gameState?.cardDefs[cardInstance.name] : null;

        return new Promise((resolve) => {
            if (!cardInstance || !cardInstance.name || !this.gameState || !this.gameState.cardDefs || !cardData) {
                resolve({ success: false, reason: 'Missing data for virtual card' });
                return;
            }

            // Create a virtual card element
            const animationCard = document.createElement('div');
            animationCard.className = `card-game card-type-${cardData.card_type}`;
            animationCard.innerHTML = `
                <div class="card-header">
                  <div class="card-name">${cardData.name}</div>
                </div>
                <div class="card-center"></div>
                <div class="card-footer">
                  <div class="card-cost">規模: ${cardData.required_scale}</div>
                </div>
            `;

            const playerId = params.effect?.args?.player_id || null;
            const fieldCenter = this.getFieldCenter(null, playerId);

            // Set initial position for slide-in
            const initialY = playerId === 'PLAYER1' ? `${fieldCenter.y + 100}px` : `${fieldCenter.y - 100}px`;

            animationCard.classList.add('card-animation-clone');
            animationCard.style.position = 'fixed';
            animationCard.style.top = initialY;
            animationCard.style.left = `${fieldCenter.x}px`;
            animationCard.style.transform = 'translate(-50%, -50%) scale(1.5)';
            animationCard.style.zIndex = '9999';
            animationCard.style.opacity = '0';
            animationCard.style.transition = 'all 0.8s ease-in-out';

            document.body.appendChild(animationCard);

            // Slide in and fade in
            setTimeout(() => {
                animationCard.style.top = `${fieldCenter.y}px`;
                animationCard.style.opacity = '1';
            }, 100);

            // Hold and then slide out
            setTimeout(() => {
                this.createParticleExplosion(animationCard, cardData.card_type);
                setTimeout(() => {
                    const slideDirection = playerId === 'PLAYER1' ? '150%' : '-150%';
                    animationCard.style.transition = 'opacity 0.8s ease-in-out, top 0.8s ease-in-out';
                    animationCard.style.opacity = '0';
                    animationCard.style.top = slideDirection;
                    setTimeout(() => {
                        if (animationCard.parentNode) {
                            document.body.removeChild(animationCard);
                        }
                        resolve({ success: true, duration: 2600 });
                    }, 800);
                }, 1000); 
            }, 800);
        });
    }

    /**
     * 場の中央位置を計算
     * @param {HTMLElement} target - 対象カード要素
     * @param {string} playerId - プレイヤーID (PLAYER1 or PLAYER2)
     * @returns {Object} 場の中央座標 {x, y}
     */
    getFieldCenter(target, playerId) {
        // プレイヤーIDから適切な場を特定
        let fieldElement = null;
        
        if (playerId) {
            // イデオロギーカードかどうかを判定
            const isIdeologyCard = target && (target.closest('.ideology-area') || target.classList.contains('card-type-イデオロギー'));
            
            if (isIdeologyCard) {
                // イデオロギーエリアを取得
                if (playerId === 'PLAYER1') {
                    fieldElement = document.querySelector('.player-ideology-area') || document.querySelector('.player-field-area');
                } else if (playerId === 'PLAYER2') {
                    fieldElement = document.querySelector('.opponent-ideology-area') || document.querySelector('.opponent-field-area');
                }
            } else {
                // 財カードの場合
                if (playerId === 'PLAYER1') {
                    fieldElement = document.querySelector('.player-field-area .wealth-cards-scrollable');
                } else if (playerId === 'PLAYER2') {
                    fieldElement = document.querySelector('.opponent-field-area .wealth-cards-scrollable');
                }
            }
        }
        
        // フォールバック: カードの親要素から場を特定
        if (!fieldElement && target) {
            fieldElement = target.closest('.player-field-area, .opponent-field-area');
            if (fieldElement) {
                fieldElement = fieldElement.querySelector('.wealth-cards-scrollable');
            }
        }
        
        // さらなるフォールバック: wealth-cards-scrollableエリアを探す
        if (!fieldElement && target) {
            fieldElement = target.closest('.wealth-cards-scrollable');
        }
        
        if (!fieldElement) {
            // 最終フォールバック: 画面中央
            console.warn('🎬ANIM [CardPlay] Could not find field element, using screen center');
            return {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
        }
        
        const fieldRect = fieldElement.getBoundingClientRect();
        const centerX = fieldRect.left + fieldRect.width / 2;
        const centerY = fieldRect.top + fieldRect.height / 2;
        
        console.log('🎬ANIM [CardPlay] Field element:', fieldElement);
        console.log('🎬ANIM [CardPlay] Field rect:', fieldRect);
        console.log('🎬ANIM [CardPlay] Player ID:', playerId);
        
        return {
            x: centerX,
            y: centerY
        };
    }

    /**
     * カードドロー演出 - 右から左へのスライドイン
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardDraw(target, params = {}) {
        console.log('🎬ANIM [CardDraw] animateCardDraw called!'); // New log
        console.log('🎬ANIM [CardDraw] *** STARTING CARD DRAW ANIMATION ***');
        console.log('🎬ANIM [CardDraw] Target element:', target);
        console.log('🎬ANIM [CardDraw] Effect type from params:', params.effect?.effect_type);
        
        return new Promise((resolve) => {
            // DRAW_CARDは仮想演出なので、targetがnullでも実行
            if (!target) {
                console.log('🎬ANIM [CardDraw] *** EXECUTING VIRTUAL CARD DRAW ANIMATION ***');
                console.log('🎬ANIM [CardDraw] Virtual animation params:', params);
                // 仮想的なカードドロー演出を実行
                this.executeVirtualCardDraw(params, resolve);
                return;
            }
            
            // 本体カードを即座に隠す（カードプレイと同じ仕組み）
            target.classList.add('card-animation-hidden');
            
            // DOM更新を強制実行
            void target.offsetHeight;
            
            // 最終的な配置先の位置を取得
            const finalRect = target.getBoundingClientRect();
            const finalX = finalRect.left + finalRect.width / 2;
            const finalY = finalRect.top + finalRect.height / 2;
            
            console.log('🎬ANIM [CardDraw] Final position:', { x: finalX, y: finalY });
            
            // 演出用の複製要素を作成
            const animationCard = target.cloneNode(true);
            
            // デバッグ用のID設定
            animationCard.id = 'animation-card-draw-' + Date.now();
            
            // 複製要素を画面右端から開始
            animationCard.classList.remove('card-animation-hidden');
            animationCard.classList.add('card-animation-clone');
            animationCard.style.position = 'fixed';
            animationCard.style.top = finalY + 'px';
            animationCard.style.left = (window.innerWidth + 100) + 'px'; // 画面右端外から開始
            animationCard.style.transform = 'translate(-50%, -50%)';
            animationCard.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            animationCard.style.zIndex = '9999';
            
            // 複製をDOMに追加
            document.body.appendChild(animationCard);
            
            console.log('🎬ANIM [CardDraw] Clone created and positioned at screen right');
            
            // 少し待ってからスライドイン開始
            setTimeout(() => {
                // 最終位置にスライドイン
                console.log('🎬ANIM [CardDraw] Starting slide-in animation');
                animationCard.style.left = finalX + 'px';
                
                // アニメーション完了を待つ
                setTimeout(() => {
                    // 複製要素を削除
                    document.body.removeChild(animationCard);
                    
                    // 本体カードを表示
                    target.classList.remove('card-animation-hidden');
                    
                    // アニメーション状態をクリア
                    const cardId = target.dataset.cardId;
                    if (cardId) {
                        animationStateManager.setAnimationCompleted(cardId);
                    }
                    
                    // 演出完了時にすべてのカードの可視化を復元
                    this.restoreAllCardVisibility();
                    
                    console.log('🎬ANIM [CardDraw] Animation completed');
                    resolve({ success: true, duration: 550 });
                }, 500); // スライドイン時間
            }, 50); // 初期配置後の待機時間
        });
    }

    /**
     * 仮想カードドロー演出（対象カードが存在しない場合）
     * @param {Object} params - パラメータ
     * @param {Function} resolve - Promise resolve関数
     */
    executeVirtualCardDraw(params, resolve) {
        console.log("executeVirtualCardDraw called!");
        console.log('🎬ANIM [CardDraw] Executing virtual draw animation');
        
        // プレイヤーIDを取得してドロー先を決定
        const playerId = params.effect?.args?.player_id;
        console.log('🎬ANIM [CardDraw] *** Player ID for draw:', playerId, '***');
        console.log('🎬ANIM [CardDraw] Full effect args:', params.effect?.args);
        
        let handArea, finalX, finalY;
        
        if (playerId === 'PLAYER2') {
            console.log('🎬ANIM [CardDraw] *** NPC DRAW DETECTED ***');
            // NPCの場合：画面上部の見やすい位置に表示
            const npcInfoArea = document.querySelector('.opponent-info');
            if (!npcInfoArea) {
                console.warn('🎬ANIM [CardDraw] NPC info area not found, using screen top');
                finalX = window.innerWidth - 100; // プレイヤーと同じく画面右端付近
                finalY = 100; // 画面上部
                console.log('🎬ANIM [CardDraw] NPC finalX (fallback):', finalX, 'window.innerWidth:', window.innerWidth);
            } else {
                const npcRect = npcInfoArea.getBoundingClientRect();
                finalX = window.innerWidth - 100; // プレイヤーと同じく画面右端付近
                finalY = npcRect.bottom + 30; // NPC情報エリアの少し下
                console.log('🎬ANIM [CardDraw] *** NPC finalX:', finalX, 'window.innerWidth:', window.innerWidth, '***');
            }
        } else {
            // プレイヤーの場合：手札エリア付近に表示
            handArea = document.querySelector('.player-hand-area');
            console.log('🎬ANIM [CardDraw] Player hand area element:', handArea);
            if (!handArea) {
                console.warn('🎬ANIM [CardDraw] Player hand area not found');
                resolve({ success: false, reason: 'Player hand area not found' });
                return;
            }
            const handRect = handArea.getBoundingClientRect();
            console.log('🎬ANIM [CardDraw] Player hand area rect:', handRect);
            finalX = window.innerWidth - 100; // 画面右端付近で統一
            finalY = handRect.top + handRect.height / 2;
            console.log('🎬ANIM [CardDraw] Player finalX:', finalX, 'window.innerWidth:', window.innerWidth);
            console.log('🎬ANIM [CardDraw] Player finalY:', finalY);
        }
        
        // 仮想カード要素を作成
        const virtualCard = document.createElement('div');
        virtualCard.className = 'card-game card-type-財 card-animation-clone'; // Use card-game for correct styling
        virtualCard.style.position = 'fixed';
        // Do not set width/height, as it's now handled by the 'card-game' class
        virtualCard.style.backgroundColor = '#f0f0f0';
        virtualCard.style.border = '2px solid #ccc';
        virtualCard.style.borderRadius = '8px';
        virtualCard.style.display = 'flex';
        virtualCard.style.alignItems = 'center';
        virtualCard.style.justifyContent = 'center';
        virtualCard.style.fontSize = '12px';
        virtualCard.style.color = '#666';
        virtualCard.textContent = 'ドロー';
        
        // 画面右端からスライドイン開始（プレイヤーと同じ距離）
        const startX = window.innerWidth + 100;
        virtualCard.style.top = finalY + 'px';
        virtualCard.style.left = startX + 'px';
        virtualCard.style.transform = 'translate(-50%, -50%)';
        virtualCard.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // 時間も短縮
        virtualCard.style.zIndex = '9999';
        
        // DOMに追加
        document.body.appendChild(virtualCard);
        
        console.log('🎬ANIM [CardDraw] Virtual card element created and appended to body:', virtualCard);
        console.log('🎬ANIM [CardDraw] Virtual card initial style:', virtualCard.style.cssText);
        
        // 少し待ってからスライドイン開始
        setTimeout(() => {
            console.log('🎬ANIM [CardDraw] Starting virtual slide-in animation');
            virtualCard.style.left = finalX + 'px';
            
            // アニメーション完了を待つ
            setTimeout(() => {
                // 仮想カード要素を削除
                document.body.removeChild(virtualCard);
                
                // 演出完了時にすべてのカードの可視化を復元
                this.restoreAllCardVisibility();
                
                console.log('🎬ANIM [CardDraw] Virtual animation completed');
                resolve({ success: true, duration: 350 });
            }, 300); // スライドイン時間を短縮
        }, 50); // 初期配置後の待機時間
    }

    /**
     * カード移動演出
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardMove(target, params = {}) {
        console.log('🎬ANIM [CardMove] Starting card move animation');
        
        // カード移動は基本的にはカードプレイ演出と同じ
        return await this.animateCardPlay(target, params);
    }

    /**
     * カード破壊・除去演出
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardDestroy(target, params = {}) {
        console.log('🎬ANIM [CardDestroy] Starting card destroy animation');
        console.log('🎬ANIM [CardDestroy] Target element:', target);
        console.log('🎬ANIM [CardDestroy] Params:', params);
        
        return new Promise((resolve) => {
            if (!target) {
                console.warn('🎬ANIM [CardDestroy] Target element not found');
                resolve({ success: false, reason: 'Element not found' });
                return;
            }
            
            // カードタイプを取得（パーティクル色決定用）
            const cardType = this.getCardTypeFromElement(target, params);
            console.log('🎬ANIM [CardDestroy] Card type:', cardType);
            
            // フェードアウト演出を開始
            target.classList.add('card-destroy-animation');
            
            // パーティクル演出を実行（事象カード以外）
            if (cardType !== '事象') {
                this.createParticleExplosion(target, cardType);
            }
            
            // アニメーション完了を待つ
            setTimeout(() => {
                // アニメーションクラスを削除
                target.classList.remove('card-destroy-animation');
                
                // カードを完全に非表示にする（一瞬見えるのを防ぐ）
                target.style.visibility = 'hidden';
                target.style.opacity = '0';
                
                // アニメーション状態をクリア
                const cardId = target.dataset.cardId;

                // Removed: this.restoreAllCardVisibility(); // <-- THIS WAS THE BUG
                
                console.log('🎬ANIM [CardDestroy] Animation completed, card hidden');
                resolve({ success: true, duration: 600 });
            }, 600); // CSS animationの時間と合わせる
        });
    }

    /**
     * カード回復演出
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardHeal(target, params = {}) {
        console.log('🎬ANIM [CardHeal] Starting card heal animation');
        console.log('🎬ANIM [CardHeal] Target:', target);
        console.log('🎬ANIM [CardHeal] Params:', params);
        
        return new Promise((resolve) => {
            if (!target) {
                console.warn('🎬ANIM [CardHeal] Target element not found');
                resolve({ success: false, reason: 'Element not found' });
                return;
            }
            
            // 重複演出チェック（連続エフェクト対応）
            const cardId = target.dataset.cardId;
            const elementKey = `card-${cardId}`;
            if (this.activeElementAnimations.has(elementKey)) {
                console.log('🎬ANIM [CardHeal] Animation already running for card, extending duration:', cardId);
                // 既存の演出を延長
                const existingAnimation = this.activeElementAnimations.get(elementKey);
                if (existingAnimation && existingAnimation.type === 'heal') {
                    resolve({ success: true, reason: 'Extended existing animation' });
                    return;
                }
            }
            
            // 実行中演出として記録
            this.activeElementAnimations.set(elementKey, { type: 'heal' });
            
            // 既存のアニメーションクラスをクリア
            target.classList.remove('card-damage-animation', 'card-heal-animation');
            
            console.log('🎬ANIM [CardHeal] *** EXECUTING HEAL ANIMATION ***');
            
            // バウンド演出を開始
            target.classList.add('card-heal-animation');
            
            // アニメーション完了を待つ
            setTimeout(() => {
                // アニメーションクラスを削除
                target.classList.remove('card-heal-animation');
                
                // 実行中演出から削除
                this.activeElementAnimations.delete(elementKey);
                
                // 演出完了時にすべてのカードの可視化を復元
                this.restoreAllCardVisibility();
                
                console.log('🎬ANIM [CardHeal] Animation completed');
                resolve({ success: true, duration: 800 });
            }, 800); // CSS animationの時間と合わせる
        });
    }

    /**
     * カードダメージ演出
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {Promise<Object>} 実行結果
     */
    async animateCardDamage(target, params = {}) {
        // 強制ログ - 必ず出力される
        console.log('🚨 FORCE_LOG: animateCardDamage method called!');
        console.log('🚨 FORCE_LOG: target:', !!target);
        console.log('🚨 FORCE_LOG: params:', params);
        
        // 戦士と略奪を区別するログ
        const sourceCardName = params.sourceCard ? params.sourceCard.name : 'Unknown';
        const debugPrefix = sourceCardName === '戦士' ? '🔥WARRIOR_DAMAGE' : sourceCardName === '略奪' ? '🔥LOOTING_DAMAGE' : '🎬ANIM';
        
        console.log('🚨 FORCE_LOG: sourceCardName:', sourceCardName);
        console.log('🚨 FORCE_LOG: debugPrefix:', debugPrefix);
        
        console.log(`${debugPrefix} [CardDamage] *** STARTING DAMAGE ANIMATION ***`);
        console.log(`${debugPrefix} [CardDamage] Source card:`, sourceCardName);
        console.log(`${debugPrefix} [CardDamage] Target element:`, target);
        console.log(`${debugPrefix} [CardDamage] Target tagName:`, target ? target.tagName : 'null');
        console.log(`${debugPrefix} [CardDamage] Target className:`, target ? target.className : 'null');
        console.log(`${debugPrefix} [CardDamage] Target cardId:`, target ? target.dataset.cardId : 'null');
        console.log(`${debugPrefix} [CardDamage] Params:`, params);
        
        return new Promise((resolve) => {
            if (!target) {
                console.warn(`${debugPrefix} [CardDamage] Target element not found`);
                resolve({ success: false, reason: 'Element not found' });
                return;
            }
            
            // DOM要素の詳細状態をログ
            console.log(`${debugPrefix} [CardDamage] Target computed style display:`, window.getComputedStyle(target).display);
            console.log(`${debugPrefix} [CardDamage] Target computed style visibility:`, window.getComputedStyle(target).visibility);
            console.log(`${debugPrefix} [CardDamage] Target computed style opacity:`, window.getComputedStyle(target).opacity);
            console.log(`${debugPrefix} [CardDamage] Target offsetWidth:`, target.offsetWidth);
            console.log(`${debugPrefix} [CardDamage] Target offsetHeight:`, target.offsetHeight);
            
            // 重複演出チェック
            const cardId = target.dataset.cardId;
            const elementKey = `card-${cardId}`;
            
            console.log(`${debugPrefix} [CardDamage] Card ID:`, cardId);
            console.log(`${debugPrefix} [CardDamage] Element key:`, elementKey);
            console.log(`${debugPrefix} [CardDamage] Active animations:`, this.activeElementAnimations);
            
            if (this.activeElementAnimations.has(elementKey)) {
                console.log(`${debugPrefix} [CardDamage] Animation already running for card, extending duration:`, cardId);
                const existingAnimation = this.activeElementAnimations.get(elementKey);
                if (existingAnimation && existingAnimation.type === 'damage') {
                    resolve({ success: true, reason: 'Extended existing animation' });
                    return;
                }
            }
            
            // 実行中演出として記録
            this.activeElementAnimations.set(elementKey, { type: 'damage' });
            console.log(`${debugPrefix} [CardDamage] Added to active animations:`, elementKey);
            
            // 既存のアニメーションクラスをクリア
            console.log(`${debugPrefix} [CardDamage] Classes before clear:`, target.className);
            target.classList.remove('card-damage-animation', 'card-heal-animation');
            console.log(`${debugPrefix} [CardDamage] Classes after clear:`, target.className);
            
            console.log(`${debugPrefix} [CardDamage] *** ADDING DAMAGE ANIMATION CLASS ***`);
            
            // 振動・点滅演出を開始
            target.classList.add('card-damage-animation');
            console.log(`${debugPrefix} [CardDamage] Classes after add:`, target.className);
            
            // CSSアニメーションが適用されているかチェック
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(target);
                console.log(`${debugPrefix} [CardDamage] Animation name:`, computedStyle.animationName);
                console.log(`${debugPrefix} [CardDamage] Animation duration:`, computedStyle.animationDuration);
                console.log(`${debugPrefix} [CardDamage] Animation play state:`, computedStyle.animationPlayState);
            }, 50);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                console.log(`${debugPrefix} [CardDamage] *** ANIMATION TIMEOUT REACHED ***`);
                console.log(`${debugPrefix} [CardDamage] About to remove animation class`);
                
                // アニメーションクラスを削除
                target.classList.remove('card-damage-animation');
                console.log(`${debugPrefix} [CardDamage] Classes after remove:`, target.className);
                
                // 実行中演出から削除
                this.activeElementAnimations.delete(elementKey);
                console.log(`${debugPrefix} [CardDamage] Removed from active animations:`, elementKey);
                
                // カードの演出完了を記録し、待機中の破壊演出があれば実行
                const cardId = target.dataset?.cardId;
                if (cardId) {
                    this.markCardAnimationCompleted(cardId, 'CARD_DAMAGE');
                }
                
                // 演出完了時にすべてのカードの可視化を復元
                this.restoreAllCardVisibility();
                
                console.log(`${debugPrefix} [CardDamage] *** ANIMATION COMPLETED SUCCESSFULLY ***`);
                resolve({ success: true, duration: 800 });
            }, 800); // CSS animationの時間と合わせる
        });
    }

    /**
     * カード耐久値変化量を取得
     * @param {Object} params - パラメータ
     * @returns {number} 耐久値変化量（正の値は回復、負の値はダメージ）
     */
    getCardDamageAmount(params) {
        // パラメータから変化量を取得
        if (params.effect?.args?.amount !== undefined) {
            return params.effect.args.amount;
        }
        
        // durability_changeから取得
        if (params.effect?.args?.durability_change !== undefined) {
            return params.effect.args.durability_change;
        }
        
        // original_amountから取得
        if (params.effect?.args?.original_amount !== undefined) {
            return params.effect.args.original_amount;
        }
        
        // actual_amountから取得
        if (params.effect?.args?.actual_amount !== undefined) {
            return params.effect.args.actual_amount;
        }
        
        // デフォルトはダメージ
        return -1;
    }

    /**
     * カード要素からカードタイプを取得
     * @param {HTMLElement} target - 対象カード要素
     * @param {Object} params - パラメータ
     * @returns {string} カードタイプ
     */
    getCardTypeFromElement(target, params) {
        // 1. CSSクラスから取得を試行
        if (target.classList.contains('card-type-財')) {
            return '財';
        }
        if (target.classList.contains('card-type-イデオロギー')) {
            return 'イデオロギー';
        }
        if (target.classList.contains('card-type-事象')) {
            return '事象';
        }
        
        // 2. data属性から取得を試行
        const cardType = target.dataset.cardType;
        if (cardType) {
            return cardType;
        }
        
        // 3. パラメータから取得を試行
        if (params.effect?.args?.card_type) {
            return params.effect.args.card_type;
        }
        
        // 4. カード名から推測（フォールバック）
        const cardNameElement = target.querySelector('.card-name');
        if (cardNameElement) {
            const cardName = cardNameElement.textContent;
            // 簡単な推測ロジック（必要に応じて拡張）
            if (cardName.includes('財') || cardName.includes('資源')) {
                return '財';
            }
            if (cardName.includes('主義') || cardName.includes('思想')) {
                return 'イデオロギー';
            }
        }
        
        // デフォルトは財カード
        console.warn('🎬ANIM [CardDestroy] Could not determine card type, defaulting to 財');
        return '財';
    }

    /**
     * パーティクル爆発演出を作成
     * @param {HTMLElement} target - 対象カード要素
     * @param {string} cardType - カードタイプ
     */
    createParticleExplosion(target, cardType) {
        console.log('🎬ANIM [Particle] Creating particle explosion for card type:', cardType);
        
        // カードの中心位置を取得
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // パーティクルの色を決定
        const particleClass = cardType === '財' ? 'particle-wealth' : 
                              cardType === '事象' ? 'particle-event' : 'particle-ideology';
        
        // パーティクル数
        const particleCount = 12;
        
        // パーティクルを生成
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${particleClass}`;
            
            // 放射状の角度を計算
            const angle = (i / particleCount) * 2 * Math.PI;
            const distance = 60 + Math.random() * 40; // 60-100pxの範囲でランダム
            const randomScale = 0.8 + Math.random() * 0.4; // 0.8-1.2倍のランダムスケール
            
            // 初期位置（カードの中心）
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.position = 'fixed';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            // 初期状態：小さくて透明度高め
            particle.style.transform = 'translate(-50%, -50%) scale(0.2)';
            particle.style.opacity = '0.9';
            particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            particle.style.animation = 'none'; // CSSアニメーションを無効化
            
            // DOMに追加
            document.body.appendChild(particle);
            
            // 少し遅延してから拡散開始（視覚効果向上）
            setTimeout(() => {
                const endX = centerX + Math.cos(angle) * distance;
                const endY = centerY + Math.sin(angle) * distance;
                
                // 拡大しながら拡散し、フェードアウト
                particle.style.left = endX + 'px';
                particle.style.top = endY + 'px';
                particle.style.transform = `translate(-50%, -50%) scale(${randomScale})`;
                particle.style.opacity = '0';
            }, 50);
            
            // パーティクルを自動削除
            setTimeout(() => {
                if (particle.parentNode) {
                    document.body.removeChild(particle);
                }
            }, 900); // アニメーション時間より少し長め
        }
        
        console.log('🎬ANIM [Particle] Created', particleCount, 'particles');
    }

    /**
     * リソース変化演出
     * @param {HTMLElement} target - 対象要素
     * @param {Object} params - パラメータ
     * @param {string} effectType - 効果タイプ
     * @returns {Promise<Object>} 実行結果
     */
    async animateResourceChange(target, params, effectType) {
        console.log('🔥ANIM_DEBUG [ResourceChange] Starting resource change animation:', effectType);
        console.log('🔥ANIM_DEBUG [ResourceChange] Target element:', target);
        console.log('🔥ANIM_DEBUG [ResourceChange] Params:', params);
        
        return new Promise((resolve) => {
            if (!target) {
                console.warn('🎬ANIM [ResourceChange] Target element not found');
                resolve({ success: false, reason: 'Element not found' });
                return;
            }
            
            // 重複演出チェック
            const elementKey = this.getElementKey(target);
            if (this.activeElementAnimations.has(elementKey)) {
                console.log('🎬ANIM [ResourceChange] Animation already running for element, skipping:', elementKey);
                resolve({ success: false, reason: 'Animation already running' });
                return;
            }
            
            // 変化量を取得
            const changeAmount = this.getResourceChangeAmount(params, effectType);
            
            // 変化量が0の場合はスキップ
            if (changeAmount === 0) {
                console.log('🎬ANIM [ResourceChange] Change amount is 0, skipping animation');
                resolve({ success: false, reason: 'No change' });
                return;
            }
            
            const isIncrease = changeAmount > 0;
            
            console.log('🎬ANIM [ResourceChange] *** RESOURCE CHANGE ANIMATION ***');
            console.log('🎬ANIM [ResourceChange] Effect type:', effectType);
            console.log('🎬ANIM [ResourceChange] Change amount:', changeAmount);
            console.log('🎬ANIM [ResourceChange] Is increase?', isIncrease);
            console.log('🎬ANIM [ResourceChange] Will use animation class:', isIncrease ? 'resource-increase-animation' : 'resource-decrease-animation');
            
            // 実行中演出として記録
            this.activeElementAnimations.set(elementKey, { effectType, changeAmount, isIncrease });
            
            // 既存のアニメーションクラスをクリア
            target.classList.remove('resource-increase-animation', 'resource-decrease-animation');
            
            // 数値の点滅演出を開始
            const animationClass = isIncrease ? 'resource-increase-animation' : 'resource-decrease-animation';
            target.classList.add(animationClass);
            
            // 変化量インジケーターを表示
            this.showResourceChangeIndicator(target, changeAmount, isIncrease);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                // アニメーションクラスを削除
                target.classList.remove(animationClass);
                
                // 実行中演出から削除
                this.activeElementAnimations.delete(elementKey);
                
                // 演出完了時にすべてのカードの可視化を復元
                this.restoreAllCardVisibility();
                
                console.log('🎬ANIM [ResourceChange] Animation completed');
                resolve({ success: true, duration: 800 });
            }, 800); // CSS animationの時間と合わせる
        });
    }

    /**
     * 要素のキーを生成（重複チェック用）
     * @param {HTMLElement} target - 対象要素
     * @returns {string} 要素キー
     */
    getElementKey(target) {
        // data-player-idを持つ親要素を探す
        const playerElement = target.closest('[data-player-id]');
        const playerId = playerElement ? playerElement.dataset.playerId : 'unknown';
        
        // 意識か規模かを判定
        const resourceType = target.closest('.consciousness') ? 'consciousness' : 
                           target.closest('.scale') ? 'scale' : 'unknown';
        
        return `${playerId}-${resourceType}`;
    }

    /**
     * リソース変化量を取得
     * @param {Object} params - パラメータ
     * @param {string} effectType - 効果タイプ
     * @returns {number} 変化量
     */
    getResourceChangeAmount(params, effectType) {
        // パラメータから変化量を取得（複数のフィールドを確認）
        const args = params.effect?.args || {};
        
        console.log('🔥ANIM_DEBUG [ResourceChange] Getting change amount from args:', args);
        
        if (args.amount !== undefined) {
            console.log('🔥ANIM_DEBUG [ResourceChange] Using amount:', args.amount);
            return args.amount;
        }
        
        if (args.actual_amount !== undefined) {
            console.log('🔥ANIM_DEBUG [ResourceChange] Using actual_amount:', args.actual_amount);
            return args.actual_amount;
        }
        
        if (args.original_amount !== undefined) {
            console.log('🔥ANIM_DEBUG [ResourceChange] Using original_amount:', args.original_amount);
            return args.original_amount;
        }
        
        // 効果タイプから推測（フォールバック）
        if (effectType.includes('INCREASE')) {
            console.log('🔥ANIM_DEBUG [ResourceChange] Using default increase: 1');
            return 1; // デフォルト増加量
        } else if (effectType.includes('DECREASE')) {
            console.log('🔥ANIM_DEBUG [ResourceChange] Using default decrease: -1');
            return -1; // デフォルト減少量
        }
        
        console.log('🔥ANIM_DEBUG [ResourceChange] No change amount found, returning 0');
        return 0;
    }

    /**
     * リソース変化インジケーターを表示
     * @param {HTMLElement} target - 対象要素
     * @param {number} changeAmount - 変化量
     * @param {boolean} isIncrease - 増加かどうか
     */
    showResourceChangeIndicator(target, changeAmount, isIncrease) {
        console.log('🎬ANIM [ResourceChange] Showing change indicator:', changeAmount);
        
        // インジケーター要素を作成
        const indicator = document.createElement('div');
        indicator.className = `resource-change-indicator ${isIncrease ? 'resource-change-increase' : 'resource-change-decrease'}`;
        indicator.textContent = isIncrease ? `+${changeAmount}` : `${changeAmount}`;
        
        // 対象要素の位置を取得
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // インジケーターの位置を設定
        indicator.style.position = 'fixed';
        indicator.style.left = centerX + 'px';
        indicator.style.top = (centerY - 20) + 'px'; // 少し上に表示
        indicator.style.transform = 'translateX(-50%)';
        indicator.style.zIndex = '10001';
        
        // DOMに追加
        document.body.appendChild(indicator);
        
        // 1.5秒後に自動削除
        setTimeout(() => {
            if (indicator.parentNode) {
                document.body.removeChild(indicator);
            }
        }, 1500);
        
        console.log('🎬ANIM [ResourceChange] Change indicator created and will be removed in 1.5s');
    }

    /**
     * 継続演出を更新
     * @param {string} effectType - 演出タイプ
     * @param {HTMLElement} target - 対象要素
     * @param {boolean} isActive - 有効かどうか
     */
    updatePersistentEffect(effectType, target, isActive) {
        const key = `${effectType}_${target.dataset.cardId || 'unknown'}`;
        
        if (isActive) {
            this.persistentStates.set(key, { effectType, target, timestamp: Date.now() });
            console.log('🎬ANIM [Persistent] Effect activated:', effectType);
        } else {
            this.persistentStates.delete(key);
            console.log('🎬ANIM [Persistent] Effect deactivated:', effectType);
        }
    }

    /**
     * 全ての演出をクリア
     */
    clearAllAnimations() {
        console.log('🎬ANIM [Clear] Clearing all animations');
        this.animationQueue = [];
        this.activeAnimations.clear();
        this.persistentStates.clear();
        this.activeElementAnimations.clear();
        // カードプレイキューもクリア
        this.cardPlayQueue = [];
        this.isProcessingCardPlay = false;
        // カードドローキューもクリア
        this.cardDrawQueue = [];
        this.isProcessingCardDraw = false;
    }

    /**
     * エラーをクリア
     */
    clearErrors() {
        console.log('🎬ANIM [Clear] Clearing errors');
        this.errors = [];
    }

    /**
     * 演出フラグを強制リセット（デバッグ用）
     */
    resetAnimationFlags() {
        console.log('🎬ANIM [Reset] Resetting animation flags');
        this.isProcessingCardPlay = false;
        this.cardPlayQueue = [];
        this.isProcessingCardDraw = false;
        this.cardDrawQueue = [];

    }

    /**
     * 現在の状態を取得
     * @returns {Object} 状態情報
     */
    getStatus() {
        return {
            queueLength: this.animationQueue.length,
            activeCount: this.activeAnimations.size,
            persistentCount: this.persistentStates.size,
            completedCount: this.completedCount,
            errorCount: this.errors.length,
            errors: this.errors,
            cardPlayQueueLength: this.cardPlayQueue.length,
            isProcessingCardPlay: this.isProcessingCardPlay,
            cardDrawQueueLength: this.cardDrawQueue.length,
            isProcessingCardDraw: this.isProcessingCardDraw
        };
    }

    /**
     * カードの破壊演出を遅延実行するために登録
     * @param {string} cardId - カードID
     * @param {string} effectType - 演出タイプ
     * @param {HTMLElement} target - 対象要素
     * @param {Object} params - 演出パラメータ
     */
    registerPendingDestroyAnimation(cardId, effectType, target, params) {
        console.log('🎬ANIM [Destroy] Registering pending destroy animation for card:', cardId);
        this.pendingDestroyAnimations.set(cardId, {
            effectType,
            target,
            params,
            timestamp: Date.now()
        });
    }

    /**
     * カードの視覚的削除を演出完了後にスケジュール（クローンを作成）
     * @param {string} cardId - カードID
     */
    scheduleCardRemovalAfterAnimation(cardId) {
        console.log('🎬ANIM [Schedule] Scheduling card removal after animation for card:', cardId);
        
        // カード要素を取得
        const element = document.querySelector(`[data-card-id="${cardId}"]`);
        if (element) {
            // カード要素のクローンを作成
            const clone = element.cloneNode(true);
            clone.classList.add('card-animation-clone');
            clone.style.position = 'absolute';
            clone.style.zIndex = '1000';
            
            // 元の要素の位置を取得
            const rect = element.getBoundingClientRect();
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            
            // クローンをbodyに追加
            document.body.appendChild(clone);
            
            // 元の要素を非表示にする
            element.style.visibility = 'hidden';
            
            this.scheduledCardRemovals.set(cardId, {
                originalElement: element,
                cloneElement: clone,
                timestamp: Date.now()
            });
            
            console.log('🎬ANIM [Schedule] Card clone created and original hidden for card:', cardId);
        } else {
            console.warn('🎬ANIM [Schedule] Card element not found for scheduling removal:', cardId);
        }
    }

    /**
     * カードのダメージ演出完了時に破壊演出を実行
     * @param {string} cardId - カードID
     */
    async executePendingDestroyAnimation(cardId) {
        const pendingDestroy = this.pendingDestroyAnimations.get(cardId);
        if (!pendingDestroy) {
            return;
        }

        console.log('🎬ANIM [Destroy] Executing pending destroy animation for card:', cardId);
        
        // 破壊演出を実行
        try {
            const result = await this.triggerTransientEffect(
                pendingDestroy.effectType,
                pendingDestroy.target,
                pendingDestroy.params
            );
            console.log('🎬ANIM [Destroy] Destroy animation completed for card:', cardId, result);
            
            // 破壊演出完了後、スケジュールされたカード削除を実行
            await this.executeScheduledCardRemoval(cardId);
            
        } catch (error) {
            console.error('🎬ANIM [Destroy] Error executing destroy animation for card:', cardId, error);
        } finally {
            // 登録を削除
            this.pendingDestroyAnimations.delete(cardId);
        }
    }

    /**
     * カードの演出依存関係を初期化
     * @param {string} cardId - カードID
     */
    initializeCardAnimationDependency(cardId) {
        if (!this.animationDependencies.has(cardId)) {
            this.animationDependencies.set(cardId, {
                pendingAnimations: new Set(),
                completedAnimations: new Set()
            });
        }
    }

    /**
     * ターン開始演出
     * @param {string} playerName - プレイヤー名
     * @param {number} turnNumber - ターン番号
     * @returns {Promise<Object>} 実行結果
     */
    async animateTurnStart(playerName, turnNumber) {
        console.log('🎮GAME_ANIM [AnimationManager] Starting turn start animation for:', playerName, 'turn:', turnNumber);
        
        return new Promise((resolve) => {
            // オーバーレイ要素を作成
            const overlay = document.createElement('div');
            overlay.className = 'game-progress-overlay';
            
            const message = document.createElement('div');
            message.className = 'game-progress-message turn-start turn-start-animation';
            message.innerHTML = `
                <div>ターン ${turnNumber}</div>
                <div style="font-size: 0.8em; margin-top: 8px;">${playerName}のターン</div>
            `;
            
            overlay.appendChild(message);
            document.body.appendChild(overlay);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                document.body.removeChild(overlay);
                console.log('🎬ANIM [TurnStart] Turn start animation completed');
                resolve({ success: true, duration: 800 });
            }, 800);
        });
    }

    /**
     * ターン終了演出
     * @param {string} playerName - プレイヤー名
     * @returns {Promise<Object>} 実行結果
     */
    async animateTurnEnd(playerName) {
        console.log('🎮GAME_ANIM [AnimationManager] Starting turn end animation for:', playerName);
        
        return new Promise((resolve) => {
            // オーバーレイ要素を作成
            const overlay = document.createElement('div');
            overlay.className = 'game-progress-overlay';
            
            const message = document.createElement('div');
            message.className = 'game-progress-message turn-end turn-end-animation';
            message.innerHTML = `
                <div>${playerName}のターン終了</div>
            `;
            
            overlay.appendChild(message);
            document.body.appendChild(overlay);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                document.body.removeChild(overlay);
                
                // ターン終了時にすべてのカードの可視化を復元
                this.restoreAllCardVisibility();
                
                console.log('🎬ANIM [TurnEnd] Turn end animation completed');
                resolve({ success: true, duration: 1200 });
            }, 1200);
        });
    }

    /**
     * 勝敗決定演出
     * @param {boolean} isVictory - 勝利かどうか
     * @param {string} message - 表示メッセージ
     * @returns {Promise<Object>} 実行結果
     */
    async animateGameResult(isVictory, message) {
        console.log(`[GAME_END_DEBUG] AnimationManager: animateGameResult called with isVictory: ${isVictory}, message: "${message}"`);
        
        return new Promise((resolve) => {
            // オーバーレイ要素を作成
            const overlay = document.createElement('div');
            overlay.className = 'game-progress-overlay';
            
            const messageElement = document.createElement('div');
            messageElement.className = `game-progress-message ${isVictory ? 'victory victory-animation' : 'defeat defeat-animation'}`;
            messageElement.innerHTML = `
                <div style="font-size: 1.2em; margin-bottom: 10px;">${isVictory ? '🎉 勝利！' : '💀 敗北...'}</div>
                <div style="font-size: 0.9em;">${message}</div>
            `;
            
            overlay.appendChild(messageElement);
            document.body.appendChild(overlay);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                document.body.removeChild(overlay);
                console.log('🎬ANIM [GameResult] Game result animation completed');
                
                // 勝敗演出完了後、ゲーム終了画面への遷移を許可
                // カスタムイベントを発火してApp.jsに状態更新を通知
                console.log('[GAME_END_DEBUG] AnimationManager: Dispatching gameResultAnimationComplete event.');
                window.dispatchEvent(new CustomEvent('gameResultAnimationComplete'));
                
                resolve({ success: true, duration: 2000 });
            }, 2000);
        });
    }

    /**
     * 上限到達警告演出
     * @param {HTMLElement} target - 対象エリア要素
     * @param {string} limitType - 上限タイプ（'hand' or 'field'）
     * @returns {Promise<Object>} 実行結果
     */
    async animateLimitWarning(target, limitType) {
        console.log('🎮GAME_ANIM [AnimationManager] Starting limit warning animation:', limitType);
        
        if (!target) {
            console.warn('🎮GAME_ANIM [AnimationManager] Target element not found for limit warning');
            return { success: false, error: 'Target not found' };
        }
        
        return new Promise((resolve) => {
            // 警告演出クラスを追加
            target.classList.add('limit-warning-flash');
            
            console.log('🎮GAME_ANIM [AnimationManager] Limit warning animation started for:', limitType);
            
            // アニメーション完了を待つ（3回点滅 × 0.6秒 = 1.8秒）
            setTimeout(() => {
                target.classList.remove('limit-warning-flash');
                console.log('🎮GAME_ANIM [AnimationManager] Limit warning animation completed');
                resolve({ success: true, duration: 1800 });
            }, 1800);
        });
    }

    /**
     * 効果無効化演出
     * @param {HTMLElement} target - 対象要素
     * @returns {Promise<Object>} 実行結果
     */
    async animateEffectNullified(target) {
        console.log('🎮GAME_ANIM [AnimationManager] Starting effect nullified animation');
        
        if (!target) {
            console.warn('🎮GAME_ANIM [AnimationManager] Target element not found for effect nullified');
            return { success: false, error: 'Target not found' };
        }
        
        return new Promise((resolve) => {
            // 無効化演出クラスを追加
            target.classList.add('effect-nullified');
            
            // パーティクル演出を開始
            this.createNullifiedParticles(target);
            
            console.log('🎮GAME_ANIM [AnimationManager] Effect nullified animation started');
            
            // アニメーション完了を待つ
            setTimeout(() => {
                target.classList.remove('effect-nullified');
                console.log('🎮GAME_ANIM [AnimationManager] Effect nullified animation completed');
                resolve({ success: true, duration: 600 });
            }, 600);
        });
    }

    /**
     * 無効化パーティクルを生成
     * @param {HTMLElement} target - 対象要素
     */
    createNullifiedParticles(target) {
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const particleCount = 12;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'nullified-particle';
            
            // 初期位置を中央に設定
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            
            // ランダムな方向と距離を計算
            const angle = (i / particleCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
            const distance = 50 + Math.random() * 30;
            const finalX = centerX + Math.cos(angle) * distance;
            const finalY = centerY + Math.sin(angle) * distance;
            
            document.body.appendChild(particle);
            particles.push(particle);
            
            // パーティクルアニメーション
            particle.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // 少し遅延してアニメーション開始
            setTimeout(() => {
                particle.style.left = finalX + 'px';
                particle.style.top = finalY + 'px';
                particle.style.opacity = '0';
                particle.style.transform = 'scale(2) rotate(360deg)';
            }, 50);
        }
        
        // パーティクルを削除
        setTimeout(() => {
            particles.forEach(particle => {
                if (particle.parentNode) {
                    document.body.removeChild(particle);
                }
            });
        }, 700);
        
        console.log('🎮GAME_ANIM [AnimationManager] Created', particleCount, 'nullified particles');
    }

    /**
     * 継続演出の状態を更新
     * @param {Object} gameState - 現在のゲーム状態
     */
    updatePersistentAnimations(gameState) {
        if (!gameState) return;
        
        console.log('🎮GAME_ANIM [Persistent] Updating persistent animations');
        
        // 全プレイヤーの手札をチェック
        Object.values(gameState.players).forEach(player => {
            if (!player.hand) return;
            
            const playerScale = this.getEffectiveScale(player);
            
            player.hand.forEach(card => {
                const cardElement = document.querySelector(`[data-card-id="${card.instance_id}"]`);
                if (!cardElement) return;
                
                const isInsufficientScale = playerScale < card.required_scale;
                const hasAnimation = this.persistentAnimations.has(card.instance_id);
                
                if (isInsufficientScale && !hasAnimation) {
                    // 規模不足演出を開始
                    console.log('🎮GAME_ANIM [Persistent] Starting insufficient scale animation for card:', card.name);
                    cardElement.classList.add('card-insufficient-scale');
                    this.persistentAnimations.set(card.instance_id, 'insufficient-scale');
                } else if (!isInsufficientScale && hasAnimation && this.persistentAnimations.get(card.instance_id) === 'insufficient-scale') {
                    // 規模不足演出を終了
                    console.log('🎮GAME_ANIM [Persistent] Ending insufficient scale animation for card:', card.name);
                    cardElement.classList.remove('card-insufficient-scale');
                    this.persistentAnimations.delete(card.instance_id);
                }
            });
        });
        
        this.lastGameState = gameState;
    }

    /**
     * プレイヤーの有効規模を計算
     * @param {Object} player - プレイヤーオブジェクト
     * @returns {number} 有効規模
     */
    getEffectiveScale(player) {
        if (!player) return 0;
        
        let effectiveScale = player.scale;
        
        // マネーカードの耐久値を実効規模に加算
        if (player.field) {
            const moneyOnField = player.field.filter(card => card.name === 'マネー');
            const moneyDurability = moneyOnField.reduce((sum, card) => sum + (card.current_durability || 0), 0);
            effectiveScale += moneyDurability;
        }
        
        // イデオロギーカードによる規模修正を適用
        if (player.ideology && player.ideology.scale_modifier) {
            effectiveScale += player.ideology.scale_modifier;
        }
        
        return Math.max(0, effectiveScale);
    }

    /**
     * 継続演出をクリア
     */
    clearPersistentAnimations() {
        console.log('🎮GAME_ANIM [Persistent] Clearing all persistent animations');
        
        this.persistentAnimations.forEach((animationType, cardId) => {
            const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
            if (cardElement) {
                if (animationType === 'insufficient-scale') {
                    cardElement.classList.remove('card-insufficient-scale');
                }
            }
        });
        
        this.persistentAnimations.clear();
    }

    /**
     * 画面上のすべてのカードの可視化を復元
     * 演出終了時やゲーム状態更新時に呼び出して、意図しない不可視化を防ぐ
     */
    restoreAllCardVisibility() {
        console.log('🎬ANIM [Restore] Restoring visibility for all cards on screen');
        
        // すべてのカード要素を取得
        const allCards = document.querySelectorAll('.card-game, .card-library'); // 新しいクラス名に対応
        let restoredCount = 0;
        
        allCards.forEach(card => {
            let wasHidden = false;
            
            // card-animation-hiddenクラスを削除
            if (card.classList.contains('card-animation-hidden')) {
                card.classList.remove('card-animation-hidden');
                wasHidden = true;
            }
            
            // CSSルールによる隠蔽を削除（カードIDベース）
            const cardId = card.dataset.cardId;
            if (cardId) {
                const styleElement = document.getElementById(`hide-${cardId}`);
                if (styleElement) {
                    styleElement.remove();
                    wasHidden = true;
                }
            }
            
            // Note: card.style.visibility = '' や card.style.opacity = '' は、
            // 意図しない再表示を引き起こすため削除しました。
            // visibilityやopacityの制御はクラス名またはアニメーションで管理されるべきです。
            
            if (wasHidden) {
                restoredCount++;
                console.log('🎬ANIM [Restore] Restored visibility for card:', cardId || 'unknown');
            }
        });
        
        console.log(`🎬ANIM [Restore] Restored visibility for ${restoredCount} cards`);
        
        // アニメーション状態もクリア
        this.activeElementAnimations.clear();
        
        return restoredCount;
    }

    /**
     * 先攻/後攻決定演出
     * @param {string} firstPlayer - 先攻プレイヤー名
     * @param {string} secondPlayer - 後攻プレイヤー名
     * @returns {Promise<Object>} 実行結果
     */
    async animateTurnOrderDecision(firstPlayer, secondPlayer) {
        console.log('🎮GAME_ANIM [AnimationManager] Starting turn order decision animation');
        console.log('🎮GAME_ANIM [AnimationManager] First player:', firstPlayer);
        console.log('🎮GAME_ANIM [AnimationManager] Second player:', secondPlayer);
        
        return new Promise((resolve) => {
            console.log('🎮GAME_ANIM [AnimationManager] Creating overlay elements...');
            
            // オーバーレイ要素を作成
            const overlay = document.createElement('div');
            overlay.className = 'game-progress-overlay';
            console.log('🎮GAME_ANIM [AnimationManager] Overlay created with class:', overlay.className);
            
            const message = document.createElement('div');
            message.className = 'game-progress-message turn-order';
            message.innerHTML = `
                <div style="margin-bottom: 15px;">ターン順決定</div>
                <div id="turn-order-content" style="font-size: 0.8em;">
                    <div>決定中...</div>
                </div>
            `;
            console.log('🎮GAME_ANIM [AnimationManager] Message created with class:', message.className);
            
            overlay.appendChild(message);
            console.log('🎮GAME_ANIM [AnimationManager] Message appended to overlay');
            
            document.body.appendChild(overlay);
            console.log('🎮GAME_ANIM [AnimationManager] Overlay appended to document.body');
            console.log('🎮GAME_ANIM [AnimationManager] Document body children count:', document.body.children.length);
            
            // 段階的にテキストを表示
            setTimeout(() => {
                const content = document.getElementById('turn-order-content');
                if (content) {
                    content.innerHTML = `
                        <div style="margin-bottom: 8px;">🥇 先攻: ${firstPlayer}</div>
                        <div>🥈 後攻: ${secondPlayer}</div>
                    `;
                    content.classList.add('turn-order-animation');
                }
            }, 500);
            
            // アニメーション完了を待つ
            setTimeout(() => {
                document.body.removeChild(overlay);
                console.log('🎬ANIM [TurnOrder] Turn order decision animation completed');
                resolve({ success: true, duration: 1500 });
            }, 1500);
        });
    }

    /**
     * カードの演出完了を記録し、待機中の破壊演出があれば実行
     * @param {string} cardId - カードID
     * @param {string} animationType - 演出タイプ
     */
    async markCardAnimationCompleted(cardId, animationType) {
        if (!cardId) return;

        console.log('🎬ANIM [Dependency] Animation completed for card:', cardId, 'type:', animationType);
        
        this.initializeCardAnimationDependency(cardId);
        const dependency = this.animationDependencies.get(cardId);
        
        dependency.completedAnimations.add(animationType);
        dependency.pendingAnimations.delete(animationType);

        // ダメージ演出が完了し、破壊演出が待機中の場合は実行
        if (animationType === 'CARD_DAMAGE' && this.pendingDestroyAnimations.has(cardId)) {
            console.log('🎬ANIM [Dependency] ✅ Damage animation completed, executing pending destroy animation for card:', cardId);
            // 少し遅延を入れて、ダメージ演出が完全に終了してから破壊演出を開始
            setTimeout(async () => {
                await this.executePendingDestroyAnimation(cardId);
            }, 100);
        }

        // グローバルなanimationStateManagerにも完了を通知
        animationStateManager.setAnimationCompleted(cardId);
    }

    /**
     * スケジュールされたカードの視覚的削除を実行
     * @param {string} cardId - カードID
     */
    async executeScheduledCardRemoval(cardId) {
        const scheduledRemoval = this.scheduledCardRemovals.get(cardId);
        if (!scheduledRemoval) {
            return;
        }

        console.log('🎬ANIM [Removal] Executing scheduled card removal for card:', cardId);
        
        try {
            const { originalElement, cloneElement } = scheduledRemoval;
            
            // クローン要素をフェードアウトして削除
            if (cloneElement && cloneElement.parentNode) {
                cloneElement.style.transition = 'opacity 0.3s ease-out';
                cloneElement.style.opacity = '0';
                
                setTimeout(() => {
                    if (cloneElement.parentNode) {
                        cloneElement.parentNode.removeChild(cloneElement);
                        console.log('🎬ANIM [Removal] Card clone removed from DOM:', cardId);
                    }
                }, 300);
            }
            
            // 元の要素の非表示を解除（既に捨て札に移動されているので表示されない）
            if (originalElement) {
                originalElement.style.visibility = '';
            }
            
        } catch (error) {
            console.error('🎬ANIM [Removal] Error removing card elements:', cardId, error);
        } finally {
            // スケジュールを削除
            this.scheduledCardRemovals.delete(cardId);
        }
    }
}

export default AnimationManager;