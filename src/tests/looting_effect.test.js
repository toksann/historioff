const assert = require('assert');
const { playCard, resolveInput } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('略奪 (Looting) Card Effect', () => {
    const cardDefinitions = {
        "略奪": {
            "name": "略奪",
            "card_type": "事象",
            "required_scale": 0,
            "description": "相手の財カード1枚に2ダメージ。相手の規模-2、自分の規模+2。ダメージを与えたとき、その対象が「マネー」ならさらに自分の規模+3",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH",
                        "args": {
                            "player_id": "self",
                            "target_player_id": "opponent",
                            "amount": -2,
                            "bonus_effect_if_money": true,
                            "bonus_scale_amount": 3
                        }
                    }
                ],
                "SUCCESS_PROCESS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "opponent", "amount": -2 } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": 2 } }
                ]
            }
        },
        "戦士": { "name": "戦士", "card_type": "財", "required_scale": 1, "durability": 3 },
        "マネー": { "name": "マネー", "card_type": "財", "required_scale": 0, "durability": 3, "is_token": true }
    };

    test('should deal 2 damage to a normal wealth card and adjust scale', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        const lootingCard = createCardInstance(cardDefinitions['略奪'], p1.id);
        p1.hand.push(lootingCard);
        gameState.all_card_instances[lootingCard.instance_id] = lootingCard;

        const warriorCard = createCardInstance(cardDefinitions['戦士'], p2.id, { location: Location.FIELD, current_durability: 3 });
        p2.field.push(warriorCard);
        gameState.all_card_instances[warriorCard.instance_id] = warriorCard;

        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;
        const initialWarriorDurability = warriorCard.current_durability;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, lootingCard.instance_id);
        newState = processEffects(newState); // Process until input is required

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');
        assert.strictEqual(newState.awaiting_input.type, 'CHOICE_CARD_FOR_EFFECT', 'Input type should be CHOICE_CARD_FOR_EFFECT');

        // Player 1 chooses the Warrior card
        let finalState = resolveInput(newState, warriorCard);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const finalWarrior = finalState.all_card_instances[warriorCard.instance_id];

        assert.strictEqual(finalWarrior.current_durability, initialWarriorDurability - 2, 'Warrior should take 2 damage');
        assert.strictEqual(finalP1.scale, initialP1Scale + 2, 'Player 1 scale should increase by 2');
        assert.strictEqual(finalP2.scale, initialP2Scale - 2, 'Player 2 scale should decrease by 2');
    });

    test('should provide a bonus +3 scale when targeting a Money card', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        const lootingCard = createCardInstance(cardDefinitions['略奪'], p1.id);
        p1.hand.push(lootingCard);
        gameState.all_card_instances[lootingCard.instance_id] = lootingCard;

        const moneyCard = createCardInstance(cardDefinitions['マネー'], p2.id, { location: Location.FIELD, current_durability: 3 });
        p2.field.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;
        const initialMoneyDurability = moneyCard.current_durability;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, lootingCard.instance_id);
        newState = processEffects(newState); // Process until input is required

        assert.ok(newState.awaiting_input, 'Game should be awaiting user input');

        // Player 1 chooses the Money card
        let finalState = resolveInput(newState, moneyCard);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const finalMoney = finalState.all_card_instances[moneyCard.instance_id];

        assert.strictEqual(finalMoney.current_durability, initialMoneyDurability - 2, 'Money card should take 2 damage');
        assert.strictEqual(finalP1.scale, initialP1Scale + 2 + 3, 'Player 1 scale should increase by 5 (2 base + 3 bonus)');
        assert.strictEqual(finalP2.scale, initialP2Scale - 2, 'Player 2 scale should decrease by 2');
    });
});
