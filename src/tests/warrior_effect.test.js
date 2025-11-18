const assert = require('assert');
const { endTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('戦士 (Warrior) Card Effect', () => {
    let gameState;
    let p1;
    let p2;
    let warriorCard;
    let fruitCard;

    // Define necessary card definitions for the test
    const cardDefinitions = {
        "戦士": {
            "name": "戦士",
            "card_type": "財",
            "required_scale": 1,
            "durability": 2,
            "description": "ターン終了時、正面の財に1ダメージを与え、その持ち主の意識を-1する。",
            "triggers": {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_CARD_OPERATION",
                        "args": {
                            "source_card_id": "self",
                            "target_player_id": "opponent",
                            "operation": "modify_durability",
                            "selection_method": "front",
                            "amount": -1,
                            "filters": [
                                { "property": "card_type", "value": "財" }
                            ]
                        }
                    }
                ],
                "SUCCESS_PROCESS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": {
                            "player_id": "opponent",
                            "amount": -1
                        }
                    }
                ]
            }
        },
        "果実": {
            "name": "果実",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "description": "このカードの耐久値が0になったとき互いの規模+1。",
            "triggers": {
                "WEALTH_DURABILITY_ZERO_THIS": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "self", "amount": 1 }
                    },
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": { "player_id": "opponent", "amount": 1 }
                    }
                ]
            }
        }
    };

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];

        // P1の場に「戦士」を配置
        warriorCard = createCardInstance(cardDefinitions['戦士'], PlayerId.PLAYER1, { instance_id: 'p1-warrior-1', location: Location.FIELD, current_durability: 2 });
        p1.field.push(warriorCard);
        gameState.all_card_instances[warriorCard.instance_id] = warriorCard;

        // P2の場、戦士の正面に「果実」を配置
        fruitCard = createCardInstance(cardDefinitions['果実'], PlayerId.PLAYER2, { instance_id: 'p2-fruit-1', location: Location.FIELD, current_durability: 1 });
        p2.field.push(fruitCard);
        gameState.all_card_instances[fruitCard.instance_id] = fruitCard;

        gameState.current_turn = PlayerId.PLAYER1;
    });

    test('should deal damage to the front wealth and reduce owner\'s consciousness at the end of the turn', () => {
        // 1. Setup
        const initial_p2_consciousness = p2.consciousness;
        const initial_fruit_durability = fruitCard.current_durability;

        // 2. Execution
        let finalState = endTurn(gameState);
        finalState = processAllEffects(finalState);

        // 3. Verification
        const final_p2 = finalState.players[PlayerId.PLAYER2];
        const final_fruit_card_state = finalState.all_card_instances[fruitCard.instance_id];

        assert.strictEqual(final_p2.consciousness, initial_p2_consciousness - 1, 'Player 2 consciousness should be reduced by 1');
        // The fruit card has 1 durability, warrior deals 1 damage, so it should be in the discard pile.
        assert.strictEqual(final_fruit_card_state.location, Location.DISCARD, 'Fruit card should be in the discard pile');
    });
});
