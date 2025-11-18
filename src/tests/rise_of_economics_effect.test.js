const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('経済学の興り (Rise of Economics) Card Effect', () => {
    const cardDefinitions = {
        "経済学の興り": {
            "name": "経済学の興り",
            "card_type": "事象",
            "required_scale": 3,
            "description": "自分の手札に「重金主義」を1枚手札に加え、自分の意識+1。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": { "player_id": "self", "card_template_name": "重金主義", "destination_pile": "hand" }
                    },
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "self", "amount": 1 }
                    }
                ]
            }
        },
        "重金主義": {
            "name": "重金主義",
            "card_type": "イデオロギー",
            "required_scale": 10,
            "description": "..."
        }
    };

    test('should add Bullionism to hand and increase consciousness by 1', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const riseOfEconomicsCard = createCardInstance(cardDefinitions['経済学の興り'], p1.id);
        p1.hand.push(riseOfEconomicsCard);
        gameState.all_card_instances[riseOfEconomicsCard.instance_id] = riseOfEconomicsCard;

        p1.scale = 3; // Meet required scale
        const initialConsciousness = p1.consciousness;
        const initialHandCount = p1.hand.length; // 1

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, riseOfEconomicsCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const bullionismInHand = finalP1.hand.find(c => c.name === '重金主義');

        assert.ok(bullionismInHand, 'A "Bullionism" card should be added to the hand');
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
        // Hand: -1 (Rise of Econ played), +1 (Bullionism added) -> net 0 change
        assert.strictEqual(finalP1.hand.length, initialHandCount, 'Hand size should remain the same');
    });
});
