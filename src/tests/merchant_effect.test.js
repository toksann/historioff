const assert = require('assert');
const { startTurn } = require('../gameLogic/main');
const { PlayerId, Location, EffectType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('商人 (Merchant) Card Effect', () => {
    const cardDefinitions = {
        "商人": {
            "name": "商人",
            "card_type": "財",
            "required_scale": 8,
            "durability": 1,
            "triggers": {
                "START_TURN_OWNER": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 1 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability": 1 } }
                ],
                "WEALTH_DURABILITY_ZERO_THIS": [
                    { "effect_type": "PROCESS_ADD_CARD_CONDITIONAL", "args": { "player_id": "self", "condition_target": "scale", "threshold": 15, "card_template_name": "商人" } }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": "財" }
    };

    let gameState, p1, merchantCard;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        merchantCard = createCardInstance(cardDefinitions['商人'], p1.id, { location: Location.FIELD, current_durability: 1 });
        p1.field.push(merchantCard);
        gameState.all_card_instances[merchantCard.instance_id] = merchantCard;
        gameState.current_turn = PlayerId.PLAYER1;

        // Add a dummy card to the deck for drawing
        const dummyCard = createCardInstance({ name: 'Dummy Card', card_type: 'イベント' }, p1.id);
        p1.deck.push(dummyCard);
        gameState.all_card_instances[dummyCard.instance_id] = dummyCard;
    });

    test('should gain 1 scale and add a Money card to hand at start of turn', () => {
        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length;

        let newState = startTurn(gameState);
        newState = processAllEffects(newState);

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const hasMoney = finalP1.hand.some(c => c.name === 'マネー');
        assert.strictEqual(finalP1.scale, initialScale + 1, 'Scale should increase by 1');
        assert.strictEqual(finalP1.hand.length, initialHandCount + 2, 'Hand size should increase by 2 (draw + effect)');
        assert.ok(hasMoney, 'A Money card should be added to hand');
    });

    test('should add a new Merchant to hand when destroyed if scale is >= 15', () => {
        p1.scale = 15;
        const damageEffect = { effect_type: EffectType.MODIFY_CARD_DURABILITY, args: { card_id: merchantCard.instance_id, amount: -1 } };
        gameState.effect_queue.push([damageEffect, null]);

        let newState = processAllEffects(gameState);

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const newMerchantInHand = finalP1.hand.find(c => c.name === '商人' && c.instance_id !== merchantCard.instance_id);
        assert.ok(newMerchantInHand, 'A new Merchant card should be added to hand');
    });

    test('should NOT add a new Merchant to hand when destroyed if scale is < 15', () => {
        p1.scale = 14;
        const damageEffect = { effect_type: EffectType.MODIFY_CARD_DURABILITY, args: { card_id: merchantCard.instance_id, amount: -1 } };
        gameState.effect_queue.push([damageEffect, null]);

        let newState = processAllEffects(gameState);

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const merchantInDiscard = finalP1.discard.find(c => c.instance_id === merchantCard.instance_id);
        const newMerchantInHand = finalP1.hand.find(c => c.name === '商人' && c.instance_id !== merchantCard.instance_id);
        assert.ok(merchantInDiscard, 'The original Merchant should be in the discard pile');
        assert.strictEqual(newMerchantInHand, undefined, 'No new Merchant card should be added to hand');
    });
});
