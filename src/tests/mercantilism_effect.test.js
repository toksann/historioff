const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard, resolveInput } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, EffectType, Location, TriggerType, CardType } = require('../gameLogic/constants');

describe('重商主義 (Mercantilism) Card Effect', () => {
    const cardDefinitions = {
        "重商主義": {
            "name": "重商主義",
            "card_type": CardType.IDEOLOGY,
            "required_scale": 10,
            "triggers": {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_REDUCE_MONEY_DURABILITY_AND_GAIN_SCALE",
                        "args": { "player_id": "self" }
                    }
                ],
                "START_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_MODIFY_MONEY_DURABILITY_RANDOM",
                        "args": {
                            "player_id": "self",
                            "change_type": "percent_decrease_or_percent_increase",
                            "value1": 30,
                            "value2": 70
                        }
                    }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": CardType.WEALTH, "is_token": true, "durability": 100 },
    };

    let gameState;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10; // To play Mercantilism
        const mercantilismCard = createCardInstance(cardDefinitions['重商主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = mercantilismCard;
        gameState.all_card_instances[mercantilismCard.instance_id] = mercantilismCard;
    });

    test('should prompt for money durability reduction and increase scale at turn end', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 20 });
        p1.field.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const initialScale = p1.scale;
        const initialMoneyDurability = moneyCard.current_durability;
        const chosenAmount = 5;

        // 2. Execution - Trigger END_TURN_OWNER
        let nextState = processEffects({
            ...gameState,
            effect_queue: [[{ effect_type: TriggerType.END_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 } }, null]]
        });

        // 3. Verification - Check for input prompt
        assert.ok(nextState.awaiting_input, 'Game should be awaiting input for money reduction');
        assert.strictEqual(nextState.awaiting_input.type, 'CHOICE_NUMBER', 'Awaiting input type should be CHOICE_NUMBER');
        assert.strictEqual(nextState.awaiting_input.max, initialMoneyDurability, 'Max choice should be current money durability');

        // 4. Execution - Resolve input
        nextState = resolveInput(nextState, chosenAmount);
        
        // 5. Verification - Check the result
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const moneyCardFinal = p1Final.field.find(c => c.instance_id === moneyCard.instance_id);

        assert.strictEqual(moneyCardFinal.current_durability, initialMoneyDurability - chosenAmount, 'Money durability should be reduced');
        assert.strictEqual(p1Final.scale, initialScale + chosenAmount, 'Scale should increase by the chosen amount');
    });

    test('should randomly modify Money durability at turn start', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 100 });
        p1.field.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const initialMoneyDurability = moneyCard.current_durability;

        const originalMathRandom = Math.random;

        // Test for decrease (-30%)
        Math.random = () => 0.1; // Force decrease
        let nextStateDecrease = processEffects({
            ...gameState,
            effect_queue: [[{ effect_type: TriggerType.START_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 } }, null]]
        });
        const p1AfterDecrease = nextStateDecrease.players[PlayerId.PLAYER1];
        const moneyCardAfterDecrease = p1AfterDecrease.field.find(c => c.instance_id === moneyCard.instance_id);
        const expectedDecrease = Math.floor(initialMoneyDurability * (30 / 100));
        assert.strictEqual(moneyCardAfterDecrease.current_durability, initialMoneyDurability - expectedDecrease, 'Money durability should decrease by 30%');

        // Reset gameState for the next part of the test (for increase)
        // Note: We need a fresh gameState for the second part of the test due to how processEffects modifies state.
        let gameStateForIncrease = createTestGameState(cardDefinitions);
        const p1ForIncrease = gameStateForIncrease.players[PlayerId.PLAYER1];
        p1ForIncrease.scale = 10;
        p1ForIncrease.ideology = createCardInstance(cardDefinitions['重商主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        gameStateForIncrease.all_card_instances[p1ForIncrease.ideology.instance_id] = p1ForIncrease.ideology;
        const moneyCardForIncrease = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 100 });
        p1ForIncrease.field.push(moneyCardForIncrease);
        gameStateForIncrease.all_card_instances[moneyCardForIncrease.instance_id] = moneyCardForIncrease;

        // Test for increase (+70%)
        Math.random = () => 0.6; // Force increase
        let nextStateIncrease = processEffects({
            ...gameStateForIncrease,
            effect_queue: [[{ effect_type: TriggerType.START_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 } }, null]]
        });
        const p1AfterIncrease = nextStateIncrease.players[PlayerId.PLAYER1];
        const moneyCardAfterIncrease = p1AfterIncrease.field.find(c => c.instance_id === moneyCardForIncrease.instance_id);
        const expectedIncrease = Math.floor(initialMoneyDurability * (70 / 100));
        assert.strictEqual(moneyCardAfterIncrease.current_durability, initialMoneyDurability + expectedIncrease, 'Money durability should increase by 70%');

        // Restore original Math.random
        Math.random = originalMathRandom;
    });
});
