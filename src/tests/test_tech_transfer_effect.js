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

describe('謚陦捺署萓・(Technology Transfer)', () => {
    let gameState;
    let p1, p2;
    let techTransferTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        techTransferTemplate = card_definitions_map['謚陦捺署萓・];
        // Ensure P1 is the current turn player for the test
        gameState.current_turn = p1.id;
    });

    test('逶ｸ謇九・繝・ャ繧ｭ縺ｫ縲梧橿陦馴擠譁ｰ縲阪ｒ2譫壼刈縺医ｋ', () => {
        // Setup
        const techTransferCard = createCardInstance(techTransferTemplate, p1.id);
        p1.hand.push(techTransferCard);
        p1.scale = 15; // Required scale

        const initialP2DeckSize = p2.deck.length;

        // Execution
        let stateAfterPlay = playCard(gameState, p1.id, techTransferCard.instance_id);
        
        let finalState = processEffects(stateAfterPlay);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === techTransferCard.instance_id);
        const techInnovationsInP2Deck = finalP2.deck.filter(c => c.name === '謚陦馴擠譁ｰ').length;

        expect(finalP2.deck.length).toBe(initialP2DeckSize + 2);
        expect(techInnovationsInP2Deck).toBe(2);
        expect(cardInDiscard).toBeDefined();
    });
});
