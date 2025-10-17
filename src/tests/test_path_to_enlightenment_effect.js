import { initializeGame, playCard, endTurn, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, TriggerType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import card_definitions_array from '../../public/card_definitions.json';
import preset_decks from '../../public/preset_decks.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('縲梧ぁ繧翫・驕薙阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('驟咲ｽｮ譎ゅ∬ｦ乗ｨ｡-10縲∵焔譛ｭ縺ｮ雋｡縺梧昏縺ｦ繧峨ｌ縲∵昏縺ｦ縺滓椢謨ｰ縲瑚ｼｪ蟒ｻ霆｢逕溘阪′繝・ャ繧ｭ縺ｫ蜈･繧九°', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        gameState = startTurn(gameState);
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        p1.hand = [];
        p1.deck = [];
        const enlightenmentCard = createCardInstance(card_definitions_map['謔溘ｊ縺ｮ驕・], PlayerId.PLAYER1);
        const wealthCard1 = createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1);
        const wealthCard2 = createCardInstance(card_definitions_map['霎ｲ豌・], PlayerId.PLAYER1);
        const eventCard = createCardInstance(card_definitions_map['莠域─'], PlayerId.PLAYER1);

        [enlightenmentCard, wealthCard1, wealthCard2, eventCard].forEach(c => c.location = 'hand');

        p1.hand.push(enlightenmentCard, wealthCard1, wealthCard2, eventCard);
        gameState.all_card_instances[enlightenmentCard.instance_id] = enlightenmentCard;
        gameState.all_card_instances[wealthCard1.instance_id] = wealthCard1;
        gameState.all_card_instances[wealthCard2.instance_id] = wealthCard2;
        gameState.all_card_instances[eventCard.instance_id] = eventCard;

        p1.scale = 40;
        const initialScale = p1.scale;

        // Action
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, enlightenmentCard.instance_id);
        const finalState = processEffects(stateAfterPlay);
        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // Assertion
        expect(finalP1.scale).toBe(initialScale - 10);
        expect(finalP1.discard.some(c => c.instance_id === wealthCard1.instance_id)).toBe(true);
        expect(finalP1.discard.some(c => c.instance_id === wealthCard2.instance_id)).toBe(true);
        expect(finalP1.hand.some(c => c.instance_id === eventCard.instance_id)).toBe(true);
        const reincarnationCount = finalP1.deck.filter(c => c.name === '霈ｪ蟒ｻ霆｢逕・).length;
        expect(reincarnationCount).toBe(2);
        expect(finalP1.ideology.name).toBe('謔溘ｊ縺ｮ驕・);
    });

    test('縺・★繧後°縺ｮ繝励Ξ繧､繝､繝ｼ縺御ｺ玖ｱ｡繧ｫ繝ｼ繝峨ｒ繝励Ξ繧､縺励◆譎ゅ∵э隴・2', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        gameState = startTurn(gameState);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];

        // Setup
        const enlightenmentCard = createCardInstance(card_definitions_map['謔溘ｊ縺ｮ驕・], PlayerId.PLAYER1);
        p1.ideology = enlightenmentCard;
        gameState.all_card_instances[enlightenmentCard.instance_id] = enlightenmentCard;
        enlightenmentCard.location = 'ideology';

        // End player 1's turn so it becomes player 2's turn
        gameState = endTurn(gameState);
        p1 = gameState.players[PlayerId.PLAYER1]; // Re-assign after state change
        p2 = gameState.players[PlayerId.PLAYER2]; // Re-assign after state change

        const eventCard = createCardInstance(card_definitions_map['莠域─'], PlayerId.PLAYER2);
        eventCard.location = 'hand';
        p2.hand.push(eventCard);
        gameState.all_card_instances[eventCard.instance_id] = eventCard;
        
        const initialConsciousness = p1.consciousness;

        // Action: Opponent plays an event card
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER2, eventCard.instance_id);
        const finalState = processEffects(stateAfterPlay);
        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // Assertion
        expect(finalP1.consciousness).toBe(initialConsciousness + 2);
    });

    test('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲√き繝ｼ繝峨ｒ1譫壼ｼ輔￥', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        gameState = startTurn(gameState);
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const enlightenmentCard = createCardInstance(card_definitions_map['謔溘ｊ縺ｮ驕・], PlayerId.PLAYER1);
        p1.ideology = enlightenmentCard;
        gameState.all_card_instances[enlightenmentCard.instance_id] = enlightenmentCard;
        enlightenmentCard.location = 'ideology';

        const initialHandCount = p1.hand.length;

        // Action
        let intermediateState = endTurn(gameState);

        // Simulate the game loop to process all remaining effects after the turn ends.
        let safetyBreak = 0;
        while (intermediateState.effect_queue.length > 0 && !intermediateState.awaiting_input && safetyBreak < 10) {
            intermediateState = processEffects(intermediateState);
            safetyBreak++;
        }

        const finalState = intermediateState;
        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // Assertion
        // The endTurn function triggers the card effect for P1 to draw one more card.
        // The normal turn draw happens for P2.
        expect(finalP1.hand.length).toBe(initialHandCount + 1);
    });
});
