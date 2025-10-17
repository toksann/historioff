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

describe('辟ｦ蝨・(Scorched Earth)', () => {
    test('繝励Ξ繧､譎ゅ∫嶌謇九・蝣ｴ縺ｮ繧ｫ繝ｼ繝我ｸ企剞縺・貂帛ｰ代☆繧九°', () => {
        // 1. Setup
        let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        // P1縺ｮ繧ｿ繝ｼ繝ｳ縺ｫ險ｭ螳・        gameState.current_turn = p1.id;
        
        // P1縺ｮ隕乗ｨ｡繧・5縺ｫ險ｭ螳・        p1.scale = 45;

        // P1縺ｮ謇区惆縺ｫ縲檎┬蝨溘阪ｒ霑ｽ蜉
        const scorchedEarthTemplate = card_definitions_map['辟ｦ蝨・];
        const scorchedEarthCard = createCardInstance(scorchedEarthTemplate, p1.id, gameState);
        p1.hand.push(scorchedEarthCard);

        const initialFieldLimitP2 = p2.field_limit;
        gameState.game_phase = GamePhase.MAIN_PHASE;

        // 2. Execution
        const playEffect = {
            effect_type: TriggerType.PLAY_EVENT_THIS,
            args: { card_id: scorchedEarthCard.instance_id, player_id: p1.id, target_card_id: scorchedEarthCard.instance_id }
        };
        gameState.effect_queue.push([playEffect, scorchedEarthCard]);

        let finalState = processEffects(gameState);

        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
            finalState = processEffects(finalState);
        }

        // 3. Verification
        const finalP2 = finalState.players[PlayerId.PLAYER2];
        const expectedFieldLimit = initialFieldLimitP2 - 1;

        expect(finalP2.field_limit).toBe(expectedFieldLimit);
    });
});
