const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { startTurn } = require('../gameLogic/main.js');

describe('工作員 (Agent) Card Effect', () => {
    const cardDefinitions = {
        "工作員": {
            name: "工作員",
            card_type: CardType.WEALTH,
            required_scale: 0,
            durability: 1,
            description: "自分のターン開始時、自分の意識-1。相手のターン開始時、自分の手札かデッキにあるイデオロギーカードを1枚公開する。",
            triggers: {
                "START_TURN_OWNER": [
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: { player_id: "self", amount: -1 }
                    }
                ],
                "START_TURN_OPPONENT": [
                    {
                        effect_type: "PROCESS_EXPOSE_CARD_BY_TYPE",
                        args: {
                            player_id: "self",
                            source_piles: ["hand", "deck"],
                            count: 1,
                            card_type: "イデオロギー"
                        }
                    }
                ]
            },
            is_token: true
        },
        "理想主義": { name: "理想主義", card_type: CardType.IDEOLOGY, required_scale: 0 },
    };

    let gameState;
    let p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
    });

    test('should decrease owner consciousness by 1 at the start of their turn', () => {
        // 1. Setup: Place Agent for Player 1
        const agentCard = createCardInstance(cardDefinitions['工作員'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(agentCard);
        gameState.current_turn = PlayerId.PLAYER1;
        const initialP1Consciousness = p1.consciousness;

        // 2. Execution: Start Player 1's turn
        let nextState = startTurn(gameState);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: P1's consciousness should decrease by 1
        assert.strictEqual(finalState.players[PlayerId.PLAYER1].consciousness, initialP1Consciousness - 1, "P1's consciousness should decrease by 1");
    });

    test('should expose an ideology card from owner hand or deck at start of opponent turn', () => {
        // 1. Setup: Place Agent for Player 1, give P1 an ideology card
        const agentCard = createCardInstance(cardDefinitions['工作員'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(agentCard);
        const ideologyCard = createCardInstance(cardDefinitions['理想主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(ideologyCard);
        gameState.current_turn = PlayerId.PLAYER2; // It's opponent's turn

        // 2. Execution: Start Player 2's turn
        let nextState = startTurn(gameState);
        let finalState = processEffects(nextState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 3. Verification: An ideology card should be exposed
        assert.ok(finalState.exposed_cards, "exposed_cards array should exist");
        assert.strictEqual(finalState.exposed_cards.length, 1, "One card should be exposed");
        const exposedCard = finalState.exposed_cards[0];
        assert.strictEqual(exposedCard.name, '理想主義', "The exposed card should be '理想主義'");
        assert.strictEqual(exposedCard.owner, PlayerId.PLAYER1, "The owner of the exposed card should be Player 1");
    });

    test("should trigger effects for the correct player when on opponent's field", () => {
        // 1. Setup: Place Agent for Player 2, give P2 an ideology card
        const agentCard = createCardInstance(cardDefinitions['工作員'], PlayerId.PLAYER2, { location: Location.FIELD });
        p2.field.push(agentCard);
        const ideologyCard = createCardInstance(cardDefinitions['理想主義'], PlayerId.PLAYER2, { location: Location.DECK });
        p2.deck.push(ideologyCard);
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution (P2's turn start): Start Player 2's turn
        gameState.current_turn = PlayerId.PLAYER2;
        let stateAfterP2Turn = startTurn(gameState);
        stateAfterP2Turn = processEffects(stateAfterP2Turn);
        while (stateAfterP2Turn.effect_queue.length > 0) {
            stateAfterP2Turn = processEffects(stateAfterP2Turn);
        }

        // 3. Verification (P2's turn start): P2's consciousness should decrease
        assert.strictEqual(stateAfterP2Turn.players[PlayerId.PLAYER2].consciousness, initialP2Consciousness - 1, "P2's consciousness should decrease by 1");

        // 4. Execution (P1's turn start): Start Player 1's turn
        stateAfterP2Turn.current_turn = PlayerId.PLAYER1;
        let finalState = startTurn(stateAfterP2Turn);
        finalState = processEffects(finalState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        // 5. Verification (P1's turn start): P2's ideology card should be exposed
        assert.ok(finalState.exposed_cards, "exposed_cards array should exist after P1's turn");
        assert.strictEqual(finalState.exposed_cards.length, 1, "One card should be exposed after P1's turn");
        const exposedCard = finalState.exposed_cards[0];
        assert.strictEqual(exposedCard.name, '理想主義', "The exposed card should be '理想主義'");
        assert.strictEqual(exposedCard.owner, PlayerId.PLAYER2, "The owner of the exposed card should be Player 2");
    });
});
