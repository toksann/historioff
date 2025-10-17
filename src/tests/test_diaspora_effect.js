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

describe('繝・ぅ繧｢繧ｹ繝昴Λ (Diaspora)', () => {
    let gameState;
    let p1, p2;
    let diasporaTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        diasporaTemplate = card_definitions_map['繝・ぅ繧｢繧ｹ繝昴Λ'];
        // Ensure P1 is the current turn player for the test
        gameState.current_turn = p1.id;
    });

    test('繝励Ξ繧､縺輔ｌ縺滓凾縲∬・蛻・・隕乗ｨ｡-5縲∫嶌謇九・繝・ャ繧ｭ縺ｫ縲檎ｧｻ豌代阪ｒ2譫壼刈縺医ｋ', () => {
        // Setup
        const diasporaCard = createCardInstance(diasporaTemplate, p1.id);
        p1.hand.push(diasporaCard);
        p1.scale = 25; // Required scale is 20

        const initialP1Scale = p1.scale;
        const initialP2DeckSize = p2.deck.length;

        // Execution
        let stateAfterPlay = playCard(gameState, p1.id, diasporaCard.instance_id);
        
        let finalState = processEffects(stateAfterPlay);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === diasporaCard.instance_id);
        const immigrantsInP2Deck = finalP2.deck.filter(c => c.name === '遘ｻ豌・).length;

        expect(finalP1.scale).toBe(initialP1Scale - 5);
        expect(finalP2.deck.length).toBe(initialP2DeckSize + 2);
        expect(immigrantsInP2Deck).toBe(2);
        expect(cardInDiscard).toBeDefined();
    });
});
