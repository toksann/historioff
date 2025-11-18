const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, EffectType, Location } = require('../gameLogic/constants');

describe('開拓民 (Settler) Card Effect', () => {
    const cardDefinitions = {
        "開拓民": {
            "name": "開拓民",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "description": "配置時、自分の規模+1、「開拓」を1枚手札に加える。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "self", "amount": 1 }
                    },
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "self",
                            "card_template_name": "開拓",
                            "destination_pile": "hand"
                        }
                    }
                ]
            }
        },
        "開拓": {
            "name": "開拓",
            "card_type": "事象",
            "required_scale": 30,
            "description": "自分の場を1増やす。"
        }
    };

    test('should increase scale and add a Pioneer card to hand when placed', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];

        const settlerCard = createCardInstance(cardDefinitions['開拓民'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(settlerCard);
        gameState.all_card_instances[settlerCard.instance_id] = settlerCard;

        const initialScale = p1.scale;
        const initialHandSize = p1.hand.length;

        // 2. Execution
        // Simulate playing the card from hand to field
        const moveEffect = {
            effect_type: EffectType.MOVE_CARD,
            args: {
                player_id: PlayerId.PLAYER1,
                card_id: settlerCard.instance_id,
                source_pile: 'hand',
                destination_pile: 'field'
            }
        };
        gameState.effect_queue.push([moveEffect, settlerCard]);
        let nextState = processEffects(gameState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const pioneerCardInHand = p1Final.hand.find(c => c.name === '開拓');

        assert.strictEqual(p1Final.scale, initialScale + 1, "Player 1's scale should increase by 1");
        // Hand size should be the same because 1 card was played and 1 was added
        assert.strictEqual(p1Final.hand.length, initialHandSize, "Player 1's hand size should remain the same");
        assert.ok(pioneerCardInHand, 'A "開拓" card should be added to hand');
    });
});
