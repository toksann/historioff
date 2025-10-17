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

describe('蜈ｵ蝎ｨ (Weapon)', () => {
    let gameState;
    let p1, p2;
    let weaponTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        weaponTemplate = card_definitions_map['蜈ｵ蝎ｨ'];
        gameState.current_turn = p1.id;

        // Place Weapon on P1's field
        const weaponCard = createCardInstance(weaponTemplate, p1.id);
        p1.field.push(weaponCard);
        weaponCard.location = 'field';
    });

    test('逶ｸ謇九・蝣ｴ縺ｫ雋｡縺後≠繧句ｴ蜷医∽ｸ逡ｪ蟾ｦ縺ｮ雋｡繧堤ｴ螢翫☆繧・, () => {
        // Setup
        const merchantTemplate = card_definitions_map['蝠・ｺｺ'];
        const merchantCard = createCardInstance(merchantTemplate, p2.id);
        p2.field.push(merchantCard); // Opponent has a wealth card
        merchantCard.location = 'field';

        const initialMerchantDurability = merchantCard.current_durability;
        const initialP2Consciousness = p2.consciousness;

        // Execution
        const endTurnEffect = {
            effect_type: TriggerType.END_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([endTurnEffect, p1.field.find(c => c.name === '蜈ｵ蝎ｨ')]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const destroyedMerchantCard = finalState.players[PlayerId.PLAYER2].discard.find(c => c.instance_id === merchantCard.instance_id);
        expect(destroyedMerchantCard).toBeDefined();
        expect(destroyedMerchantCard.current_durability).toBe(initialMerchantDurability - weaponTemplate.durability);
        expect(finalState.players[PlayerId.PLAYER2].consciousness).toBe(initialP2Consciousness);
    });

    test('逶ｸ謇九・蝣ｴ縺ｫ雋｡縺後↑縺・ｴ蜷医∫嶌謇九・諢剰ｭ倥↓繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴繧・, () => {
        // Setup
        // Ensure opponent's field is empty
        p2.field = [];
        const initialP2Consciousness = p2.consciousness;

        // Execution
        const endTurnEffect = {
            effect_type: TriggerType.END_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([endTurnEffect, p1.field.find(c => c.name === '蜈ｵ蝎ｨ')]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        expect(finalState.players[PlayerId.PLAYER2].consciousness).toBe(initialP2Consciousness - weaponTemplate.durability);
    });
});
