const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('徴兵 (Conscription) Card Effect', () => {
    const cardDefinitions = {
        "徴兵": {
            "name": "徴兵",
            "card_type": "事象",
            "required_scale": 5,
            "description": "自分の場に「戦士」を1枚配置する。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "self",
                            "card_template_name": "戦士",
                            "destination_pile": "field"
                        }
                    }
                ]
            }
        },
        "戦士": { "name": "戦士", "card_type": "財", "is_token": true, "durability": 10 },
    };

    test('should place a Warrior card on the player\'s field', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 5; // Set scale to meet the card requirement

        const conscriptionCard = createCardInstance(cardDefinitions['徴兵'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(conscriptionCard);
        gameState.all_card_instances[conscriptionCard.instance_id] = conscriptionCard;

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, conscriptionCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification
        const p1_warrior = nextState.players[PlayerId.PLAYER1].field.find(c => c.name === '戦士');
        const p2_warrior = nextState.players[PlayerId.PLAYER2].field.find(c => c.name === '戦士');

        assert.ok(p1_warrior, 'A Warrior card should be on Player 1\'s field.');
        assert.strictEqual(nextState.players[PlayerId.PLAYER1].field.length, 1, 'Player 1\'s field should have exactly one card.');
        assert.strictEqual(p1_warrior.name, '戦士', 'The card on Player 1\'s field should be a Warrior.');
        
        assert.ok(!p2_warrior, 'No Warrior card should be on Player 2\'s field.');
        assert.strictEqual(nextState.players[PlayerId.PLAYER2].field.length, 0, 'Player 2\'s field should be empty.');
    });
});
