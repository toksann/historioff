const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('民族自決 (Self-determination) Card Effect', () => {
    const cardDefinitions = {
        "民族自決": {
            "name": "民族自決",
            "card_type": "事象",
            "required_scale": 10,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_ADD_CHOICE_CARD_TO_HAND", "args": { "player_id": "self", "options": ["汎民族主義", "分離主義"] } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 3 } }
                ]
            }
        },
        "汎民族主義": { "name": "汎民族主義", "card_type": "イデオロギー" },
        "分離主義": { "name": "分離主義", "card_type": "イデオロギー" }
    };

    test('should add a chosen ideology to hand and gain 3 consciousness', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const selfDeterminationCard = createCardInstance(cardDefinitions['民族自決'], p1.id);
        p1.hand.push(selfDeterminationCard);
        gameState.all_card_instances[selfDeterminationCard.instance_id] = selfDeterminationCard;
        p1.scale = selfDeterminationCard.required_scale;

        const initialP1Consciousness = p1.consciousness;
        const initialHandCount = p1.hand.length;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, selfDeterminationCard.instance_id);
        while (newState.effect_queue.length > 0 && !newState.awaiting_input) {
            newState = processEffects(newState);
        }

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARD_TO_ADD', 'Input type should be CHOICE_CARD_TO_ADD');
        assert.deepStrictEqual(newState.awaiting_input.options.sort(), ['汎民族主義', '分離主義'].sort(), 'Options should be Pan-nationalism and Separatism');

        // Player chooses Pan-nationalism
        let finalState = resolveInput(newState, '汎民族主義');
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const addedCard = finalP1.hand.find(c => c.name === '汎民族主義');

        assert.strictEqual(finalP1.consciousness, initialP1Consciousness + 3, 'Consciousness should increase by 3');
        assert.ok(addedCard, 'The chosen card should be added to hand');
        // Hand count should be the same (play 1, add 1)
        assert.strictEqual(finalP1.hand.length, initialHandCount, 'Hand size should not change');
    });
});
