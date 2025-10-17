const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('大地震 (Earthquake) Card Effect', () => {
    const cardDefinitions = {
        "大地震": {
            name: "大地震",
            card_type: CardType.EVENT,
            required_scale: 100,
            is_token: true,
            description: "このカードを引いたとき即座に捨て札になる。このカードが捨て札になったとき、自分と相手の意識と規模を-20し、自分と相手の場のすべての財に3ダメージ、2ダメージ、1ダメージを順に与える。",
            triggers: {
                [TriggerType.CARD_DRAWN_THIS]: [
                    {
                        effect_type: "MOVE_CARD",
                        args: {
                            card_id: "self",
                            source_pile: Location.HAND,
                            destination_pile: Location.DISCARD,
                            player_id: "self"
                        }
                    }
                ],
                [TriggerType.CARD_DISCARDED_THIS]: [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: -20 }
                    },
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "opponent", amount: -20 }
                    },
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: { player_id: "self", amount: -20 }
                    },
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: { player_id: "opponent", amount: -20 }
                    },
                    {
                        effect_type: "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        args: { player_ids: "self_and_opponent", amount: 3 }
                    },
                    {
                        effect_type: "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        args: { player_ids: "self_and_opponent", amount: 2 }
                    },
                    {
                        effect_type: "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        args: { player_ids: "self_and_opponent", amount: 1 }
                    }
                ]
            }
        },
        "財宝": {
            name: "財宝",
            card_type: CardType.WEALTH,
            required_scale: 0,
            durability: 10,
        }
    };

    test('PROCESS_DEAL_DAMAGE_TO_ALL_WEALTHが単体で機能するか', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        p1.consciousness = 50;
        const p1Wealth = createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(p1Wealth);
        gameState.all_card_instances[p1Wealth.instance_id] = p1Wealth;

        const earthquakeCard = createCardInstance(cardDefinitions['大地震'], PlayerId.PLAYER1);
        
        // Action
        gameState.effect_queue.push([{
            effect_type: EffectType.PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH,
            args: { 
                player_ids: "self", // 自分だけを対象にする
                amount: 3
            }
        }, earthquakeCard]); // sourceCardとして地震カードを渡す

        let finalState = processEffects(gameState);

        const finalP1Wealth = finalState.all_card_instances[p1Wealth.instance_id];

        // Assertion
        assert.strictEqual(finalP1Wealth.current_durability, 7, '財宝の耐久値は10-3=7になるべきです');
    });

    /*
    test('引かれたときに捨て札になり、捨て札時効果が発動すること', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        // Setup initial state
        p1.consciousness = 50;
        p1.scale = 30;
        const p1Wealth = createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(p1Wealth);
        gameState.all_card_instances[p1Wealth.instance_id] = p1Wealth;


        p2.consciousness = 50;
        p2.scale = 30;
        const p2Wealth = createCardInstance(cardDefinitions['財宝'], PlayerId.PLAYER2, { location: Location.FIELD });
        p2.field.push(p2Wealth);
        gameState.all_card_instances[p2Wealth.instance_id] = p2Wealth;

        const earthquakeCard = createCardInstance(cardDefinitions['大地震'], PlayerId.PLAYER1);
        p1.deck.unshift(earthquakeCard);
        gameState.all_card_instances[earthquakeCard.instance_id] = earthquakeCard;

        // Action: Manually queue the DRAW_CARD effect
        let nextState = gameState;
        nextState.effect_queue.push([{
            effect_type: EffectType.DRAW_CARD,
            args: { 
                player_id: PlayerId.PLAYER1,
            }
        }, null]);

        // Process all effects
        let finalState = nextState;
        let safetyBreak = 0;
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input && safetyBreak < 30) { // Increased safety break
            console.log(`[TEST DEBUG] Loop ${safetyBreak}: Queue length: ${finalState.effect_queue.length}, P1 Consciousness: ${finalState.players.PLAYER1.consciousness}`);
            console.log(`[TEST DEBUG] Next effect: ${finalState.effect_queue[0][0].effect_type}`);
            finalState = processEffects(finalState);
            safetyBreak++;
        }
        console.log(`[TEST DEBUG] Loop finished. P1 Consciousness: ${finalState.players.PLAYER1.consciousness}`);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const finalP1Wealth = finalState.all_card_instances[p1Wealth.instance_id];
        const finalP2Wealth = finalState.all_card_instances[p2Wealth.instance_id];

        // Assertions
        assert.strictEqual(finalP1.hand.some(c => c.name === '大地震'), false, '大地震は手札にないべきです');
        assert.strictEqual(finalP1.discard.some(c => c.name === '大地震'), true, '大地震は捨て札にあるべきです');

        assert.strictEqual(finalP1.consciousness, 30, 'プレイヤー1の意識は50-20=30になるべきです');
        assert.strictEqual(finalP2.consciousness, 30, 'プレイヤー2の意識は50-20=30になるべきです');
        assert.strictEqual(finalP1.scale, 10, 'プレイヤー1の規模は30-20=10になるべきです');
        assert.strictEqual(finalP2.scale, 10, 'プレイヤー2の規模は30-20=10になるべきです');

        assert.strictEqual(finalP1Wealth.durability, 4, 'プレイヤー1の財宝の耐久値は10-3-2-1=4になるべきです');
        assert.strictEqual(finalP2Wealth.durability, 4, 'プレイヤー2の財宝の耐久値は10-3-2-1=4になるべきです');
    });
    */
});