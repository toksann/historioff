import { initializeGame, playCard } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import card_definitions_array from '../../public/card_definitions.json';
import preset_decks from '../../public/preset_decks.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('縲瑚ｼｪ蟒ｻ霆｢逕溘阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('繝励Ξ繧､譎ゅ√ョ繝・く縺後☆縺ｹ縺ｦ髯､螟悶＆繧後∵昏縺ｦ譛ｭ縺梧眠縺溘↑繝・ャ繧ｭ縺ｫ縺ｪ繧九°', () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const reincarnationCard = createCardInstance(card_definitions_map['霈ｪ蟒ｻ霆｢逕・], PlayerId.PLAYER1);
        const deckCard1 = createCardInstance(card_definitions_map['霎ｲ豌・], PlayerId.PLAYER1);
        const deckCard2 = createCardInstance(card_definitions_map['謌ｦ螢ｫ'], PlayerId.PLAYER1);
        const discardCard1 = createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1);
        const discardCard2 = createCardInstance(card_definitions_map['螻ｱ'], PlayerId.PLAYER1);

        p1.hand = [reincarnationCard];
        p1.deck = [deckCard1, deckCard2];
        p1.discard = [discardCard1, discardCard2];
        p1.scale = 30; // Required scale

        // Action
        let afterPlayState = playCard(gameState, PlayerId.PLAYER1, reincarnationCard.instance_id);
        
        let finalState = afterPlayState;
        let safetyBreak = 0;
        while (finalState.effect_queue.length > 0 && !finalState.awaiting_input && safetyBreak < 20) {
            finalState = processEffects(finalState);
            safetyBreak++;
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalDeckCardNames = finalP1.deck.map(c => c.name).sort();
        const expectedDeckCardNames = [discardCard1.name, discardCard2.name].sort();

        // Assertion
        expect(finalP1.deck.length).toBe(2);
        expect(finalDeckCardNames).toEqual(expectedDeckCardNames);
        expect(finalP1.discard.length).toBe(1); // Should only contain the played Reincarnation card
        expect(finalP1.discard[0].name).toBe('霈ｪ蟒ｻ霆｢逕・);
    });
});
