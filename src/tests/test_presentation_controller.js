/**
 * プレゼンテーション制御システムのテスト
 */

import PresentationController from '../gameLogic/PresentationController.js';

describe('PresentationController', () => {
    let controller;

    beforeEach(() => {
        controller = new PresentationController();
    });

    afterEach(() => {
        if (controller) {
            controller.clear();
        }
    });

    test('should initialize correctly', () => {
        expect(controller).toBeDefined();
        expect(controller.animationQueue).toEqual([]);
        expect(controller.currentAnimation).toBeNull();
        expect(controller.gameLogicPaused).toBe(false);
    });

    test('should enqueue animations', () => {
        const animation = {
            type: 'CARD_DAMAGE',
            data: { cardId: 'test-card', amount: -1 }
        };

        controller.enqueueAnimation(animation);

        expect(controller.animationQueue.length).toBe(1);
        expect(controller.animationQueue[0].type).toBe('CARD_DAMAGE');
    });

    test('should process game effects and create animations', () => {
        const effect = {
            effect_type: 'MODIFY_CARD_DURABILITY',
            args: {
                card_id: 'test-card',
                amount: -2
            }
        };

        controller.onGameEffect(effect, null);

        expect(controller.animationQueue.length).toBe(1);
        expect(controller.animationQueue[0].type).toBe('CARD_DAMAGE');
        expect(controller.animationQueue[0].data.cardId).toBe('test-card');
        expect(controller.animationQueue[0].data.amount).toBe(-2);
    });

    test('should handle wealth durability zero effect', () => {
        const effect = {
            effect_type: 'WEALTH_DURABILITY_ZERO_THIS',
            args: {
                card_id: 'test-card'
            }
        };

        controller.onGameEffect(effect, null);

        expect(controller.animationQueue.length).toBe(1);
        expect(controller.animationQueue[0].type).toBe('CARD_DESTROY');
        expect(controller.animationQueue[0].data.cardId).toBe('test-card');
    });

    test('should sequence damage and destroy animations', () => {
        // ダメージエフェクト
        const damageEffect = {
            effect_type: 'MODIFY_CARD_DURABILITY',
            args: {
                card_id: 'test-card',
                amount: -1
            }
        };

        // 破壊エフェクト
        const destroyEffect = {
            effect_type: 'WEALTH_DURABILITY_ZERO_THIS',
            args: {
                card_id: 'test-card'
            }
        };

        controller.onGameEffect(damageEffect, null);
        controller.onGameEffect(destroyEffect, null);

        expect(controller.animationQueue.length).toBe(2);
        expect(controller.animationQueue[0].type).toBe('CARD_DAMAGE');
        expect(controller.animationQueue[1].type).toBe('CARD_DESTROY');
    });

    test('should pause and resume game logic', () => {
        let resumed = false;
        const resumeCallback = () => { resumed = true; };

        controller.pauseGameLogic(resumeCallback);

        expect(controller.gameLogicPaused).toBe(true);
        expect(resumed).toBe(false);

        controller.resumeGameLogic();

        expect(controller.gameLogicPaused).toBe(false);
        expect(resumed).toBe(true);
    });

    test('should get status correctly', () => {
        const animation = {
            type: 'CARD_DAMAGE',
            data: { cardId: 'test-card', amount: -1 }
        };

        controller.enqueueAnimation(animation);

        const status = controller.getStatus();

        expect(status.queueLength).toBe(1);
        expect(status.currentAnimation).toBeNull();
        expect(status.gameLogicPaused).toBe(false);
    });

    test('should clear correctly', () => {
        const animation = {
            type: 'CARD_DAMAGE',
            data: { cardId: 'test-card', amount: -1 }
        };

        controller.enqueueAnimation(animation);
        controller.pauseGameLogic(() => {});

        controller.clear();

        expect(controller.animationQueue.length).toBe(0);
        expect(controller.currentAnimation).toBeNull();
        expect(controller.gameLogicPaused).toBe(false);
    });
});