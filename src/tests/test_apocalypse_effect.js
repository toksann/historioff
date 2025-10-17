import { initializeGame, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import card_definitions_array from '../../public/card_definitions.json';
import preset_decks from '../../public/preset_decks.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('縲檎ｵよ忰縲阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('繧ｫ繝ｼ繝峨ｒ蠑輔＞縺滓凾縲∝叉蠎ｧ縺ｫ謐ｨ縺ｦ譛ｭ縺ｫ縺ｪ繧翫∽ｸ｡繝励Ξ繧､繝､繝ｼ縺ｮ隕乗ｨ｡縺ｨ諢剰ｭ倥′豁｣縺励￥螟牙虚縺吶ｋ縺・, () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        // Setup
        const apocalypseCard = createCardInstance(card_definitions_map['邨よ忰'], PlayerId.PLAYER1);
        p1.deck.unshift(apocalypseCard); // Place Apocalypse on top of the deck
        gameState.all_card_instances[apocalypseCard.instance_id] = apocalypseCard; // Add to global instances
        
        p1.scale = 10;
        p2.scale = 20;
        p1.hand = [createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1)]; // 1 card in hand before draw

        // Manually set the turn to PLAYER1 to make the test deterministic
        gameState.current_turn = PlayerId.PLAYER1;
        // Apply the first-player debuff manually if not already applied
        if (p1.consciousness === 50) { 
            p1.consciousness -= 3;
        }

        const initialP1Consciousness = p1.consciousness; // Should be 47
        const initialP2Consciousness = p2.consciousness;
        const initialP1Scale = p1.scale;
        const initialP2Scale = p2.scale;
        const p1HandCountBeforeEffect = p1.hand.length;

        console.log(`[DEBUG] Before startTurn, gameState.current_turn: ${gameState.current_turn}`); // DEBUG LOG

        // Action: Start the turn, which will draw the Apocalypse card.
        let intermediateState = startTurn(gameState);
        console.log("Initial effect queue:", JSON.stringify(intermediateState.effect_queue, null, 2));
        let safetyBreak = 0;
        while (intermediateState.effect_queue.length > 0 && !intermediateState.awaiting_input && safetyBreak < 20) {
            intermediateState = processEffects(intermediateState);
            console.log(`Loop ${safetyBreak}: Queue length: ${intermediateState.effect_queue.length}`);
            safetyBreak++;
        }
        const finalState = intermediateState;

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalP2 = finalState.players[PlayerId.PLAYER2];

        // Assertion
        // 1. Apocalypse card should be in the discard pile, not in hand.
        expect(finalP1.hand.some(c => c.name === '邨よ忰')).toBe(false);
        expect(finalP1.discard.some(c => c.name === '邨よ忰')).toBe(true);

        // 2. Both players' scale should be 0.
        expect(finalP1.scale).toBe(0);
        expect(finalP2.scale).toBe(0);

        // 3. Consciousness should be adjusted correctly.
        const expectedP1Consciousness = initialP1Consciousness - initialP1Scale + p1HandCountBeforeEffect;
        expect(finalP1.consciousness).toBe(expectedP1Consciousness);

        const expectedP2Consciousness = initialP2Consciousness - initialP2Scale;
        expect(finalP2.consciousness).toBe(expectedP2Consciousness);
    });
});
