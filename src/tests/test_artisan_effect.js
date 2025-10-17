import { initializeGame, playCard, resolveInput } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId, TriggerType } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('閨ｷ莠ｺ (Artisan)', () => {
    let gameState;
    let p1;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = p1.id;
    });

    test('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∬・蛻・・謇区惆縺ｮ雋｡1譫壹・蠢・ｦ∬ｦ乗ｨ｡-1', () => {
        // Setup
        const artisanTemplate = card_definitions_map['閨ｷ莠ｺ'];
        const artisanCard = createCardInstance(artisanTemplate, p1.id);
        p1.field.push(artisanCard);
        artisanCard.location = 'field';

        const merchantTemplate = card_definitions_map['蝠・ｺｺ'];
        const merchantCard = createCardInstance(merchantTemplate, p1.id);
        p1.hand.push(merchantCard);
        merchantCard.location = 'hand';

        const initialMerchantScale = merchantCard.required_scale;

        // Execution - Step 1: Trigger the end of turn and expect an input prompt
        const endTurnEffect = {
            effect_type: TriggerType.END_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([endTurnEffect, artisanCard]);
        let stateAwaitingInput = processEffects(gameState);

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
        const finalMerchantCard = finalState.players[PlayerId.PLAYER1].hand.find(c => c.instance_id === merchantCard.instance_id);
        expect(finalMerchantCard.required_scale).toBe(initialMerchantScale - 1);
    });
});
