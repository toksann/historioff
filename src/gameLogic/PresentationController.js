import AnimationManager from './AnimationManager.js';

/**
 * プレゼンテーション制御システム
 * ゲームメカニクスと視覚表現を分離し、演出を管理する
 */
class PresentationController {
    constructor() {
        // 演出キュー
        this.animationQueue = [];
        
        // 現在実行中の演出
        this.currentAnimation = null;
        
        // ゲームメカニクス一時停止フラグ
        this.gameLogicPaused = false;
        
        // ゲームメカニクス再開コールバック
        this.resumeGameLogicCallback = null;
        
        // 視覚状態（実際のゲーム状態とは独立）
        this.visualState = {
            cards: new Map(), // cardId -> visualCardData
            players: new Map() // playerId -> visualPlayerData
        };
        
        // AnimationManagerを統合
        this.animationManager = new AnimationManager();
        
        
    }

    /**
     * GameStateへの参照を設定
     * @param {Object} gameState - ゲーム状態オブジェクト
     */
    setGameState(gameState) {
        this.gameState = gameState;
        if (this.animationManager) {
            this.animationManager.setGameState(gameState);
        }
        
    }

    /**
     * ゲームメカニクスを一時停止
     * @param {Function} resumeCallback - 再開時に呼び出すコールバック
     */
    pauseGameLogic(resumeCallback) {
        
        this.gameLogicPaused = true;
        this.resumeGameLogicCallback = resumeCallback;
    }

    /**
     * ゲームメカニクスを再開
     */
    resumeGameLogic() {
        if (this.gameLogicPaused && this.resumeGameLogicCallback) {
            
            this.gameLogicPaused = false;
            const callback = this.resumeGameLogicCallback;
            this.resumeGameLogicCallback = null;
            callback();
        }
    }

    /**
     * 演出をキューに追加
     * @param {Object} animation - 演出データ
     */
    enqueueAnimation(animation) {
        
        this.animationQueue.push({
            ...animation,
            id: Date.now() + Math.random(),
            timestamp: Date.now()
        });
        
        // キューに追加されたタイミングで実行チェック
        this.processAnimationQueue();
    }

    /**
     * 演出キューを処理
     */
    async processAnimationQueue() {
        // 既に演出実行中の場合はスキップ
        if (this.currentAnimation) {
            
            return;
        }

        // キューが空の場合
        if (this.animationQueue.length === 0) {
            
            // ゲームロジックが一時停止中の場合は再開
            if (this.gameLogicPaused) {
                this.resumeGameLogic();
            }
            return;
        }

        // 次の演出を取得して実行
        const nextAnimation = this.animationQueue.shift();
        
        
        this.currentAnimation = nextAnimation;
        
        try {
            await this.executeAnimation(nextAnimation);
        } catch (error) {
            console.error('🎭 [Presentation] Animation execution error:', error);
        } finally {
            
            this.currentAnimation = null;
            
            // 演出完了後、次の演出をチェック
            setTimeout(() => {
                this.processAnimationQueue();
            }, 50);
        }
    }

    /**
     * 演出を実行
     * @param {Object} animation - 演出データ
     */
    async executeAnimation(animation) {
        
        
        switch (animation.type) {
            case 'CARD_DAMAGE':
                await this.executeCardDamageAnimation(animation);
                break;
            case 'CARD_DESTROY':
                await this.executeCardDestroyAnimation(animation);
                break;
            case 'CARD_MOVE':
                await this.executeCardMoveAnimation(animation);
                break;
            case 'RESOURCE_CHANGE':
                await this.executeResourceChangeAnimation(animation);
                break;
            default:
                console.warn('🎭 [Presentation] Unknown animation type:', animation.type);
                break;
        }
    }

    /**
     * カードダメージ演出を実行
     */
    async executeCardDamageAnimation(animation) {
        const { cardId, amount } = animation.data;
        const element = document.querySelector(`[data-card-id="${cardId}"]`);
        
        if (!element) {
            console.warn('🎭 [Presentation] Card element not found for damage animation:', cardId);
            return;
        }

        
        return new Promise((resolve) => {
            // ダメージ演出を適用
            element.classList.add('card-damage-animation');
            
            setTimeout(() => {
                element.classList.remove('card-damage-animation');
                resolve();
            }, 1200);
        });
    }

    /**
     * カード破壊演出を実行
     */
    async executeCardDestroyAnimation(animation) {
        const { cardId } = animation.data;
        const element = document.querySelector(`[data-card-id="${cardId}"]`);
        
        if (!element) {
            console.warn('🎭 [Presentation] Card element not found for destroy animation:', cardId);
            return;
        }

        
        return new Promise((resolve) => {
            // 破壊演出を適用
            element.classList.add('card-destroy-animation');
            
            setTimeout(() => {
                element.classList.remove('card-destroy-animation');
                // 要素を非表示にする（実際の削除はReactが行う）
                element.style.display = 'none';
                resolve();
            }, 600);
        });
    }

    /**
     * カード移動演出を実行
     */
    async executeCardMoveAnimation(animation) {
        const { cardId, from, to } = animation.data;
        
        
        // 移動演出の実装（必要に応じて）
        return new Promise((resolve) => {
            setTimeout(resolve, 300);
        });
    }

    /**
     * リソース変化演出を実行
     */
    async executeResourceChangeAnimation(animation) {
        const { playerId, resourceType, amount } = animation.data;
        
        
        // リソース変化演出の実装（必要に応じて）
        return new Promise((resolve) => {
            setTimeout(resolve, 800);
        });
    }

    /**
     * ゲームエフェクトを監視して演出を生成
     * @param {Object} gameState - 最新のゲーム状態
     * @param {Object} effect - ゲームエフェクト
     * @param {Object} sourceCard - ソースカード
     */
    async onGameEffect(gameState, effect, sourceCard) {
        
        
        
        if (!effect || !effect.effect_type) {
            console.warn('[GAME_END_DEBUG] PresentationController: onGameEffect received null or invalid effect. Skipping.');
            return;
        }

        
        this.setGameState(gameState); // Ensure the controller has the latest state

        
        
        
        // 特にゲーム進行エフェクトをマーク
        if (['TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION'].includes(effect.effect_type)) {
            
        }
        
        // 耐久値関連のエフェクトを特別にマーク
        if (effect.effect_type.includes('DURABILITY') || effect.effect_type.includes('DAMAGE')) {
            
            
            
        }
        
        // AnimationManagerに直接委譲
        await this.delegateToAnimationManager(effect, sourceCard);
    }

    /**
     * AnimationManagerに演出を委譲
     * @param {Object} effect - ゲームエフェクト
     * @param {Object} sourceCard - ソースカード
     */
    async delegateToAnimationManager(effect, sourceCard) {
        
        
        if (!this.animationManager) {
            console.warn('🎮GAME_ANIM [Presentation] AnimationManager not available');
            return;
        }

        

        try {
            // エフェクトタイプに応じて適切な演出を呼び出し
            switch (effect.effect_type) {
                // CARD_PLACED_OWNER/OPPONENT は MOVE_CARD で処理するため削除
                    
                case 'MOVE_CARD':
                    await this.handleCardMove(effect, sourceCard);
                    break;
                    
                case 'CARD_DURABILITY_CHANGED':
                    // 最終的な耐久値変化結果で演出を実行（重複防止）
                    await this.handleCardDurabilityChange(effect, sourceCard);
                    break;
                    
                case 'MODIFY_CARD_DURABILITY':
                    // 内部処理用エフェクトなので演出はスキップ
                    
                    break;
                    
                case 'WEALTH_DURABILITY_ZERO_THIS':
                case 'CARD_DESTROYED':
                    await this.handleCardDestroy(effect, sourceCard);
                    break;
                    
                case 'CONSCIOUSNESS_CHANGED':
                case 'SCALE_CHANGED':
                case 'MODIFY_CONSCIOUSNESS_RESERVE':
                case 'MODIFY_SCALE_RESERVE':
                    
                    
                    
                    await this.handleResourceChange(effect, sourceCard);
                    break;
                    
                case 'TURN_START':
                    
                    await this.handleTurnStart(effect, sourceCard);
                    break;
                    
                case 'TURN_END':
                    
                    await this.handleTurnEnd(effect, sourceCard);
                    break;
                    
                case 'GAME_RESULT':
                    
                    await this.handleGameResult(effect, sourceCard);
                    break;
                    
                case 'TURN_ORDER_DECISION':
                    
                    await this.handleTurnOrderDecision(effect, sourceCard);
                    break;
                    
                case 'LIMIT_WARNING':
                    
                    await this.handleLimitWarning(effect, sourceCard);
                    break;
                    
                case 'EFFECT_NULLIFIED':
                    
                    await this.handleEffectNullified(effect, sourceCard);
                    break;
                    
                default:
                    console.log('🎭 [Presentation] No animation mapping for effect:', effect.effect_type);
                    break;
            }
        } catch (error) {
            console.error('🎭 [Presentation] Error delegating to AnimationManager:', error);
        }
    }

    /**
     * カード配置演出を処理
     */
    async handleCardPlacement(effect, sourceCard) {
        const cardId = effect.args.card_id;
        const target = document.querySelector(`[data-card-id="${cardId}"]`);
        
        
        
        if (target) {
            await this.animationManager.triggerTransientEffect('CARD_PLAY', target, { effect, sourceCard });
        } else {
            console.warn('🔥ANIM_DEBUG [Presentation] Card element not found for placement:', cardId);
        }
    }

    /**
     * カード移動演出を処理
     */
    async handleCardMove(effect, sourceCard) {
        const cardId = effect.args.card_id;
        const sourcePile = effect.args.source_pile;
        const destPile = effect.args.destination_pile;
        
        
        
        
        // ドロー演出（デッキから手札）
        if (sourcePile === 'deck' && destPile === 'hand') {
            const target = document.querySelector(`[data-card-id="${cardId}"]`);
            
            
            
            
            await this.animationManager.triggerTransientEffect('CARD_DRAW', target, { effect, sourceCard });
            
        }
        // 手札から場への移動（財カード配置演出 - プレイヤー・NPC両方）
        else if (sourcePile === 'hand' && destPile === 'field') {
            // 配置演出対象の場合、即座にカードを隠す（DOM更新前）
            this.hideCardImmediately(cardId);
            const playerId = effect.args.player_id;
            
            
            
            // 即座にカードを隠してから演出開始
            const immediateTarget = document.querySelector(`[data-card-id="${cardId}"]`);
            if (immediateTarget) {
                // 即座に隠す
                immediateTarget.style.visibility = 'hidden';
                immediateTarget.style.opacity = '0';
            }
            
            // DOM更新を待ってから要素を検索
            setTimeout(async () => {
                const target = document.querySelector(`[data-card-id="${cardId}"]`);
                
                
                if (target) {
                    
                    await this.animationManager.triggerTransientEffect('CARD_PLAY', target, { effect, sourceCard });
                } else {
                    console.warn('🔥ANIM_DEBUG [Presentation] Card element still not found after delay:', cardId);
                    // 利用可能なカード要素を表示
                    
                }
            }, 50); // より短い遅延
        }
        // 手札からイデオロギーエリアへの移動（イデオロギーカード配置演出 - プレイヤー・NPC両方）
        else if (sourcePile === 'hand' && destPile === 'ideology') {
            // 配置演出対象の場合、即座にカードを隠す（DOM更新前）
            this.hideCardImmediately(cardId);
            const playerId = effect.args.player_id;
            
            
            
            // 即座にカードを隠してから演出開始
            const immediateTarget = document.querySelector(`[data-card-id="${cardId}"]`);
            if (immediateTarget) {
                // 即座に隠す
                immediateTarget.style.visibility = 'hidden';
                immediateTarget.style.opacity = '0';
            }
            
            // DOM更新を待ってから要素を検索
            setTimeout(async () => {
                const target = document.querySelector(`[data-card-id="${cardId}"]`);
                
                
                if (target) {
                    
                    await this.animationManager.triggerTransientEffect('CARD_PLAY', target, { effect, sourceCard });
                } else {
                    console.warn('🔥ANIM_DEBUG [Presentation] Ideology card element still not found after delay:', cardId);
                    // 利用可能なカード要素を表示
                    
                }
            }, 50); // より短い遅延
        }
        // 事象カードの移動は演出をスキップ
        else if (sourcePile === 'hand' && destPile === 'playing_event') {
            
        }
        // その他の移動演出（配置以外の移動のみ）
        else {
            // 配置以外の移動（例：場から捨て札、デッキから手札以外など）
            
            
            // 特定の移動のみ演出を実行（必要に応じて追加）
            if (sourcePile === 'field' && destPile === 'discard') {
                // 場から捨て札への移動（破壊演出で処理済みなのでスキップ）
                
            } else if (sourcePile === 'playing_event' && destPile === 'discard') {
                // 事象カードの処理完了（演出不要）
                
            } else {
                // その他の移動は基本的にスキップ
                
            }
        }
    }

    /**
     * カード耐久値変化演出を処理
     */
    async handleCardDurabilityChange(effect, sourceCard) {
        try {
            const cardId = effect.args.card_id;
            const target = document.querySelector(`[data-card-id="${cardId}"]`);
        
        
        
        
        // 変化量を取得（複数のフィールドから）
        const changeAmount = effect.args.amount || effect.args.actual_amount || effect.args.original_amount || 0;
        
        
        if (target) {
            
            const result = await this.animationManager.triggerTransientEffect('CARD_DAMAGE', target, { effect, sourceCard });
            
            // 演出完了後、遅延エフェクトを実行
            
            if (this.gameState && this.gameState.delayedEffects && this.gameState.delayedEffects.length > 0) {
                
                // 遅延エフェクトを取得してクリア
                const delayedEffects = this.gameState.delayedEffects;
                this.gameState.delayedEffects = [];
                
                // コールバック関数を使って遅延エフェクトを実行
                if (this.gameState.executeDelayedEffects) {
                    this.gameState.executeDelayedEffects(delayedEffects);
                } else {
                    console.warn('🔥ANIM_DEBUG [Presentation] executeDelayedEffects callback not found');
                }
            }
            
            // ゲームロジックを再開
            if (this.gameLogicPaused) {
                
                this.resumeGameLogic();
            }
        } else {
            console.warn('🔥ANIM_DEBUG [Presentation] Card element not found for durability change:', cardId);
            console.warn('🔥ANIM_DEBUG [Presentation] Available card elements:', 
                Array.from(document.querySelectorAll('[data-card-id]')).map(el => el.getAttribute('data-card-id')));
        }
        } catch (error) {
        }
    }

    /**
     * カード破壊演出を処理
     */
    async handleCardDestroy(effect, sourceCard) {
        const cardId = effect.args.card_id;
        const target = document.querySelector(`[data-card-id="${cardId}"]`);
        
        
        
        
        if (target) {
            await this.animationManager.triggerTransientEffect('CARD_DESTROY', target, { effect, sourceCard });
        } else {
            console.warn('🎭 [Presentation] Card element not found for destroy:', cardId);
        }
    }

    /**
     * リソース変化演出を処理
     */
    async handleResourceChange(effect, sourceCard) {
        const playerId = effect.args.player_id;
        const resourceType = effect.effect_type.includes('CONSCIOUSNESS') ? 'consciousness' : 'scale';
        
        
        
        
        // 変化量を取得（複数のフィールドから）
        const changeAmount = effect.args.amount || effect.args.actual_amount || effect.args.original_amount || 0;
        
        
        // プレイヤーのリソース表示要素を取得
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        
        
        if (playerElement) {
            // より具体的なセレクターを試行
            const resourceSelectors = [
                `.${resourceType}`,
                `.player-${resourceType}`,
                `[data-resource="${resourceType}"]`,
                `.resource-${resourceType}`,
                `.stat-${resourceType}`
            ];
            
            let resourceElement = null;
            for (const selector of resourceSelectors) {
                resourceElement = playerElement.querySelector(selector);
                
                if (resourceElement) break;
            }
            
            if (resourceElement) {
                const effectType = effect.effect_type.includes('CONSCIOUSNESS') ? 'CONSCIOUSNESS_CHANGE_RESULT' : 'SCALE_CHANGE_RESULT';
                
                await this.animationManager.triggerTransientEffect(effectType, resourceElement, { effect, sourceCard });
            } else {
                console.warn('🔥ANIM_DEBUG [Presentation] Resource element not found with any selector');
                
                
            }
        } else {
            console.warn('🔥ANIM_DEBUG [Presentation] Player element not found:', playerId);
        }
    }

    /**
     * カードを即座に隠す（DOM更新前）
     * @param {string} cardId - カードID
     */
    hideCardImmediately(cardId) {
        // 複数の方法でカードを検索・隠蔽
        const selectors = [
            `[data-card-id="${cardId}"]`,
            `#${cardId}`,
            `.card[data-card-id="${cardId}"]`
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                
                // より強力な隠蔽
                element.style.setProperty('visibility', 'hidden', 'important');
                element.style.setProperty('opacity', '0', 'important');
                element.style.setProperty('transform', 'scale(0)', 'important');
                element.classList.add('card-animation-hidden');
                
                // 親要素も隠す（必要に応じて）
                const parent = element.parentElement;
                if (parent && parent.classList.contains('card-container')) {
                    parent.style.setProperty('visibility', 'hidden', 'important');
                }
            });
        }
        
        // さらに、CSSルールを動的に追加
        this.addHidingCSSRule(cardId);
    }

    /**
     * カード隠蔽用のCSSルールを動的に追加
     * @param {string} cardId - カードID
     */
    addHidingCSSRule(cardId) {
        const styleId = `hide-${cardId}`;
        
        // 既存のスタイルを削除
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // 新しいスタイルを追加
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            [data-card-id="${cardId}"]:not(.card-animation-clone) {
                visibility: hidden !important;
                opacity: 0 !important;
                transform: scale(0) !important;
            }
        `;
        document.head.appendChild(style);
        
        
    }

    /**
     * ターン開始演出を処理
     */
    async handleTurnStart(effect, sourceCard) {
        const playerName = effect.args.player_name || 'プレイヤー';
        const turnNumber = effect.args.turn_number || 1;
        
        
        
        
        if (this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('TURN_START', null, { 
                playerName, 
                turnNumber 
            });
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] AnimationManager not available for TURN_START');
        }
    }

    /**
     * ターン終了演出を処理
     */
    async handleTurnEnd(effect, sourceCard) {
        const playerName = effect.args.player_name || 'プレイヤー';
        
        
        
        
        if (this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('TURN_END', null, { 
                playerName 
            });
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] AnimationManager not available for TURN_END');
        }
    }

    /**
     * 勝敗決定演出を処理
     */
    async handleGameResult(effect, sourceCard) {
        const isVictory = effect.args.is_victory || false;
        const message = effect.args.message || '';
        
        
        
        
        if (this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('GAME_RESULT', null, { 
                isVictory, 
                message 
            });
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] AnimationManager not available for GAME_RESULT');
        }
    }

    /**
     * 上限到達警告演出を処理
     */
    async handleLimitWarning(effect, sourceCard) {
        const { player_id, limit_type, message } = effect.args;
        
        
        
        
        
        // 対象エリアを特定
        let targetSelector = '';
        if (limit_type === 'hand') {
            targetSelector = player_id === 'PLAYER1' ? '.player-hand-area' : '.opponent-hand-area';
        } else if (limit_type === 'field') {
            targetSelector = player_id === 'PLAYER1' ? '.player-field-area' : '.opponent-field-area';
        }
        
        const target = document.querySelector(targetSelector);
        
        
        if (target && this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('LIMIT_WARNING', target, { 
                limitType: limit_type,
                message: message
            });
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] Target element or AnimationManager not found for limit warning');
        }
    }

    /**
     * 効果無効化演出を処理
     */
    async handleEffectNullified(effect, sourceCard) {
        const { target_card_id } = effect.args;
        
        
        
        
        const target = document.querySelector(`[data-card-id="${target_card_id}"]`);
        
        
        if (target && this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('EFFECT_NULLIFIED', target, {});
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] Target element or AnimationManager not found for effect nullified');
        }
    }

    /**
     * 先攻/後攻決定演出を処理
     */
    async handleTurnOrderDecision(effect, sourceCard) {
        const firstPlayer = effect.args.first_player || '先攻プレイヤー';
        const secondPlayer = effect.args.second_player || '後攻プレイヤー';
        
        
        
        
        if (this.animationManager) {
            
            await this.animationManager.triggerTransientEffect('TURN_ORDER_DECISION', null, { 
                firstPlayer, 
                secondPlayer 
            });
            
        } else {
            console.warn('🎮GAME_ANIM [Presentation] AnimationManager not available for TURN_ORDER_DECISION');
        }
    }

    /**
     * 演出システムの状態を取得
     */
    getStatus() {
        return {
            queueLength: this.animationQueue.length,
            currentAnimation: this.currentAnimation?.type || null,
            gameLogicPaused: this.gameLogicPaused
        };
    }

    /**
     * 演出システムをクリア
     */
    clear() {
        console.log('[GAME_END_DEBUG] PresentationController: Clearing animation system.');
        this.animationQueue = [];
        this.currentAnimation = null;
        if (this.gameLogicPaused) {
            this.resumeGameLogic();
        }
    }
}

export default PresentationController;