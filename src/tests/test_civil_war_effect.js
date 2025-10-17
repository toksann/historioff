import { initializeGame, playCard } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('蜀・姶 (Civil War)', () => {
    let gameState;
    let p1, p2;
    let civilWarTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        civilWarTemplate = card_definitions_map['蜀・姶'];
        // Ensure P1 is the current turn player for the test
        gameState.current_turn = p1.id;
    });

    test('逶ｸ謇九・諢剰ｭ倥→隕乗ｨ｡-15縲り・蛻・・繝・ャ繧ｭ縺ｫ縲檎ｧｻ豌代阪ｒ5譫壼刈縺医ｋ', () => {
        // Setup
        const civilWarCard = createCardInstance(civilWarTemplate, p1.id);
        p1.hand.push(civilWarCard);
        p1.scale = 40; // Required scale

        const initialP1DeckSize = p1.deck.length;
        const initialP2Consciousness = p2.consciousness;
        const initialP2Scale = p2.scale;

        // Execution
        let stateAfterPlay = playCard(gameState, p1.id, civilWarCard.instance_id);
        
        let finalState = processEffects(stateAfterPlay);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === civilWarCard.instance_id);
        const immigrantsInP1Deck = finalP1.deck.filter(c => c.name === '遘ｻ豌・).length;

        expect(finalP2.consciousness).toBe(initialP2Consciousness - 15);
        expect(finalP2.scale).toBe(initialP2Scale - 15);
        expect(finalP1.deck.length).toBe(initialP1DeckSize + 5);
        expect(immigrantsInP1Deck).toBe(5);
        expect(cardInDiscard).toBeDefined();
    });
});
