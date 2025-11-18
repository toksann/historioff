const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, EffectType, Location, TriggerType, CardType } = require('../gameLogic/constants');

describe('重金主義 (Bullionism) Card Effect', () => {
    const cardDefinitions = {
        "重金主義": {
            "name": "重金主義",
            "card_type": CardType.IDEOLOGY,
            "required_scale": 10,
            "triggers": {
                "CARD_PLACED_THIS": [{"effect_type": "ADD_CARD_TO_GAME", "args": {"player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability": 3}}],
                "MODIFY_SCALE_INCREASE_RESERVE_OWNER": [
                    {"effect_type": "SKIP_EFFECT", "args": {"player_id": "self", "effect_type": "MODIFY_SCALE"}},
                    {"effect_type": "ADD_CARD_TO_GAME", "args": {"player_id": "self", "card_template_name": "マネー", "destination_pile": "hand", "initial_durability": 1}}
                ],
                "START_TURN_OWNER": [{"effect_type": "PROCESS_ADD_CHOICE_CARD_TO_HAND", "args": {"player_id": "self", "options": ["重商主義", "重農主義"], "condition_money_durability_ge_10": true}}],
                "END_TURN_OWNER": [{"effect_type": "PROCESS_DISCARD_ALL_HAND_IDEOLOGY_AND_ADD_MONEY", "args": {"player_id": "self"}}]
            }
        },
        "マネー": { "name": "マネー", "card_type": CardType.WEALTH, "is_token": true },
        "重商主義": { "name": "重商主義", "card_type": CardType.IDEOLOGY },
        "重農主義": { "name": "重農主義", "card_type": CardType.IDEOLOGY },
        "テストイデオロギー": { "name": "テストイデオロギー", "card_type": CardType.IDEOLOGY },
        "規模増加カード": { "name": "規模増加カード", "card_type": CardType.EVENT }
    };

    let gameState;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10; // To play Bullionism
        const bullionismCard = createCardInstance(cardDefinitions['重金主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = bullionismCard;
        gameState.all_card_instances[bullionismCard.instance_id] = bullionismCard;
    });

    test('should add a Money card with 3 durability when placed', () => {
        let testGameState = createTestGameState(cardDefinitions);
        const p1 = testGameState.players[PlayerId.PLAYER1];
        p1.scale = 10;
        const bullionismCard = createCardInstance(cardDefinitions['重金主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(bullionismCard);
        
        const moveEffect = { effect_type: EffectType.MOVE_CARD, args: { player_id: PlayerId.PLAYER1, card_id: bullionismCard.instance_id, source_pile: 'hand', destination_pile: 'field' }};
        testGameState.effect_queue.push([moveEffect, bullionismCard]);
        const nextState = processEffects(testGameState);

        const moneyCard = nextState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');
        assert.ok(moneyCard, 'A Money card should be added to hand');
        assert.strictEqual(moneyCard.current_durability, 3, 'Money card should have 3 durability');
    });

    test('should skip scale increase and add a Money card instead', () => {
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialScale = p1.scale;
        const initialHandSize = p1.hand.length;
        const scaleIncreaseAmount = 5;

        const scaleEffect = { effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: PlayerId.PLAYER1, amount: scaleIncreaseAmount }};
        gameState.effect_queue.push([scaleEffect, createCardInstance(cardDefinitions['規模増加カード'], PlayerId.PLAYER1)]);
        const nextState = processEffects(gameState);

        const p1Final = nextState.players[PlayerId.PLAYER1];
        const moneyCard = p1Final.hand.find(c => c.name === 'マネー');
        
        assert.strictEqual(p1Final.scale, initialScale, 'Scale should not increase');
        assert.strictEqual(p1Final.hand.length, initialHandSize + 1, 'A new card should be added to hand');
        assert.ok(moneyCard, 'A Money card should be added');
        assert.strictEqual(moneyCard.current_durability, scaleIncreaseAmount, 'Money card durability should be equal to the scale increase amount');
    });

    test('should prompt choice when Money durability is >= 10 at turn start', () => {
        const p1 = gameState.players[PlayerId.PLAYER1];
        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 12 });
        p1.field.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const startTurnEffect = { effect_type: TriggerType.START_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 }};
        gameState.effect_queue.push([startTurnEffect, null]);
        const nextState = processEffects(gameState);

        assert.ok(nextState.awaiting_input, 'Game should be awaiting input');
        assert.strictEqual(nextState.awaiting_input.type, 'CHOICE_CARD_TO_ADD');
        assert.deepStrictEqual(nextState.awaiting_input.options, ['重商主義', '重農主義']);
    });

    test('should discard hand ideologies and add Money at turn end', () => {
        const p1 = gameState.players[PlayerId.PLAYER1];
        const ideology1 = createCardInstance(cardDefinitions['テストイデオロギー'], PlayerId.PLAYER1, { location: Location.HAND });
        const ideology2 = createCardInstance(cardDefinitions['テストイデオロギー'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(ideology1, ideology2);
        const initialHandIdeologies = p1.hand.filter(c => c.card_type === CardType.IDEOLOGY).length;

        const endTurnEffect = { effect_type: TriggerType.END_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 }};
        gameState.effect_queue.push([endTurnEffect, null]);
        const nextState = processEffects(gameState);
        
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const moneyCard = p1Final.hand.find(c => c.name === 'マネー');
        const finalHandIdeologies = p1Final.hand.filter(c => c.card_type === CardType.IDEOLOGY).length;

        assert.strictEqual(finalHandIdeologies, 0, 'All ideologies should be discarded from hand');
        assert.ok(moneyCard, 'A Money card should be added to hand');
        assert.strictEqual(moneyCard.current_durability, initialHandIdeologies, 'Money durability should equal the number of discarded ideologies');
    });
});
