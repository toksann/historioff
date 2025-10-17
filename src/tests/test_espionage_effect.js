const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { playCard } = require('../gameLogic/main.js');

describe('工作活動 (Espionage) Card Effect', () => {
    const cardDefinitions = {
        "工作活動": {
            name: "工作活動",
            card_type: CardType.EVENT,
            required_scale: 20,
            description: "相手の場に「工作員」を1枚出す。",
            triggers: {
                "PLAY_EVENT_THIS": [
                    {
                        effect_type: "ADD_CARD_TO_GAME",
                        args: {
                            player_id: "opponent",
                            card_template_name: "工作員",
                            destination_pile: "field"
                        }
                    }
                ]
            }
        },
        "工作員": {
            name: "工作員",
            card_type: CardType.WEALTH,
            required_scale: 0,
            durability: 1,
            description: "自分のターン開始時、自分の意識-1。相手のターン開始時、自分の手札かデッキにあるイデオロギーカードを1枚公開する。",
            is_token: true
        },
    };

    let gameState;
    let p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
    });

    test("should add an Agent card to the opponent's field when played", () => {
        // 1. Setup: Give Espionage to Player 1
        const espionageCard = createCardInstance(cardDefinitions['工作活動'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(espionageCard);
        p1.scale = 20; // Set scale to meet required_scale of Espionage
        gameState.current_turn = PlayerId.PLAYER1;
        const initialP2FieldCount = p2.field.length;

        // 2. Execution: Player 1 plays Espionage
        let nextState = playCard(gameState, PlayerId.PLAYER1, espionageCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: Player 2 should have one more card on their field, and it should be an Agent
        const p2_final = finalState.players[PlayerId.PLAYER2];
        assert.strictEqual(p2_final.field.length, initialP2FieldCount + 1, "Player 2 should have one new card on the field");
        const newCard = p2_final.field[p2_final.field.length - 1];
        assert.strictEqual(newCard.name, '工作員', "The new card on Player 2's field should be '工作員'");
        assert.strictEqual(newCard.owner, PlayerId.PLAYER2, "The owner of the new Agent card should be Player 2");
    });
});
