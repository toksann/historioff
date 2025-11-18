const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location, INITIAL_CONSCIOUSNESS } = require('../gameLogic/constants');

describe('内部崩壊 (Internal Collapse) Card Effect', () => {
    const cardDefinitions = {
        "内部崩壊": {
            "name": "内部崩壊",
            "card_type": "事象",
            "required_scale": 30,
            "description": "相手の規模を半分にし（切り捨て）、相手の意識をその半減した規模の値だけ減らす。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": {
                            "player_id": "opponent",
                            "amount_percentage": -50,
                            "round_down": true,
                            "store_original_value_for_temp": "scale_before_reduction"
                        }
                    },
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "opponent",
                            "amount_based_on_temp_value": "scale_before_reduction",
                            "is_negative": true
                        }
                    }
                ]
            }
        }
    };

    test('should halve opponent\'s scale and reduce consciousness by the halved amount', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.scale = 30; // To meet the required_scale
        p2.scale = 25; // Odd number to test rounding down

        const collapseCard = createCardInstance(cardDefinitions['内部崩壊'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(collapseCard);
        gameState.all_card_instances[collapseCard.instance_id] = collapseCard;
        
        const initialP2Consciousness = p2.consciousness;
        const initialP2Scale = p2.scale;
        const expectedScaleReduction = Math.floor(initialP2Scale / 2);
        const expectedFinalScale = initialP2Scale - expectedScaleReduction;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, collapseCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        const p2Final = nextState.players[PlayerId.PLAYER2];

        assert.strictEqual(p2Final.scale, expectedFinalScale, `Opponent's scale should be reduced to ${expectedFinalScale}`);
        assert.strictEqual(p2Final.consciousness, initialP2Consciousness - expectedScaleReduction, `Opponent's consciousness should be reduced by ${expectedScaleReduction}`);
    });
});
