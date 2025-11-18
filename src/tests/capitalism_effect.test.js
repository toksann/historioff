const assert = require('assert');
const { startTurn, endTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('資本主義 (Capitalism) Card Effect', () => {
    const cardDefinitions = {
        "資本主義": {
            "name": "資本主義",
            "card_type": "イデオロギー",
            "required_scale": 35,
            "is_token": true,
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "PROCESS_MONEY_DURABILITY_BASED_COUNT_MODIFY_CARD_DURABILITY", "args": { "player_id": "self", "target_player_id": "self", "amount": 1 } },
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "self_money_on_field", "source_pile": "field", "destination_pile": "discard", "player_id": "self" } }
                ],
                "START_TURN_OWNER": [
                    { "effect_type": "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH", "args": { "player_ids": "self", "amount": 2 } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability_based_on_field_wealth_total": true } }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": "財", "is_token": true },
        "農民": { "name": "農民", "card_type": "財", "durability": 5 }
    };

    test('should add a Money card based on total wealth durability at start of turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;

        const capitalismCard = createCardInstance(cardDefinitions['資本主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = capitalismCard;
        gameState.all_card_instances[capitalismCard.instance_id] = capitalismCard;

        const farmer1 = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 5 });
        const farmer2 = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 5 });
        p1.field = [farmer1, farmer2];
        gameState.all_card_instances[farmer1.instance_id] = farmer1;
        gameState.all_card_instances[farmer2.instance_id] = farmer2;

        // 2. Execution
        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const moneyInHand = finalP1.hand.find(c => c.name === 'マネー');

        // Each farmer takes 2 damage (5 -> 3). Total durability is 3 + 3 = 6.
        const expectedMoneyDurability = 6;

        assert.ok(moneyInHand, 'A Money card should be added to hand');
        assert.strictEqual(moneyInHand.current_durability, expectedMoneyDurability, `Money card durability should be ${expectedMoneyDurability}`)
    });

    test('should boost wealth durability and discard Money at end of turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;

        const capitalismCard = createCardInstance(cardDefinitions['資本主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = capitalismCard;
        gameState.all_card_instances[capitalismCard.instance_id] = capitalismCard;

        const farmer1 = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 5 });
        const farmer2 = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 5 });
        const moneyCard = createCardInstance(cardDefinitions['マネー'], p1.id, { location: Location.FIELD, current_durability: 10 });
        p1.field = [farmer1, farmer2, moneyCard];
        [farmer1, farmer2, moneyCard].forEach(c => gameState.all_card_instances[c.instance_id] = c);

        const initialTotalDurability = farmer1.current_durability + farmer2.current_durability + moneyCard.current_durability; // 5 + 5 + 10 = 20
        const moneyDurability = moneyCard.current_durability; // 10

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalFarmer1 = finalP1.field.find(c => c.instance_id === farmer1.instance_id);
        const finalFarmer2 = finalP1.field.find(c => c.instance_id === farmer2.instance_id);
        const finalMoneyInDiscard = finalP1.discard.find(c => c.instance_id === moneyCard.instance_id);

        assert.ok(finalMoneyInDiscard, 'The Money card should be in the discard pile');
        
        // The total durability of the cards that were on the field should increase by the money's durability.
        const finalTotalDurability = (finalFarmer1 ? finalFarmer1.current_durability : 0) + 
                                     (finalFarmer2 ? finalFarmer2.current_durability : 0) + 
                                     finalMoneyInDiscard.current_durability;

        assert.strictEqual(finalTotalDurability, initialTotalDurability + moneyDurability, 'Total durability should be increased by the Money card\'s durability');
    });
});
