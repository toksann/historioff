import { playCard, endTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils.js';

// Load definitions
import card_definitions_array from '../../public/card_definitions.json';
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    if (card['card-type']) {
        card.card_type = card['card-type'];
        delete card['card-type'];
    }
    acc[card.name] = card;
    return acc;
}, {});

const createInitialGameState = () => {
    let gameState = {
        players: {
            [PlayerId.PLAYER1]: {
                id: PlayerId.PLAYER1,
                consciousness: 50,
                scale: 0, // Default to 0 for tests
                hand: [],
                field: [],
                deck: [],
                discard: [],
                ideology: null,
                field_limit: 5,
                hand_capacity: 7,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            },
            [PlayerId.PLAYER2]: {
                id: PlayerId.PLAYER2,
                consciousness: 50,
                scale: 10,
                hand: [],
                field: [],
                deck: [],
                discard: [],
                ideology: null,
                field_limit: 5,
                hand_capacity: 7,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            },
        },
        current_turn: PlayerId.PLAYER1,
        turn_number: 1,
        effect_queue: [],
        awaiting_input: null,
        game_over: false,
        winner: null,
        cardDefs: card_definitions_map,
        temp_effect_data: {},
    };
    return gameState;
};

describe('縲悟ｸ・蕗縲阪・蜉ｹ譫懊ユ繧ｹ繝・, () => {

    test('繝励Ξ繧､譎ゅ∬ｦ乗ｨ｡縺・譛ｪ貅縺ｪ繧芽ｦ乗ｨ｡+2縺ｮ縺ｿ', () => {
        let gameState = createInitialGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 4;
        const initialScale = p1.scale;

        const missionaryTemplate = card_definitions_map['蟶・蕗'];
        const missionaryInstance = createCardInstance(missionaryTemplate, PlayerId.PLAYER1);
        p1.hand.push(missionaryInstance);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, missionaryInstance.instance_id);
        let finalState = processEffects(stateAfterPlay);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const hasSufferingCard = finalP1.hand.some(c => c.name === '蜿鈴屮');

        expect(finalP1.scale).toBe(initialScale + 2);
        expect(hasSufferingCard).toBeFalsy();
    });

    test('繝励Ξ繧､譎ゅ∬ｦ乗ｨ｡縺・莉･荳翫↑繧芽ｦ乗ｨ｡+2縺ｨ縲悟女髮｣縲崎ｿｽ蜉', () => {
        let gameState = createInitialGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 5;
        const initialScale = p1.scale;

        const missionaryTemplate = card_definitions_map['蟶・蕗'];
        const missionaryInstance = createCardInstance(missionaryTemplate, PlayerId.PLAYER1);
        p1.hand.push(missionaryInstance);

        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, missionaryInstance.instance_id);
        let finalState = processEffects(stateAfterPlay);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const hasSufferingCard = finalP1.hand.some(c => c.name === '蜿鈴屮');

        expect(finalP1.scale).toBe(initialScale + 2);
        expect(hasSufferingCard).toBeTruthy();
    });

    test('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∵焔譛ｭ縺ｫ縺ゅｌ縺ｰ謐ｨ縺ｦ譛ｭ縺ｫ遘ｻ蜍輔＠縲∵э隴・1縺輔ｌ繧九°', () => {
        let gameState = createInitialGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;

        // Add "蟶・蕗" to hand
        const missionaryTemplate = card_definitions_map['蟶・蕗'];
        const missionaryInstance = createCardInstance(missionaryTemplate, PlayerId.PLAYER1);
        missionaryInstance.location = 'hand'; // Set location
        p1.hand.push(missionaryInstance);

        // End the turn
        let finalState = endTurn(gameState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const missionaryInHand = finalP1.hand.some(c => c.instance_id === missionaryInstance.instance_id);
        const missionaryInDiscard = finalP1.discard.some(c => c.instance_id === missionaryInstance.instance_id);

        // Assertions
        expect(finalP1.consciousness).toBe(initialConsciousness + 1);
        expect(missionaryInHand).toBeFalsy();
        expect(missionaryInDiscard).toBeTruthy();
    });
});
