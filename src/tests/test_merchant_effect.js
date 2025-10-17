import { initializeGame } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId, GamePhase, TriggerType, EffectType } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('蝠・ｺｺ (Merchant)', () => {
    let gameState;
    let p1;
    let merchantTemplate;

    beforeEach(() => {
        gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        p1 = gameState.players[PlayerId.PLAYER1];
        merchantTemplate = card_definitions_map['蝠・ｺｺ'];
        gameState.current_turn = p1.id;
    });

    // Test Case 1: Turn start effect
    test('繧ｿ繝ｼ繝ｳ髢句ｧ区凾縲∬・蛻・・隕乗ｨ｡+1縺励√後・繝阪・縲阪ｒ謇区惆縺ｫ蜉縺医ｋ', () => {
        // Setup
        const merchantCard = createCardInstance(merchantTemplate, p1.id, gameState);
        p1.field.push(merchantCard); // Place merchant on the field
        merchantCard.location = 'field';

        const initialScale = p1.scale;
        const initialHandSize = p1.hand.length;

        // Execution
        const startTurnEffect = {
            effect_type: TriggerType.START_TURN_OWNER,
            args: { player_id: p1.id }
        };
        gameState.effect_queue.push([startTurnEffect, merchantCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        expect(finalP1.scale).toBe(initialScale + 1);
        expect(finalP1.hand.length).toBe(initialHandSize + 1);
        expect(finalP1.hand.some(c => c.name === '繝槭ロ繝ｼ')).toBe(true);
    });

    // Test Case 2: Destruction effect (condition met)
    test('閠蝉ｹ・､縺・縺ｫ縺ｪ縺｣縺溘→縺阪∬ｦ乗ｨ｡縺・5莉･荳翫↑繧峨悟膚莠ｺ縲阪ｒ謇区惆縺ｫ蜉縺医ｋ', () => {
        // Setup
        p1.scale = 15;
        const merchantCard = createCardInstance(merchantTemplate, p1.id, gameState);
        p1.field.push(merchantCard);
        merchantCard.location = 'field';
        
        const initialHandSize = p1.hand.length;

        // Execution
        // Directly trigger the destruction effect for testing
        const destructionEffect = {
            effect_type: TriggerType.WEALTH_DURABILITY_ZERO_THIS,
            args: { 
                player_id: p1.id,
                target_player_id: p1.id,
                card_id: merchantCard.instance_id,
                target_card_id: merchantCard.instance_id 
            }
        };
        gameState.effect_queue.push([destructionEffect, merchantCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        expect(finalP1.hand.length).toBe(initialHandSize + 1);
        expect(finalP1.hand.some(c => c.name === '蝠・ｺｺ')).toBe(true);
    });

    // Test Case 3: Destruction effect (condition not met)
    test('閠蝉ｹ・､縺・縺ｫ縺ｪ縺｣縺溘→縺阪∬ｦ乗ｨ｡縺・4莉･荳九↑繧画焔譛ｭ縺ｯ蠅励∴縺ｪ縺・, () => {
        // Setup
        p1.scale = 14;
        const merchantCard = createCardInstance(merchantTemplate, p1.id, gameState);
        p1.field.push(merchantCard);
        merchantCard.location = 'field';

        const initialHandSize = p1.hand.length;

        // Execution
        const destructionEffect = {
            effect_type: TriggerType.WEALTH_DURABILITY_ZERO_THIS,
            args: { 
                player_id: p1.id,
                target_player_id: p1.id,
                card_id: merchantCard.instance_id,
                target_card_id: merchantCard.instance_id 
            }
        };
        gameState.effect_queue.push([destructionEffect, merchantCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        expect(finalP1.hand.length).toBe(initialHandSize);
    });
});
