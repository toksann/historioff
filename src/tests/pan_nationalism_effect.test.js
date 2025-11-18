const assert = require('assert');
const { playCard } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location, CardType, TriggerType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('汎民族主義 (Pan-Nationalism) Card Effect', () => {
    const cardDefinitions = {
        "汎民族主義": {
            "name": "汎民族主義",
            "card_type": CardType.IDEOLOGY,
            "required_scale": 30,
            "description": "自分の意識がプラスされるたび、相手の意識を-2。配置時、自分の意識+5。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "self", "amount": 5 }
                    }
                ],
                "MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "opponent", "amount": -2 }
                    }
                ]
            }
        },
        "覚醒": {
            "name": "覚醒",
            "card_type": CardType.EVENT,
            "required_scale": 0,
            "description": "自分の意識+10。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                        "args": { "player_id": "self", "amount": 10 }
                    }
                ]
            }
        },
    };

    let gameState;
    let p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 35; // Required scale to play
    });

    test('should increase self consciousness by 5 and decrease opponent by 2 upon placement', () => {
        // 1. Setup
        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;
        const panNationalismCard = createCardInstance(cardDefinitions['汎民族主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(panNationalismCard);

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, panNationalismCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness + 5, "P1's consciousness should increase by 5");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, initialP2Consciousness - 2, "P2's consciousness should decrease by 2 due to reaction");
    });

    test('should decrease opponent consciousness by 2 when self consciousness increases', () => {
        // 1. Setup: Place Pan-Nationalism first
        const panNationalismCard = createCardInstance(cardDefinitions['汎民族主義'], PlayerId.PLAYER1);
        p1.ideology = panNationalismCard;
        panNationalismCard.location = Location.FIELD;
        gameState.all_card_instances[panNationalismCard.instance_id] = panNationalismCard;

        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;

        // Create and add the card that will increase consciousness
        const awakeningCard = createCardInstance(cardDefinitions['覚醒'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(awakeningCard);

        // 2. Execution
        let nextState = playCard(gameState, PlayerId.PLAYER1, awakeningCard.instance_id);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        // P1 gets +10 from Awakening, P2 gets -2 from Pan-Nationalism's reaction
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness + 10, "P1's consciousness should increase by 10");
        assert.strictEqual(finalState.players[PlayerId.PLAYER2].consciousness, initialP2Consciousness - 2, "P2's consciousness should decrease by 2");
    });
});
