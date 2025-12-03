import React, { useRef, useEffect, useState } from 'react';
import usePresentationController from './usePresentationController.js';
import animationStateManager from '../gameLogic/AnimationStateManager.js';

/**
 * 新しい演出システムを管理するReact Hook
 * @param {Object} gameState - ゲーム状態
 * @param {Object} effectMonitor - EffectMonitorのインスタンス
 * @returns {Object} 演出システムとその状態
 */
const useAnimationManager = (gameState, effectMonitor) => {
    const [animationState, setAnimationState] = useState({
        isReady: false,
        activeCount: 0,
        completedCount: 0,
        errorCount: 0,
        lastError: null
    });
    
    // gameStateをrefで管理
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // 新しいプレゼンテーション制御システムを使用
    const { controller, handleGameEffect, pauseGameLogic, getStatus } = usePresentationController(gameState, effectMonitor);
    
    // 演出システムの準備完了
    useEffect(() => {
        if (controller) {
            
            setAnimationState(prev => ({ ...prev, isReady: true }));
        } else {
            
            setAnimationState(prev => ({ ...prev, isReady: false }));
        }
    }, [controller]);

    // 状態の定期更新
    useEffect(() => {
        if (!controller) return;

        const updateStatus = () => {
            const status = getStatus();
            setAnimationState(prev => ({
                ...prev,
                activeCount: status.currentAnimation ? 1 : 0,
                queueLength: status.queueLength,
                gameLogicPaused: status.gameLogicPaused
            }));
        };

        // 初回更新
        updateStatus();

        // 定期更新
        const interval = setInterval(updateStatus, 1000);

        return () => clearInterval(interval);
    }, [controller, getStatus]);

    // EffectMonitorからの演出通知を処理するコールバック
    const handleEffectForAnimation = React.useCallback(async (effect, sourceCard) => {
        

        if (!controller) {
            
            return;
        }
        
        
        try {
            // 新しいシステムでエフェクトを処理
            handleGameEffect(gameStateRef.current, effect, sourceCard);
        } catch (error) {
            
            setAnimationState(prev => ({
                ...prev,
                errorCount: prev.errorCount + 1,
                lastError: { effectType: effect.effect_type, error, timestamp: Date.now() }
            }));
        }
    }, [controller, handleGameEffect]);

    // テスト用演出を実行
    const testAnimation = async (target) => {
        if (!controller) {
            //console.warn('🎮GAME_ANIM [Hook] PresentationController not ready');
            return;
        }

        
        // テスト用の演出をキューに追加
        controller.enqueueAnimation({
            type: 'CARD_DAMAGE',
            data: {
                cardId: target.dataset?.cardId || 'test-card',
                amount: -1
            }
        });
    };

    return {
        // 新しいシステムのインターフェース
        controller,
        handleEffectForAnimation,
        pauseGameLogic,
        testAnimation,
        
        // 状態
        animationState,
        
        // 準備状態
        isReady: animationState.isReady
    };
};

export default useAnimationManager;