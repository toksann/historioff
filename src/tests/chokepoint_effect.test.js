const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard } = require('../gameLogic/main.js');

describe('隘路 (Airo) Card Effect', () => {
    const cardDefinitions = {
        "隘路": {
            name: "隘路",
            card_type: CardType.WEALTH,
            required_scale: 30,
            durability: 7,
            description: "相手の場に財が配置されるたび、相手の規模-2。",
            triggers: {
                CARD_PLACED_OPPONENT: [
                    {
                        effect_type: "MODIFY_SCALE_RESERVE",
                        args: { player_id: "opponent", amount: -2 }
                    }
                ]
            }
        },
        "農民": { name: "農民", card_type: CardType.WEALTH, required_scale: 0, durability: 1 },
        "覚醒": { name: "覚醒", card_type: CardType.EVENT, required_scale: 0 },
    };

    let gameState;
    let p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        // Place Airo for Player 1
        const airoCard = createCardInstance(cardDefinitions['隘路'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(airoCard);
        gameState.all_card_instances[airoCard.instance_id] = airoCard;
    });

    test('should decrease opponent scale by 2 when opponent places a wealth card', () => {
        // 1. Setup
        const initialP2Scale = p2.scale;
        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER2, { location: Location.HAND });
        p2.hand.push(peasantCard);
        gameState.current_turn = PlayerId.PLAYER2; // Set turn to Player 2

        // 2. Execution: Player 2 plays a wealth card
        let nextState = playCard(gameState, PlayerId.PLAYER2, peasantCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P2's scale should decrease by 2
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].scale, initialP2Scale - 2, "P2's scale should decrease by 2");
    });

    test('should not decrease opponent scale when opponent places a non-wealth card', () => {
        // 1. Setup
        const initialP2Scale = p2.scale;
        const eventCard = createCardInstance(cardDefinitions['覚醒'], PlayerId.PLAYER2, { location: Location.HAND });
        p2.hand.push(eventCard);
        gameState.current_turn = PlayerId.PLAYER2; // Set turn to Player 2

        // 2. Execution: Player 2 plays an event card
        let nextState = playCard(gameState, PlayerId.PLAYER2, eventCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P2's scale should be unchanged
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].scale, initialP2Scale, "P2's scale should be unchanged");
    });

    test('should not trigger when the owner places a wealth card', () => {
        // 1. Setup
        const initialP1Scale = p1.scale;
        const peasantCard = createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(peasantCard);
        // gameState.current_turn is already P1 by default

        // 2. Execution: Player 1 plays a wealth card
        let nextState = playCard(gameState, PlayerId.PLAYER1, peasantCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P1's scale should be unchanged by the effect
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].scale, initialP1Scale, "P1's scale should be unchanged");
    });
});