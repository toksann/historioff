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

describe('讀肴ｰ大慍 (Colony)', () => {
    test('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∬・霄ｫ縺ｮ閠蝉ｹ・､-1縲√後・繝阪・縲阪ｒ1譫壽焔譛ｭ縺ｫ蜉縺医ｋ', () => {
        // 1. Setup
        let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        const p1 = gameState.players[PlayerId.PLAYER1];

        gameState.current_turn = p1.id;
        p1.scale = 50; // 蠢・ｦ∬ｦ乗ｨ｡繧呈ｺ縺溘☆

        const colonyTemplate = card_definitions_map['讀肴ｰ大慍'];
        const colonyCard = createCardInstance(colonyTemplate, p1.id, gameState);
        
        // 縲梧､肴ｰ大慍縲阪ｒ謇区惆縺ｫ蜉縺医ｋ
        p1.hand.push(colonyCard);

        // 縲梧､肴ｰ大慍縲阪ｒ蝣ｴ縺ｫ蜃ｺ縺・        const moveEffect = {
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: colonyCard.instance_id,
                source_pile: 'hand',
                destination_pile: 'field',
                player_id: p1.id
            }
        };
        gameState.effect_queue.push([moveEffect, null]);
        
        // 繧ｫ繝ｼ繝峨ｒ蝣ｴ縺ｫ蜃ｺ縺吝・逅・ｒ螳御ｺ・＆縺帙ｋ
        let stateAfterPlay = processEffects(gameState);
        while (stateAfterPlay.effect_queue.length > 0 && !stateAfterPlay.awaiting_input) {
            stateAfterPlay = processEffects(stateAfterPlay);
        }
        
        // 蝣ｴ縺ｫ蜃ｺ縺溘梧､肴ｰ大慍縲阪き繝ｼ繝峨・繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧貞叙蠕・        const placedColonyCard = stateAfterPlay.players[PlayerId.PLAYER1].field.find(c => c.instance_id === colonyCard.instance_id);
        expect(placedColonyCard).toBeDefined();

        const initialHandSize = stateAfterPlay.players[PlayerId.PLAYER1].hand.length;
        const initialColonyDurability = placedColonyCard.current_durability;
        
        // 繧ｿ繝ｼ繝ｳ邨ゆｺ・凾蜉ｹ譫懊ｒ逋ｺ蜍・        stateAfterPlay.game_phase = GamePhase.END_TURN; // 繧ｿ繝ｼ繝ｳ邨ゆｺ・ヵ繧ｧ繝ｼ繧ｺ縺ｫ險ｭ螳・        const endTurnEffect = {
            effect_type: TriggerType.END_TURN_OWNER,
            args: { player_id: p1.id }
        };
        stateAfterPlay.effect_queue.push([endTurnEffect, placedColonyCard]); // sourceCard縺ｯ讀肴ｰ大慍閾ｪ霄ｫ

        // 2. Execution
        let finalState = processEffects(stateAfterPlay);
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalColonyCard = finalP1.field.find(c => c.instance_id === colonyCard.instance_id);

        expect(finalColonyCard.current_durability).toBe(initialColonyDurability - 1);
        expect(finalP1.hand.length).toBe(initialHandSize + 1);
        expect(finalP1.hand.some(c => c.name === '繝槭ロ繝ｼ')).toBe(true);
    });
});
