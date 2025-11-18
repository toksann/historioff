const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location } = require('../gameLogic/constants');

describe('豊作 (Bountiful Harvest) Card Effect', () => {
    const cardDefinitions = {
        "豊作": {
            "name": "豊作",
            "card_type": "事象",
            "required_scale": 0,
            "description": "自分の意識+3、自分の規模+3。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "self", "amount": 3 }
                    },
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "self", "amount": 3 }
                    }
                ]
            }
        }
    };

    test('should increase owner\'s consciousness and scale by 3 when played', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];

        const harvestCard = createCardInstance(cardDefinitions['豊作'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(harvestCard);
        gameState.all_card_instances[harvestCard.instance_id] = harvestCard;
        
        const initialConsciousness = p1.consciousness;
        const initialScale = p1.scale;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, harvestCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];

        assert.strictEqual(p1Final.consciousness, initialConsciousness + 3, "Owner's consciousness should increase by 3");
        assert.strictEqual(p1Final.scale, initialScale + 3, "Owner's scale should increase by 3");
    });
});
