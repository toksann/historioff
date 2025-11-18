const { endTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');


describe('物質主義 (Materialism) Card Effect', () => {
    const cardDefinitions = {
        "物質主義": {
            "name": "物質主義",
            "card_type": "イデオロギー",
            "required_scale": 6,
            "description": "ターン終了時、自分の場の財の数と同じ値だけ自分の規模をプラスする。自分の場の財が3枚以上ある場合、自分の意識+1、相手の意識-1。",
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount_based_on_field_wealth_count": true } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 1, "condition_field_wealth_count_ge_3": true } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -1, "condition_field_wealth_count_ge_3": true } }
                ]
            }
        },
        "戦士": { "name": "戦士", "card_type": "財", "required_scale": 1, "durability": 2 }
    };

    let gameState, p1, p2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        p1 = gameState.players[PlayerId.PLAYER1];
        p2 = gameState.players[PlayerId.PLAYER2];
        const materialismCard = createCardInstance(cardDefinitions['物質主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = materialismCard;
        gameState.all_card_instances[materialismCard.instance_id] = materialismCard;
        gameState.current_turn = PlayerId.PLAYER1;
    });

    test('should only increase scale if wealth cards are less than 3', () => {
        // 1. Setup
        const wealth1 = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        const wealth2 = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        p1.field = [wealth1, wealth2];
        gameState.all_card_instances[wealth1.instance_id] = wealth1;
        gameState.all_card_instances[wealth2.instance_id] = wealth2;
        const wealthCount = p1.field.length;

        const initialP1Scale = p1.scale;
        const initialP1Consciousness = p1.consciousness;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        expect(finalP1.scale).toBe(initialP1Scale + wealthCount);
        expect(finalP1.consciousness).toBe(initialP1Consciousness);
    });

    test('should also change consciousness if wealth cards are 3 or more', () => {
        // 1. Setup
        const wealth1 = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        const wealth2 = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        const wealth3 = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD });
        p1.field = [wealth1, wealth2, wealth3];
        [wealth1, wealth2, wealth3].forEach(c => gameState.all_card_instances[c.instance_id] = c);
        const wealthCount = p1.field.length;

        const initialP1Scale = p1.scale;
        const initialP1Consciousness = p1.consciousness;
        const initialP2Consciousness = p2.consciousness;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalP2 = newState.players[PlayerId.PLAYER2];
        expect(finalP1.scale).toBe(initialP1Scale + wealthCount);
        expect(finalP1.consciousness).toBe(initialP1Consciousness + 1);
        expect(finalP2.consciousness).toBe(initialP2Consciousness - 1);
    });

    test('should not change scale or consciousness if there are no wealth cards', () => {
        // 1. Setup
        p1.field = [];
        const initialP1Scale = p1.scale;
        const initialP1Consciousness = p1.consciousness;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        expect(finalP1.scale).toBe(initialP1Scale);
        expect(finalP1.consciousness).toBe(initialP1Consciousness);
    });
});