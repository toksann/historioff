const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('技術革新 (Technological Innovation) Card Effect', () => {
    const cardDefinitions = {
        "技術革新": {
            "name": "技術革新",
            "card_type": "事象",
            "required_scale": 3,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 2 } },
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "modify_durability", "target_player_id": "self", "selection_method": "choice", "amount": 1 } }
                ]
            }
        },
        "商人": { "name": "商人", "card_type": "財", "durability": 1 }
    };

    test('should increase scale by 2 and target wealth durability by 1', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const merchantCard = createCardInstance(cardDefinitions['商人'], p1.id, { location: Location.FIELD, current_durability: 1 });
        p1.field.push(merchantCard);
        gameState.all_card_instances[merchantCard.instance_id] = merchantCard;

        const techInnovationCard = createCardInstance(cardDefinitions['技術革新'], p1.id);
        p1.hand.push(techInnovationCard);
        gameState.all_card_instances[techInnovationCard.instance_id] = techInnovationCard;
        p1.scale = techInnovationCard.required_scale;

        const initialP1Scale = p1.scale;
        const initialMerchantDurability = merchantCard.current_durability;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, techInnovationCard.instance_id);
        newState = processAllEffects(newState);

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input for target selection');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARDS_FOR_OPERATION', 'Input type should be CHOICE_CARDS_FOR_OPERATION');

        // Player chooses the Merchant card
        let finalState = resolveInput(newState, [merchantCard]);
        finalState = processAllEffects(finalState);

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalMerchantCard = finalState.all_card_instances[merchantCard.instance_id];

        assert.strictEqual(finalP1.scale, initialP1Scale + 2, 'Scale should increase by 2');
        assert.strictEqual(finalMerchantCard.current_durability, initialMerchantDurability + 1, 'Merchant durability should increase by 1');
    });
});
