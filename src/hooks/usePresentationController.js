import { useRef, useEffect, useCallback } from 'react';
import PresentationController from '../gameLogic/PresentationController.js';

/**
 * プレゼンテーション制御システムのフック
 */
const usePresentationController = (gameState, effectMonitor) => {
    const controllerRef = useRef(null);
    const memoizedOnGameEffectRef = useRef(null); // Stable reference for the bound function

    // プレゼンテーション制御システムを初期化
    useEffect(() => {
        
        if (!controllerRef.current) {
            controllerRef.current = new PresentationController();
            
            
            // Generate a stable reference for the bound function only once
            memoizedOnGameEffectRef.current = controllerRef.current.onGameEffect.bind(controllerRef.current);
            

            // EffectMonitorが提供されていれば、onGameEffectをアニメーションコールバックとして登録
            if (effectMonitor) {
                
                if (!effectMonitor.isCallbackRegistered(memoizedOnGameEffectRef.current)) {
                    effectMonitor.registerAnimationCallback(memoizedOnGameEffectRef.current);
                    
                } else {
                    
                }
            } else {
                
            }
        } else {
            
            // Generate a stable reference if it somehow got lost (unlikely but safe)
            if (!memoizedOnGameEffectRef.current) {
                memoizedOnGameEffectRef.current = controllerRef.current.onGameEffect.bind(controllerRef.current);
                
            }

            // If effectMonitor becomes available later, register it.
            if (effectMonitor && !effectMonitor.isCallbackRegistered(memoizedOnGameEffectRef.current)) {
                
                effectMonitor.registerAnimationCallback(memoizedOnGameEffectRef.current);
                
            } else {
                if (effectMonitor) {
                    
                }
            }
        }

        return () => {
            if (controllerRef.current) {
                controllerRef.current.clear();
                // クリーンアップ時にコールバックも削除
                if (effectMonitor && memoizedOnGameEffectRef.current) {
                    
                    effectMonitor.removeAnimationCallback(memoizedOnGameEffectRef.current);
                    
                }
            }
        };
    }, [effectMonitor]); // effectMonitorを依存配列に追加

    // gameStateが変更されたら、controllerに最新のgameStateを渡す
    useEffect(() => {
        if (controllerRef.current && gameState) {
            controllerRef.current.setGameState(gameState);
        }
    }, [gameState]);

// エフェクト処理のコールバック
    const handleGameEffect = useCallback((gameState, effect, sourceCard) => {
        
        
        
        if (controllerRef.current) {
            controllerRef.current.onGameEffect(gameState, effect, sourceCard);
        }
    }, []);

    // ゲームロジック一時停止のコールバック
    const pauseGameLogic = useCallback((resumeCallback) => {
        if (controllerRef.current) {
            controllerRef.current.pauseGameLogic(resumeCallback);
        }
    }, []);

    // 演出システムの状態を取得
    const getStatus = useCallback(() => {
        return controllerRef.current ? controllerRef.current.getStatus() : {
            queueLength: 0,
            currentAnimation: null,
            gameLogicPaused: false
        };
    }, []);

    return {
        controller: controllerRef.current,
        handleGameEffect,
        pauseGameLogic,
        getStatus
    };
};

export default usePresentationController;