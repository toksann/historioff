const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('接収 (Seizure) Card Effect', () => {
    const cardDefinitions = {
        "接収": {
            "name": "接収",
            "card_type": "事象",
            "required_scale": 0,
            "description": "自分の場の財カード1枚を手札に戻し、自分の規模+4。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_CHOOSE_AND_BOUNCE_TO_WEALTH", "args": { "player_id": "self", "target_player_id": "self" } }
                ],
                "SUCCESS_PROCESS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 4 } }
                ]
            }
        },
        "戦士": { "name": "戦士", "card_type": "財", "required_scale": 1, "durability": 2 }
    };

    test('should return a card from field to hand and increase scale by 4', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const seizureCard = createCardInstance(cardDefinitions['接収'], p1.id);
        const warriorCard = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        p1.hand.push(seizureCard);
        p1.field.push(warriorCard);
        gameState.all_card_instances[seizureCard.instance_id] = seizureCard;
        gameState.all_card_instances[warriorCard.instance_id] = warriorCard;

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length; // 1
        const initialFieldCount = p1.field.length; // 1

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, seizureCard.instance_id);
        newState = processEffects(newState);

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARD_FOR_EFFECT', 'Input type should be CHOICE_CARD_FOR_EFFECT');

        // Player 1 chooses the Warrior card to return to hand
        let finalState = resolveInput(newState, warriorCard);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const warriorInHand = finalP1.hand.find(c => c.instance_id === warriorCard.instance_id);

        assert.strictEqual(finalP1.scale, initialScale + 4, 'Scale should increase by 4');
        assert.strictEqual(finalP1.field.length, 0, 'Field should be empty');
        // Hand: -1 (Seizure played), +1 (Warrior bounced) -> net 0 change
        assert.strictEqual(finalP1.hand.length, initialHandCount, 'Hand size should remain the same');
        assert.ok(warriorInHand, 'The targeted card should be back in hand');
    });

    test('should do nothing if the field is empty', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const seizureCard = createCardInstance(cardDefinitions['接収'], p1.id);
        p1.hand.push(seizureCard);
        gameState.all_card_instances[seizureCard.instance_id] = seizureCard;

        const initialScale = p1.scale;
        const initialHandCount = p1.hand.length; // 1

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, seizureCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];

        assert.strictEqual(newState.awaiting_input, null, 'Should not be awaiting input as there are no targets');
        assert.strictEqual(finalP1.scale, initialScale, 'Scale should not change');
        // Hand: -1 (Seizure played), no bounce
        assert.strictEqual(finalP1.hand.length, initialHandCount - 1, 'Hand size should decrease by 1');
    });
});
