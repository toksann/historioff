
const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard } = require('../gameLogic/main.js');

describe('リージョナリズム (Regionalism) Card Effect', () => {
    const cardDefinitions = {
        "リージョナリズム": {
            name: "リージョナリズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 20,
            description: "配置時、相手の場の財の数と同じだけ自分の規模をプラスする。ターン開始時、互いの手札に「技術提供」を1枚加える。",
            triggers: {
                [TriggerType.CARD_PLACED_THIS]: [
                    {
                        effect_type: EffectType.MODIFY_SCALE_RESERVE,
                        args: {
                            player_id: "self",
                            amount_based_on_opponent_field_wealth_count: true
                        }
                    }
                ],
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: EffectType.ADD_CARD_TO_GAME,
                        args: {
                            player_id: "self",
                            card_template_name: "技術提供",
                            destination_pile: "hand"
                        }
                    },
                    {
                        effect_type: EffectType.ADD_CARD_TO_GAME,
                        args: {
                            player_id: "opponent",
                            card_template_name: "技術提供",
                            destination_pile: "hand"
                        }
                    }
                ]
            }
        },
        "技術提供": {
            name: "技術提供",
            card_type: CardType.EVENT,
            required_scale: 15,
            description: "相手のデッキに「技術革新」を2枚加える。",
        },
        "WealthCard": { name: 'WealthCard', card_type: CardType.WEALTH, durability: 10 },
    };

    // Test 1: Placement Effect (Scale Increase)
    test('should increase scale based on opponent\'s wealth cards on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        // Setup opponent's field
        for (let i = 0; i < 3; i++) {
            const wealthCard = createCardInstance(cardDefinitions['WealthCard'], PlayerId.PLAYER2, { location: Location.FIELD });
            p2.field.push(wealthCard);
            gameState.all_card_instances[wealthCard.instance_id] = wealthCard;
        }

        p1.scale = 20;
        p1.hand.push(createCardInstance(cardDefinitions['リージョナリズム'], PlayerId.PLAYER1, { location: Location.HAND }));

        let nextState = playCard(gameState, PlayerId.PLAYER1, p1.hand[0].instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, 23, "P1 scale should be 20 + 3 = 23");
        assert.strictEqual(finalP1.ideology.name, 'リージョナリズム', "Regionalism should be the ideology");
    });

    // Test 2: Start of Turn Effect (Add Cards)
    test('should add Technology Transfer to each player\'s hand at start of turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        const regionalismCard = createCardInstance(cardDefinitions['リージョナリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = regionalismCard;
        gameState.all_card_instances[regionalismCard.instance_id] = regionalismCard;

        assert.strictEqual(p1.hand.length, 0, "P1 hand should be initially empty");
        assert.strictEqual(p2.hand.length, 0, "P2 hand should be initially empty");

        gameState.effect_queue.push([
            {
                effect_type: TriggerType.START_TURN_OWNER,
                args: { player_id: PlayerId.PLAYER1 }
            },
            regionalismCard
        ]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];

        assert.strictEqual(finalP1.hand.length, 1, "P1 should have 1 card in hand");
        assert.strictEqual(finalP1.hand[0].name, '技術提供', "P1's card should be Technology Transfer");
        assert.strictEqual(finalP2.hand.length, 1, "P2 should have 1 card in hand");
        assert.strictEqual(finalP2.hand[0].name, '技術提供', "P2's card should be Technology Transfer");
    });
});
