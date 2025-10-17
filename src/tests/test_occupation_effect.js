import { initializeGame } from '../gameLogic/main';
import { processEffects } from '../gameLogic/effectHandler';
import { PlayerId, GamePhase, TriggerType } from '../gameLogic/constants';
import { createCardInstance } from '../gameLogic/gameUtils';
import card_definitions_array from '../../public/card_definitions.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

describe('蜊鬆・(Occupation)', () => {
    test('謌仙粥繧ｱ繝ｼ繧ｹ・夂嶌謇九・蝣ｴ縺ｫ遨ｺ縺阪′縺ゅｋ蝣ｴ蜷医∫嶌謇九・荳企剞-1縲∬・蛻・・荳企剞+1', () => {
        // 1. Setup
        let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        gameState.current_turn = p1.id;
        p1.scale = 70;

        const occupationTemplate = card_definitions_map['蜊鬆・];
        const occupationCard = createCardInstance(occupationTemplate, p1.id, gameState);
        p1.hand.push(occupationCard);

        // 逶ｸ謇九・蝣ｴ縺ｫ遨ｺ縺阪′縺ゅｋ迥ｶ諷九ｒ菴懊ｋ (荳企剞5縺ｫ蟇ｾ縺励√き繝ｼ繝・譫・
        p2.field_limit = 5;
        for (let i = 0; i < 4; i++) {
            const dummyCard = createCardInstance(card_definitions_map['譫懷ｮ・], p2.id, gameState);
            p2.field.push(dummyCard);
        }

        const initialFieldLimitP1 = p1.field_limit;
        const initialFieldLimitP2 = p2.field_limit;
        gameState.game_phase = GamePhase.MAIN_PHASE;

        // 2. Execution
        const playEffect = {
            effect_type: TriggerType.PLAY_EVENT_THIS,
            args: { card_id: occupationCard.instance_id, player_id: p1.id, target_card_id: occupationCard.instance_id }
        };
        gameState.effect_queue.push([playEffect, occupationCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        
        expect(finalP2.field_limit).toBe(initialFieldLimitP2 - 1);
        expect(finalP1.field_limit).toBe(initialFieldLimitP1 + 1);
    });

    test('螟ｱ謨励こ繝ｼ繧ｹ・夂嶌謇九・蝣ｴ縺悟沂縺ｾ縺｣縺ｦ縺・ｋ蝣ｴ蜷医∝柑譫懊・荳咲匱', () => {
        // 1. Setup
        let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        gameState.current_turn = p1.id;
        p1.scale = 70;

        const occupationTemplate = card_definitions_map['蜊鬆・];
        const occupationCard = createCardInstance(occupationTemplate, p1.id, gameState);
        p1.hand.push(occupationCard);

        // 逶ｸ謇九・蝣ｴ縺悟沂縺ｾ縺｣縺ｦ縺・ｋ迥ｶ諷九ｒ菴懊ｋ (荳企剞5縺ｫ蟇ｾ縺励√き繝ｼ繝・譫・
        p2.field_limit = 5;
        for (let i = 0; i < 5; i++) {
            const dummyCard = createCardInstance(card_definitions_map['譫懷ｮ・], p2.id, gameState);
            p2.field.push(dummyCard);
        }

        const initialFieldLimitP1 = p1.field_limit;
        const initialFieldLimitP2 = p2.field_limit;
        gameState.game_phase = GamePhase.MAIN_PHASE;

        // 2. Execution
        const playEffect = {
            effect_type: TriggerType.PLAY_EVENT_THIS,
            args: { card_id: occupationCard.instance_id, player_id: p1.id, target_card_id: occupationCard.instance_id }
        };
        gameState.effect_queue.push([playEffect, occupationCard]);

        let finalState = processEffects(gameState);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];

        expect(finalP2.field_limit).toBe(initialFieldLimitP2);
        expect(finalP1.field_limit).toBe(initialFieldLimitP1);
    });
});
