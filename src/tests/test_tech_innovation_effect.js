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

describe('謚陦馴擠譁ｰ (Technological Innovation)', () => {
    let gameState;
    let p1;
    let techInnovationTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        techInnovationTemplate = card_definitions_map['謚陦馴擠譁ｰ'];
        gameState.current_turn = p1.id;
    });

    test('閾ｪ蛻・・隕乗ｨ｡+2縲∬・蛻・・蝣ｴ縺ｮ雋｡1譫壹・閠蝉ｹ・､+1', () => {
        // Setup
        const merchantTemplate = card_definitions_map['蝠・ｺｺ'];
        const merchantCard = createCardInstance(merchantTemplate, p1.id);
        p1.field.push(merchantCard);
        merchantCard.location = 'field';

        const techInnovationCard = createCardInstance(techInnovationTemplate, p1.id);
        p1.hand.push(techInnovationCard);
        p1.scale = 5; // Required scale is 3

        const initialP1Scale = p1.scale;
        const initialMerchantDurability = merchantCard.current_durability;

        // Execution - Step 1: Play the card and expect an input prompt
        let stateAfterPlay = playCard(gameState, p1.id, techInnovationCard.instance_id);
        let stateAwaitingInput = processEffects(stateAfterPlay);

        // Verification - Step 1: Check for awaiting_input
        expect(stateAwaitingInput.awaiting_input).toBeDefined();
        expect(stateAwaitingInput.awaiting_input.type).toBe('CHOICE_CARDS_FOR_OPERATION');
        expect(stateAwaitingInput.awaiting_input.options[0].instance_id).toBe(merchantCard.instance_id);

        // Execution - Step 2: Resolve the input
        let stateAfterInput = resolveInput(stateAwaitingInput, [merchantCard]);
        let finalState = processEffects(stateAfterInput);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification - Step 2: Check the final state
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalMerchantCard = finalP1.field.find(c => c.instance_id === merchantCard.instance_id);

        expect(finalP1.scale).toBe(initialP1Scale + 2);
        expect(finalMerchantCard.current_durability).toBe(initialMerchantDurability + 1);
        expect(finalP1.discard.find(c => c.instance_id === techInnovationCard.instance_id)).toBeDefined();
    });
});
