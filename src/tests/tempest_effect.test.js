const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');

describe('大嵐 (Tempest) Card Effect', () => {
    const cardDefinitions = {
        "大嵐": {
            "name": "大嵐",
            "card_type": "事象",
            "required_scale": 0, // Test override
            "description": "相手の意識-15、相手の規模-15、相手の場のすべての財に5ダメージ。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "opponent", "amount": -15 }
                    },
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "opponent", "amount": -15 }
                    },
                    {
                        "effect_type": "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        "args": { "player_ids": "opponent", "amount": 5 }
                    }
                ]
            }
        },
        "財宝1": { "name": "財宝1", "card_type": CardType.WEALTH, "durability": 10 },
        "財宝2": { "name": "財宝2", "card_type": CardType.WEALTH, "durability": 10 },
    };

    test('should decrease opponent stats and damage all their wealth cards', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        // Set initial stats for P2 to make the test more meaningful
        p2.consciousness = 25;
        p2.scale = 20;

        const tempestCard = createCardInstance(cardDefinitions['大嵐'], PlayerId.PLAYER1, { location: Location.HAND });
        const wealth1 = createCardInstance(cardDefinitions['財宝1'], PlayerId.PLAYER2, { location: Location.FIELD, current_durability: 10 });
        const wealth2 = createCardInstance(cardDefinitions['財宝2'], PlayerId.PLAYER2, { location: Location.FIELD, current_durability: 10 });

        p1.hand.push(tempestCard);
        p2.field.push(wealth1, wealth2);
        gameState.all_card_instances[tempestCard.instance_id] = tempestCard;
        gameState.all_card_instances[wealth1.instance_id] = wealth1;
        gameState.all_card_instances[wealth2.instance_id] = wealth2;
        
        const initialP2Consciousness = p2.consciousness;
        const initialP2Scale = p2.scale;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, tempestCard.instance_id);
        // Loop to process all effects until the queue is empty
        let safetyBreak = 0; 
        while (nextState.effect_queue.length > 0 && safetyBreak < 500) {
            nextState = processEffects(nextState);
            safetyBreak++;
        }

        // 3. Verification
        const p2Final = nextState.players[PlayerId.PLAYER2];
        const wealth1Final = p2Final.field.find(c => c.instance_id === wealth1.instance_id);
        const wealth2Final = p2Final.field.find(c => c.instance_id === wealth2.instance_id);

        assert.strictEqual(p2Final.consciousness, initialP2Consciousness - 15, "Opponent's consciousness should decrease by 15");
        assert.strictEqual(p2Final.scale, initialP2Scale - 15, "Opponent's scale should decrease by 15");
        assert.strictEqual(wealth1Final.current_durability, 5, "Wealth 1 durability should be reduced by 5");
        assert.strictEqual(wealth2Final.current_durability, 5, "Wealth 2 durability should be reduced by 5");
    });
});
