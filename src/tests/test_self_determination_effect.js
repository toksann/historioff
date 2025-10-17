import { initializeGame, playCard, resolveInput } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('豌第酪閾ｪ豎ｺ (Self-determination)', () => {
    let gameState;
    let p1;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = p1.id;
    });

    test('縲梧ｱ取ｰ第酪荳ｻ鄒ｩ縲阪°縲悟・髮｢荳ｻ鄒ｩ縲阪ｒ謇区惆縺ｫ蜉縺医∬・蛻・・諢剰ｭ・3', () => {
        // Setup
        const selfDeterminationTemplate = card_definitions_map['豌第酪閾ｪ豎ｺ'];
        const selfDeterminationCard = createCardInstance(selfDeterminationTemplate, p1.id);
        p1.hand.push(selfDeterminationCard);
        p1.scale = 10; // Required scale

        const initialP1Consciousness = p1.consciousness;
        const initialHandSize = p1.hand.length;

        // Execution - Step 1: Play the card and expect an input prompt
        let stateAfterPlay = playCard(gameState, p1.id, selfDeterminationCard.instance_id);
        let stateAwaitingInput = processEffects(stateAfterPlay);

        // Verification - Step 1: Check for awaiting_input
        expect(stateAwaitingInput.awaiting_input).toBeDefined();
        expect(stateAwaitingInput.awaiting_input.type).toBe('CHOICE_CARD_TO_ADD');
        expect(stateAwaitingInput.awaiting_input.options).toEqual(['豎取ｰ第酪荳ｻ鄒ｩ', '蛻・屬荳ｻ鄒ｩ']);

        // Execution - Step 2: Resolve the input by choosing '豎取ｰ第酪荳ｻ鄒ｩ'
        let stateAfterInput = resolveInput(stateAwaitingInput, '豎取ｰ第酪荳ｻ鄒ｩ');
        let finalState = processEffects(stateAfterInput);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification - Step 2: Check the final state
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === selfDeterminationCard.instance_id);
        const addedCard = finalP1.hand.find(c => c.name === '豎取ｰ第酪荳ｻ鄒ｩ');

        expect(finalP1.consciousness).toBe(initialP1Consciousness + 3);
        expect(addedCard).toBeDefined();
        expect(finalP1.hand.length).toBe(initialHandSize); // 豌第酪閾ｪ豎ｺ縺梧昏縺ｦ繧峨ｌ縲∵ｱ取ｰ第酪荳ｻ鄒ｩ縺悟刈繧上ｋ縺ｮ縺ｧ譫壽焚螟牙喧縺ｪ縺・        expect(cardInDiscard).toBeDefined();
    });
});
