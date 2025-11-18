const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('受難 (Suffering) Card Effect', () => {
    const cardDefinitions = {
        "受難": {
            "name": "受難",
            "card_type": "事象",
            "required_scale": 0,
            "is_token": true,
            "triggers": {
                "PLAY_EVENT_THIS": [
                    { "effect_type": "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH", "args": { "player_ids": "self_and_opponent", "amount": 1 } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": -5 } }
                ]
            }
        },
        "戦士": { "name": "戦士", "card_type": "財", "durability": 2 },
        "農民": { "name": "農民", "card_type": "財", "durability": 1 }
    };

    test('should deal 1 damage to all wealth and reduce own scale by 5', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 10;
        const sufferingCard = createCardInstance(cardDefinitions['受難'], p1.id);
        p1.hand.push(sufferingCard);
        gameState.all_card_instances[sufferingCard.instance_id] = sufferingCard;

        const p1Warrior = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD, current_durability: 2 });
        const p1Peasant = createCardInstance(cardDefinitions['農民'], p1.id, { location: Location.FIELD, current_durability: 1 });
        p1.field = [p1Warrior, p1Peasant];

        const p2Warrior = createCardInstance(cardDefinitions['戦士'], p2.id, { location: Location.FIELD, current_durability: 2 });
        p2.field = [p2Warrior];
        
        [p1Warrior, p1Peasant, p2Warrior].forEach(c => gameState.all_card_instances[c.instance_id] = c);

        const initialP1Scale = p1.scale;
        const initialP1WarriorDurability = p1Warrior.current_durability;
        const initialP2WarriorDurability = p2Warrior.current_durability;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, sufferingCard.instance_id);
        newState = processAllEffects(newState);

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP1Warrior = finalP1.field.find(c => c.instance_id === p1Warrior.instance_id);
        const finalP1Peasant_discard = finalP1.discard.find(c => c.instance_id === p1Peasant.instance_id);
        const finalP2Warrior = newState.players[PlayerId.PLAYER2].field.find(c => c.instance_id === p2Warrior.instance_id);

        assert.strictEqual(finalP1.scale, initialP1Scale - 5, 'P1 scale should decrease by 5');
        assert.strictEqual(finalP1Warrior.current_durability, initialP1WarriorDurability - 1, 'P1 Warrior durability should decrease by 1');
        assert.ok(finalP1Peasant_discard, 'P1 Peasant should be destroyed and in the discard pile');
        assert.strictEqual(finalP2Warrior.current_durability, initialP2WarriorDurability - 1, 'P2 Warrior durability should decrease by 1');
    });
});
