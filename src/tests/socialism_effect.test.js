const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard, startTurn } = require('../gameLogic/main.js');

describe('社会主義 (Socialism) Card Effect', () => {

    // This definition reflects the card_definitions.json, without any special 'condition' fields.
    // The conditional logic is handled inside checkCardReaction in card.js
    const cardDefinitions = {
        "社会主義": {
            name: "社会主義",
            card_type: CardType.IDEOLOGY,
            required_scale: 30,
            description: "ターン開始時、「解体」を手札に加える。マネーを出すたび、自分の場の財のうち最も耐久値の低い財（同じならより右の財）1枚の耐久値+2。",
            triggers: {
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: "ADD_CARD_TO_GAME",
                        args: {
                            player_id: "self",
                            card_template_name: "解体",
                            destination_pile: "hand"
                        }
                    }
                ],
                [TriggerType.CARD_PLACED_OWNER]: [
                    {
                        effect_type: "PROCESS_CARD_OPERATION",
                        args: {
                            player_id: "self",
                            operation: "modify_durability",
                            selection_method: "lowest_durability",
                            target_card_type: CardType.WEALTH,
                            amount: 2,
                            target_player_id: "self",
                            source_pile: Location.FIELD
                        }
                    }
                ]
            }
        },
        "解体": {
            name: "解体",
            card_type: CardType.WEALTH,
            required_scale: 0,
            description: "テスト用",
        },
        "マネー": {
            name: "マネー",
            card_type: CardType.WEALTH,
            required_scale: 0,
            // The 'money' tag is not used by checkCardReaction, it checks the name directly.
            // tags: ["money"], 
            description: "テスト用マネーカード",
        },
        "農民": {
            name: "農民",
            card_type: CardType.WEALTH,
            required_scale: 5,
            durability: 5,
            description: "テスト用財カード1",
        },
        "職人": {
            name: "職人",
            card_type: CardType.WEALTH,
            required_scale: 5,
            durability: 3,
            description: "テスト用財カード2",
        },
        "ただのカード": {
            name: "ただのカード",
            card_type: CardType.WEALTH,
            required_scale: 0,
            description: "マネーではないカード",
        }
    };

    test('should add "Dismantling" to hand at the start of the turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const socialismCard = createCardInstance(cardDefinitions['社会主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = socialismCard;
        gameState.all_card_instances[socialismCard.instance_id] = socialismCard;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const dismantlingInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === '解体');
        assert.ok(dismantlingInHand, '"解体" should be in hand');
    });

    test('should increase durability of the lowest durability wealth card when a "Money" card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const socialismCard = createCardInstance(cardDefinitions['社会主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = socialismCard;
        gameState.all_card_instances[socialismCard.instance_id] = socialismCard;

        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 5 });
        const craftsmanCard = createCardInstance(cardDefinitions['職人'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 3 });
        p1.field.push(peasantCard, craftsmanCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;
        gameState.all_card_instances[craftsmanCard.instance_id] = craftsmanCard;

        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        let nextState = playCard(gameState, PlayerId.PLAYER1, moneyCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalCraftsman = finalState.all_card_instances[craftsmanCard.instance_id];
        const finalPeasant = finalState.all_card_instances[peasantCard.instance_id];

        assert.strictEqual(finalCraftsman.current_durability, 5, 'Craftsman durability should be 3 + 2');
        assert.strictEqual(finalPeasant.current_durability, 5, 'Peasant durability should not change');
    });

    test('should NOT trigger effect when a non-Money card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const socialismCard = createCardInstance(cardDefinitions['社会主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = socialismCard;
        gameState.all_card_instances[socialismCard.instance_id] = socialismCard;

        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 5 });
        const craftsmanCard = createCardInstance(cardDefinitions['職人'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 3 });
        p1.field.push(peasantCard, craftsmanCard);
        gameState.all_card_instances[peasantCard.instance_id] = peasantCard;
        gameState.all_card_instances[craftsmanCard.instance_id] = craftsmanCard;

        const normalCard = createCardInstance(cardDefinitions['ただのカード'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(normalCard);
        gameState.all_card_instances[normalCard.instance_id] = normalCard;

        let nextState = playCard(gameState, PlayerId.PLAYER1, normalCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalCraftsman = finalState.all_card_instances[craftsmanCard.instance_id];
        const finalPeasant = finalState.all_card_instances[peasantCard.instance_id];

        assert.strictEqual(finalCraftsman.current_durability, 3, 'Craftsman durability should not change');
        assert.strictEqual(finalPeasant.current_durability, 5, 'Peasant durability should not change');
    });
});