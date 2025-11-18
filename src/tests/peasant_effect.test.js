const assert = require('assert');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');
const { PlayerId, EffectType, Location, TriggerType } = require('../gameLogic/constants');

describe('農民 (Peasant) Card Effect', () => {
    let gameState;
    const cardDefinitions = {
        "農民": {
            "name": "農民",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "description": "ターン終了時に自分の規模+1。耐久値が0になったとき「農民」を手札に加える。",
            "triggers": {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "self", "amount": 1 }
                    }
                ],
                "WEALTH_DURABILITY_ZERO_THIS": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "self",
                            "card_template_name": "農民",
                            "destination_pile": "hand"
                        }
                    }
                ]
            }
        },
        "攻撃カード": { "name": "攻撃カード", "card_type": "事象" },
    };

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
    });

    test('should increase owner\'s scale by 1 at the end of the turn', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(peasantCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;

        const initialScale = p1.scale;

        // 2. Execution
        const endTurnEffect = {
            effect_type: TriggerType.END_TURN_OWNER,
            args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 }
        };
        gameState.effect_queue.push([endTurnEffect, null]);
        let nextState = processAllEffects(gameState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        assert.strictEqual(p1Final.scale, initialScale + 1, "Player 1's scale should increase by 1");
    });

    test('should add a Peasant card to hand when durability becomes zero', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { instance_id: 'p1-peasant-1', location: Location.FIELD, current_durability: 1 });
        const attackerCard = createCardInstance(cardDefinitions['攻撃カード'], PlayerId.PLAYER2, { instance_id: 'p2-attacker-1' });

        p1.field.push(peasantCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;
        gameState.all_card_instances[attackerCard.instance_id] = attackerCard;

        const initialHandSize = p1.hand.length;

        // 2. Execution
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY,
            args: {
                card_id: peasantCard.instance_id,
                amount: -1,
                source_card_id: attackerCard.instance_id
            }
        };
        gameState.effect_queue.push([damageEffect, attackerCard]);
        let nextState = processAllEffects(gameState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const newPeasantInHand = p1Final.hand.find(c => c.name === '農民');
        
        assert.strictEqual(p1Final.hand.length, initialHandSize + 1, 'Player 1 should have one more card in hand');
        assert.ok(newPeasantInHand, 'A new Peasant card should be in hand');
    });
});
