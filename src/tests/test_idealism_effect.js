import { initializeGame, playCard } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId, TriggerType } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('逅・Φ荳ｻ鄒ｩ (Idealism)', () => {
    let gameState;

    beforeEach(() => {
        let initialGameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        let p1 = initialGameState.players[PlayerId.PLAYER1];
        initialGameState.current_turn = p1.id;

        // Reset consciousness to a baseline to ignore random start-of-game debuffs
        p1.consciousness = 50;
        initialGameState.players[PlayerId.PLAYER2].consciousness = 50;

        // Place Idealism as P1's ideology
        const idealismTemplate = card_definitions_map['逅・Φ荳ｻ鄒ｩ'];
        const idealismCard = createCardInstance(idealismTemplate, p1.id);
        p1.hand.push(idealismCard);
        let stateAfterPlay = playCard(initialGameState, p1.id, idealismCard.instance_id);
        gameState = processEffects(stateAfterPlay);
    });

    test('逶ｸ謇九・諢剰ｭ倥′鬮倥＞蝣ｴ蜷医∫嶌謇九・諢剰ｭ・2', () => {
        // Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        p2.consciousness = 55; // Opponent's consciousness is higher
        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;

        // Execution
        const startTurnEffect = {
            effect_type: TriggerType.START_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([startTurnEffect, p1.ideology]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        expect(finalP1.consciousness).toBe(initialP1Consciousness);
        expect(finalP2.consciousness).toBe(initialP2Consciousness - 2);
        expect(finalP1.scale).toBe(initialP1Scale);
        expect(finalP2.scale).toBe(initialP2Scale);
    });

    test('逶ｸ謇九・諢剰ｭ倥′閾ｪ蛻・ｻ･荳九・蝣ｴ蜷医∽ｺ偵＞縺ｮ隕乗ｨ｡+3', () => {
        // Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];
        // Consciousness is already equal (50 vs 50) from beforeEach
        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;

        // Execution
        const startTurnEffect = {
            effect_type: TriggerType.START_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([startTurnEffect, p1.ideology]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        expect(finalP1.consciousness).toBe(initialP1Consciousness);
        expect(finalP2.consciousness).toBe(initialP2Consciousness);
        expect(finalP1.scale).toBe(initialP1Scale + 3);
        expect(finalP2.scale).toBe(initialP2Scale + 3);
    });
});
