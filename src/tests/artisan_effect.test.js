const assert = require('assert');
const { endTurn, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('職人 (Artisan) Card Effect', () => {
    const cardDefinitions = {
        "職人": {
            "name": "職人",
            "card_type": "財",
            "required_scale": 1,
            "durability": 3,
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "modify_required_scale", "source_piles": ["hand"], "card_type": "財", "count": 1, "selection_method": "choice", "amount": -1, "min_value": 0 } }
                ]
            }
        },
        "商人": { "name": "商人", "card_type": "財", "required_scale": 8, "durability": 1 }
    };

    test('should reduce required_scale of a chosen wealth card in hand by 1 at end of turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;

        const artisanCard = createCardInstance(cardDefinitions['職人'], p1.id, { location: Location.FIELD });
        p1.field.push(artisanCard);
        gameState.all_card_instances[artisanCard.instance_id] = artisanCard;

        const merchantCard = createCardInstance(cardDefinitions['商人'], p1.id, { required_scale: 8 });
        p1.hand.push(merchantCard);
        gameState.all_card_instances[merchantCard.instance_id] = merchantCard;

        const initialMerchantScale = merchantCard.required_scale;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0 && !newState.awaiting_input) {
            newState = processEffects(newState);
        }

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARDS_FOR_OPERATION', 'Input type should be CHOICE_CARDS_FOR_OPERATION');

        // Player chooses the Merchant card
        let finalState = resolveInput(newState, [merchantCard.instance_id]);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalMerchantCard = finalState.all_card_instances[merchantCard.instance_id];
        assert.strictEqual(finalMerchantCard.required_scale, initialMerchantScale - 1, 'Merchant required_scale should decrease by 1');
    });
});
