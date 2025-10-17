import { initializeGame, playCard, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, EffectType } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';
import card_definitions_array from '../../public/card_definitions.json';
import preset_decks from '../../public/preset_decks.json';

const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('縲後・繝阪・縲阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('蝣ｴ縺ｫ縺吶〒縺ｫ縺ゅｋ縲後・繝阪・縲阪↓閠蝉ｹ・､繧貞粋邂励☆繧九せ繧ｿ繝・く繝ｳ繧ｰ蜉ｹ譫・, () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const moneyCardOnField = createCardInstance(card_definitions_map['繝槭ロ繝ｼ'], PlayerId.PLAYER1);
        moneyCardOnField.current_durability = 10;
        moneyCardOnField.location = 'field';
        const moneyCardToPlay = createCardInstance(card_definitions_map['繝槭ロ繝ｼ'], PlayerId.PLAYER1);
        moneyCardToPlay.current_durability = 5;

        p1.field = [moneyCardOnField];
        p1.hand = [moneyCardToPlay];
        p1.scale = 10; // Required scale is 0, but let's have some scale
        gameState.current_turn = PlayerId.PLAYER1; // Make test deterministic

        // Action
        let afterPlayState = playCard(gameState, PlayerId.PLAYER1, moneyCardToPlay.instance_id);
        let finalState = processEffects(afterPlayState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalMoneyOnField = finalP1.field.find(c => c.name === '繝槭ロ繝ｼ');

        // Assertion
        expect(finalP1.field.length).toBe(1);
        expect(finalMoneyOnField.current_durability).toBe(15);
        expect(finalP1.discard.some(c => c.instance_id === moneyCardToPlay.instance_id)).toBe(true);
    });

    test('謇区惆縺ｫ謌ｻ繧矩圀縺ｫ閠蝉ｹ・､縺檎ｶｭ謖√＆繧後ｋ蜉ｹ譫・, () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const moneyCardOnField = createCardInstance(card_definitions_map['繝槭ロ繝ｼ'], PlayerId.PLAYER1);
        moneyCardOnField.current_durability = 15;
        moneyCardOnField.location = 'field';
        p1.field = [moneyCardOnField];

        // Action: Manually queue a MOVE_CARD effect to simulate bouncing
        const moveEffect = {
            effect_type: EffectType.MOVE_CARD,
            args: {
                player_id: PlayerId.PLAYER1,
                card_id: moneyCardOnField.instance_id,
                source_pile: 'field',
                destination_pile: 'hand',
            }
        };
        gameState.effect_queue.push([moveEffect, moneyCardOnField]);
        let finalState = processEffects(gameState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const moneyInHand = finalP1.hand.find(c => c.instance_id === moneyCardOnField.instance_id);

        // Assertion
        expect(moneyInHand).toBeDefined();
        expect(moneyInHand.current_durability).toBe(15);
    });

    test('繧ｿ繝ｼ繝ｳ髢句ｧ区凾縲∬蝉ｹ・､30莉･荳翫〒謇区惆莠､謠帛柑譫懊′逋ｺ蜍輔☆繧・, () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const moneyCardOnField = createCardInstance(card_definitions_map['繝槭ロ繝ｼ'], PlayerId.PLAYER1);
        moneyCardOnField.current_durability = 35;
        moneyCardOnField.location = 'field';

        const cardToKeep = createCardInstance(card_definitions_map['莠､譏楢ｷｯ'], PlayerId.PLAYER1); // req_scale: 8
        const cardToDiscard1 = createCardInstance(card_definitions_map['霎ｲ豌・], PlayerId.PLAYER1); // req_scale: 1
        const cardToDiscard2 = createCardInstance(card_definitions_map['譫懷ｮ・], PlayerId.PLAYER1); // req_scale: 0

        p1.field = [moneyCardOnField];
        p1.hand = [cardToKeep, cardToDiscard1, cardToDiscard2];
        gameState.current_turn = PlayerId.PLAYER1;

        // Action
        let finalState = startTurn(gameState);

        // Assertion
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        expect(finalP1.hand.some(c => c.name === '繝槭ロ繝ｼ')).toBe(true);
        expect(finalP1.hand.some(c => c.name === '雉・悽荳ｻ鄒ｩ')).toBe(true);
        expect(finalP1.hand.some(c => c.name === '莠､譏楢ｷｯ')).toBe(true);
        expect(finalP1.discard.some(c => c.name === '霎ｲ豌・)).toBe(true);
        expect(finalP1.discard.some(c => c.name === '譫懷ｮ・)).toBe(true);
    });

    test('縲悟ｴ縺ｮ繝槭ロ繝ｼ縺ｮ閠蝉ｹ・､縺ｯ隕乗ｨ｡縺ｨ縺ｿ縺ｪ縺吶榊柑譫懊・繝・せ繝・, () => {
        let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
        let p1 = gameState.players[PlayerId.PLAYER1];

        // Setup
        const moneyCardOnField = createCardInstance(card_definitions_map['繝槭ロ繝ｼ'], PlayerId.PLAYER1);
        moneyCardOnField.current_durability = 10;
        moneyCardOnField.location = 'field';

        const highCostCard = createCardInstance(card_definitions_map['莠､譏楢ｷｯ'], PlayerId.PLAYER1); // Requires 8 scale

        p1.scale = 5; // Base scale is not enough
        p1.field = [moneyCardOnField];
        p1.hand = [highCostCard];
        gameState.current_turn = PlayerId.PLAYER1;

        // Action
        let afterPlayState = playCard(gameState, PlayerId.PLAYER1, highCostCard.instance_id);
        let finalState = processEffects(afterPlayState);

        // Assertion
        const finalP1 = finalState.players[PlayerId.PLAYER1];
        // The card should have been played, so it should not be in the hand.
        expect(finalP1.hand.some(c => c.instance_id === highCostCard.instance_id)).toBe(false);
        // It should be on the field.
        expect(finalP1.field.some(c => c.instance_id === highCostCard.instance_id)).toBe(true);
    });
});
