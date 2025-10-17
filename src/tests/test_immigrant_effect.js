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

describe('遘ｻ豌・(Immigrant Token)', () => {
    let gameState;
    let p1;
    let immigrantTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        immigrantTemplate = card_definitions_map['遘ｻ豌・];
        // Ensure P1 is the current turn player for the test
        gameState.current_turn = p1.id;
    });

    test('繝励Ξ繧､縺輔ｌ縺滓凾縲∬・蛻・・諢剰ｭ・1縲∬ｦ乗ｨ｡+1縺輔ｌ縲∵昏縺ｦ譛ｭ縺ｫ遘ｻ蜍輔☆繧・, () => {
        // Setup
        const immigrantCard = createCardInstance(immigrantTemplate, p1.id);
        p1.hand.push(immigrantCard);

        const initialConsciousness = p1.consciousness;
        const initialScale = p1.scale;
        const initialHandSize = p1.hand.length;
        const initialDiscardSize = p1.discard.length;

        // Execution
        // Use the playCard function to simulate playing the card
        let stateAfterPlay = playCard(gameState, p1.id, immigrantCard.instance_id);
        
        // Process the effects queue until it's empty
        let finalState = processEffects(stateAfterPlay);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const cardInHand = finalP1.hand.find(c => c.instance_id === immigrantCard.instance_id);
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === immigrantCard.instance_id);

        expect(finalP1.consciousness).toBe(initialConsciousness - 1);
        expect(finalP1.scale).toBe(initialScale + 1);
        expect(finalP1.hand.length).toBe(initialHandSize - 1);
        expect(cardInHand).toBeUndefined();
        expect(finalP1.discard.length).toBe(initialDiscardSize + 1);
        expect(cardInDiscard).toBeDefined();
    });
});
