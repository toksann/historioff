const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { startTurn } = require('../gameLogic/main.js');

describe('ネオリベラリズム (Neoliberalism) Card Effect', () => {

    const cardDefinitions = {
        "ネオリベラリズム": {
            name: "ネオリベラリズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 25,
            description: "自分の場の財が受けるダメージ-1。ターン開始時、場の財の数+1の耐久値の「マネー」を手札に加える。",
            triggers: {
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: EffectType.ADD_CARD_TO_GAME,
                        args: {
                            player_id: "self",
                            card_template_name: "マネー",
                            destination_pile: "hand",
                            initial_durability_based_on_field_wealth_count_plus_one: true
                        }
                    }
                ],
                [EffectType.MODIFY_CARD_DURABILITY_RESERVE]: [
                    {
                        effect_type: EffectType.ADD_MODIFY_PARAMETER_CORRECTION,
                        args: {
                            player_id: "self",
                            correct_target: "wealth",
                            correct_direction: "decrease",
                            correct_type: "attenuation",
                            amount: 1
                        }
                    }
                ]
            },
            is_token: true
        },
        "マネー": {
            name: "マネー",
            card_type: CardType.WEALTH,
            required_scale: 0,
            description: "テスト用「マネー」カード",
        },
        "戦士": {
            name: "戦士",
            card_type: CardType.WEALTH,
            required_scale: 1,
            durability: 5,
            description: "テスト用財カード",
        },
    };

    test('should reduce damage to own wealth cards by 1', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const neoliberalismCard = createCardInstance(cardDefinitions['ネオリベラリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = neoliberalismCard;
        gameState.all_card_instances[neoliberalismCard.instance_id] = neoliberalismCard;

        const warriorCard = createCardInstance(cardDefinitions['戦士'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 5 });
        p1.field.push(warriorCard);
        gameState.all_card_instances[warriorCard.instance_id] = warriorCard;

        // Simulate an effect that deals 3 damage
        const damageEffect = {
            effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE,
            args: { card_id: warriorCard.instance_id, amount: -3, player_id: PlayerId.PLAYER1 }
        };
        gameState.effect_queue.push([damageEffect, null]);

        let finalState = processEffects(gameState);

        const finalWarrior = finalState.all_card_instances[warriorCard.instance_id];
        // Expect 5 - 3 + 1 = 3
        assert.strictEqual(finalWarrior.current_durability, 3, 'Warrior durability should be reduced by 2 (3-1) instead of 3');
    });

    test('should add a "Money" card to hand with durability equal to field wealth count + 1 at turn start', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const neoliberalismCard = createCardInstance(cardDefinitions['ネオリベラリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = neoliberalismCard;
        gameState.all_card_instances[neoliberalismCard.instance_id] = neoliberalismCard;

        // Place 2 wealth cards on the field
        const warrior1 = createCardInstance(cardDefinitions['戦士'], PlayerId.PLAYER1, { location: Location.FIELD });
        const warrior2 = createCardInstance(cardDefinitions['戦士'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(warrior1, warrior2);
        gameState.all_card_instances[warrior1.instance_id] = warrior1;
        gameState.all_card_instances[warrior2.instance_id] = warrior2;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const moneyInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');
        assert.ok(moneyInHand, '"マネー" should be in hand');
        // Expect durability to be 2 (field wealth) + 1 = 3
        assert.strictEqual(moneyInHand.durability, 3, 'Money card durability should be 3');
        assert.strictEqual(moneyInHand.current_durability, 3, 'Money card current_durability should be 3');
    });
});