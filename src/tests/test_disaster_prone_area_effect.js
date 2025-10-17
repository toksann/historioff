const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('災害多発地域 (Disaster-Prone Area) Card Effect', () => {
    const cardDefinitions = {
        "災害多発地域": {
            name: "災害多発地域",
            card_type: CardType.EVENT,
            required_scale: 30,
            description: "相手のデッキに「大地震」を2枚加える。",
            triggers: {
                [TriggerType.PLAY_EVENT_THIS]: [
                    {
                        effect_type: EffectType.ADD_CARD_TO_GAME,
                        args: {
                            player_id: "opponent",
                            card_template_name: "大地震",
                            destination_pile: "deck",
                            position: "random",
                            count: 2
                        }
                    }
                ]
            }
        },
        "大地震": {
            name: "大地震",
            card_type: CardType.EVENT,
            required_scale: 100,
            is_token: true,
            description: "このカードを引いたとき即座に捨て札になる。このカードが捨て札になったとき、自分と相手の意識と規模を-20し、自分と相手の場のすべての財に3ダメージ、2ダメージ、1ダメージを順に与える。",
        }
    };

    test('相手のデッキに「大地震」が2枚追加されること', () => {
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 30; // Play condition

        const disasterCard = createCardInstance(cardDefinitions['災害多発地域'], p1.id);
        gameState.all_card_instances[disasterCard.instance_id] = disasterCard;
        p1.hand.push(disasterCard); // Add to player 1's hand

        // Action
        gameState.effect_queue.push([{
            effect_type: TriggerType.PLAY_EVENT_THIS,
            args: {
                player_id: p1.id,
                card_id: disasterCard.instance_id,
                target_card_id: disasterCard.instance_id,
                source_pile: Location.HAND // Specify source pile
            }
        }, disasterCard]);

        const finalState = processEffects(gameState);

        const finalP2 = finalState.players[PlayerId.PLAYER2];

        // Assertion
        assert.strictEqual(finalP2.deck.length, 2, '相手のデッキに2枚のカードが追加されるべきです');
        const earthquakesInDeck = finalP2.deck.filter(c => c.name === '大地震');
        assert.strictEqual(earthquakesInDeck.length, 2, '追加されたカードは「大地震」であるべきです');
    });
});
