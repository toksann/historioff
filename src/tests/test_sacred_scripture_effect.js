import { initializeGame, endTurn } from '../gameLogic/main.js';
import { PlayerId } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import card_definitions_array from '../../public/card_definitions.json';
import preset_decks from '../../public/preset_decks.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('縲瑚＊蜈ｸ縲阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('繧ｿ繝ｼ繝ｳ髢句ｧ区凾縲√ョ繝・く8譫壻ｻ･荳翫↑繧画э隴・1縺ｨ縲悟ｸ・蕗縲阪ｒ謇区惆縺ｫ蜉縺医ｋ', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const sacredScriptureCard = createCardInstance(card_definitions_map['閨門・'], PlayerId.PLAYER1);
        p1.field.push(sacredScriptureCard);
        sacredScriptureCard.location = 'field';
        gameState.all_card_instances[sacredScriptureCard.instance_id] = sacredScriptureCard;

        // Ensure deck has >= 8 cards
        while (p1.deck.length < 8) {
            p1.deck.push(createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1));
        }

        const initialConsciousness = p1.consciousness;
        const initialHandCount = p1.hand.length;

        // Action: End the turn to trigger the start of the next turn for the same player
        let finalState = endTurn(gameState);
        finalState = endTurn(finalState);
        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // Assertion
        expect(finalP1.consciousness).toBe(initialConsciousness + 1);
        // Hand count increases by 1 for the start-of-turn draw, and 1 for the card effect
        expect(finalP1.hand.length).toBe(initialHandCount + 2);
        expect(finalP1.hand.some(c => c.name === '蟶・蕗')).toBeTruthy();
    });

    test('繧ｿ繝ｼ繝ｳ髢句ｧ区凾縲√ョ繝・く8譫壽悴貅縺ｪ繧画э隴・1縺ｨ縲悟ｴ・享縲阪ｒ謇区惆縺ｫ蜉縺医ｋ', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const sacredScriptureCard = createCardInstance(card_definitions_map['閨門・'], PlayerId.PLAYER1);
        p1.field.push(sacredScriptureCard);
        sacredScriptureCard.location = 'field';
        gameState.all_card_instances[sacredScriptureCard.instance_id] = sacredScriptureCard;

        // Ensure deck has < 8 cards
        p1.deck = [];
        for (let i = 0; i < 7; i++) {
            p1.deck.push(createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1));
        }

        const initialConsciousness = p1.consciousness;
        const initialHandCount = p1.hand.length;

        // Action: End the turn to trigger the start of the next turn for the same player
        let finalState = endTurn(gameState);
        finalState = endTurn(finalState);
        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // Assertion
        expect(finalP1.consciousness).toBe(initialConsciousness + 1);
        // Hand count increases by 1 for the start-of-turn draw, and 1 for the card effect
        expect(finalP1.hand.length).toBe(initialHandCount + 2);
        expect(finalP1.hand.some(c => c.name === '蟠・享')).toBeTruthy();
    });
});
