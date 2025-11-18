const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('解体 (Deconstruction) Card Effect', () => {
    const cardDefinitions = {
        "解体": {
            "name": "解体",
            "card_type": "事象",
            "required_scale": 2,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "modify_durability", "target_player_id": "self", "selection_method": "choice", "amount": -4 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability": 1 } }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": "財" },
        "農民": { "name": "農民", "card_type": "財", "durability": 5 }
    };

    test('should damage a chosen friendly wealth card and add a Money card to hand', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        
        const peasantCard = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 5 });
        p1.field.push(peasantCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;

        const deconstructionCard = createCardInstance(cardDefinitions['解体'], p1.id);
        p1.hand.push(deconstructionCard);
        gameState.all_card_instances[deconstructionCard.instance_id] = deconstructionCard;
        p1.scale = 2;

        const initialPeasantDurability = peasantCard.current_durability;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, deconstructionCard.instance_id);
        while (newState.effect_queue.length > 0 && !newState.awaiting_input) {
            newState = processEffects(newState);
        }

        assert.ok(newState.awaiting_input, 'Game should be awaiting input for target selection');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARDS_FOR_OPERATION', 'Input type should be CHOICE_CARDS_FOR_OPERATION');
        
        // Player chooses the Peasant card
        let finalState = resolveInput(newState, [peasantCard.instance_id]);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalPeasant = finalState.all_card_instances[peasantCard.instance_id];
        const moneyCardInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');

        assert.strictEqual(finalPeasant.current_durability, initialPeasantDurability - 4, 'Peasant durability should decrease by 4');
        assert.ok(moneyCardInHand, 'A "Money" card should be added to hand');
    });
});
