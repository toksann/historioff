const assert = require('assert');
const { playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, Location, EffectType } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance, processAllEffects } = require('./test_helpers');

describe('帝国主義 (Imperialism) Card Effect', () => {
    const cardDefinitions = {
        "帝国主義": {
            "name": "帝国主義",
            "card_type": "イデオロギー",
            "required_scale": 50,
            "description": "配置時、「占領」を手札に1枚加える。自分のターン中、相手の財の耐久値を0にするたび自分の意識+2、自分の場のすべての財の耐久値+2。ターン終了時、相手より自分の方が場の上限が多いなら差分だけ相手の意識をマイナスし、自分の意識をプラスする。",
            "triggers": {
                "CARD_PLACED_THIS": [{ "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "占領", "destination_pile": "hand" } }],
                "WEALTH_DURABILITY_ZERO_OPPONENT": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 2 } },
                    { "effect_type": "PROCESS_ALL_WEALTH_BOOST", "args": { "player_id": "self", "amount": 2 } }
                ],
                "END_TURN_OWNER": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount_based_on_field_limit_diff": "minus" } },
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount_based_on_field_limit_diff": "plus" } }
                ]
            }
        },
        "占領": { "name": "占領", "card_type": "事象", "required_scale": 70 },
        "戦士": { "name": "戦士", "card_type": "財", "durability": 2 },
        "果実": { "name": "果実", "card_type": "財", "durability": 1 }
    };

    test('should add Occupation to hand on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const imperialismCard = createCardInstance(cardDefinitions['帝国主義'], p1.id);
        p1.hand.push(imperialismCard);
        gameState.all_card_instances[imperialismCard.instance_id] = imperialismCard;
        p1.scale = 50;

        let newState = playCard(gameState, PlayerId.PLAYER1, imperialismCard.instance_id);
        newState = processAllEffects(newState);

        const occupationInHand = newState.players[PlayerId.PLAYER1].hand.find(c => c.name === '占領');
        assert.ok(occupationInHand, 'Occupation card should be added to hand');
    });

    test('should adjust consciousness based on field limit difference at end of turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const imperialismCard = createCardInstance(cardDefinitions['帝国主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = imperialismCard;
        gameState.all_card_instances[imperialismCard.instance_id] = imperialismCard;
        gameState.current_turn = PlayerId.PLAYER1;

        p1.field_limit = 5;
        p2.field_limit = 3;
        const limit_diff = p1.field_limit - p2.field_limit; // 2
        const initial_p1_consciousness = p1.consciousness;
        const initial_p2_consciousness = p2.consciousness;

        let newState = endTurn(gameState);
        newState = processAllEffects(newState);

        const final_p1 = newState.players[PlayerId.PLAYER1];
        const final_p2 = newState.players[PlayerId.PLAYER2];
        assert.strictEqual(final_p1.consciousness, initial_p1_consciousness + limit_diff, 'P1 consciousness should increase by field limit difference');
        assert.strictEqual(final_p2.consciousness, initial_p2_consciousness - limit_diff, 'P2 consciousness should decrease by field limit difference');
    });

    test('should trigger effects when opponent wealth is destroyed', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const imperialismCard = createCardInstance(cardDefinitions['帝国主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = imperialismCard;
        gameState.all_card_instances[imperialismCard.instance_id] = imperialismCard;
        gameState.current_turn = PlayerId.PLAYER1;

        const p1Wealth = createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD, current_durability: 2 });
        p1.field.push(p1Wealth);
        gameState.all_card_instances[p1Wealth.instance_id] = p1Wealth;

        const p2Wealth = createCardInstance(cardDefinitions['果実'], p2.id, { location: Location.FIELD, current_durability: 1 });
        p2.field.push(p2Wealth);
        gameState.all_card_instances[p2Wealth.instance_id] = p2Wealth;

        const initial_p1_consciousness = p1.consciousness;
        const initial_p1_wealth_durability = p1Wealth.current_durability;

        const damageEffect = { effect_type: EffectType.MODIFY_CARD_DURABILITY, args: { card_id: p2Wealth.instance_id, amount: -1, source_card_id: p1.id } };
        gameState.effect_queue.push([damageEffect, null]);

        let newState = processAllEffects(gameState);

        const final_p1 = newState.players[PlayerId.PLAYER1];
        const final_p1_wealth = newState.all_card_instances[p1Wealth.instance_id];
        const destroyed_p2_wealth = newState.all_card_instances[p2Wealth.instance_id];

        assert.strictEqual(final_p1.consciousness, initial_p1_consciousness + 2, 'P1 consciousness should increase by 2');
        assert.strictEqual(final_p1_wealth.current_durability, initial_p1_wealth_durability + 2, 'P1 wealth durability should increase by 2');
        assert.strictEqual(destroyed_p2_wealth.location, Location.DISCARD, 'Opponent wealth should be in the discard pile');
    });
});
