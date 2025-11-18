const assert = require('assert');
const { playCard, startTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('マネー (Money) Card Effect', () => {
    const cardDefinitions = {
        "マネー": {
            "name": "マネー",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "is_token": true,
            "triggers": {
                "CARD_PLACED_THIS": [{ "effect_type": "PROCESS_MONEY_CARD_PLACEMENT_EFFECT", "args": { "player_id": "self", "card_id": "self" } }],
                "START_TURN_OWNER": [{ "effect_type": "PROCESS_MONEY_CARD_TURN_START_EFFECT", "args": { "player_id": "self", "card_id": "self", "condition_durability_ge_30": true } }]
            }
        },
        "資本主義": { "name": "資本主義", "card_type": "イデオロギー" },
        "農民": { "name": "農民", "card_type": "財", "required_scale": 0 },
        "戦士": { "name": "戦士", "card_type": "財", "required_scale": 1 },
        "砦": { "name": "砦", "card_type": "財", "required_scale": 15 }
    };

    test('should stack durability on existing Money card when played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const moneyOnField = createCardInstance(cardDefinitions['マネー'], p1.id, { location: Location.FIELD, current_durability: 10 });
        p1.field.push(moneyOnField);
        gameState.all_card_instances[moneyOnField.instance_id] = moneyOnField;

        const moneyToPlay = createCardInstance(cardDefinitions['マネー'], p1.id, { current_durability: 5 });
        p1.hand.push(moneyToPlay);
        gameState.all_card_instances[moneyToPlay.instance_id] = moneyToPlay;

        let newState = playCard(gameState, PlayerId.PLAYER1, moneyToPlay.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const finalMoneyOnField = finalP1.field.find(c => c.instance_id === moneyOnField.instance_id);
        assert.strictEqual(finalP1.field.length, 1, 'There should only be one Money card on the field');
        assert.strictEqual(finalMoneyOnField.current_durability, 15, 'Durability should be stacked (10 + 5)');
        assert.ok(finalP1.discard.some(c => c.instance_id === moneyToPlay.instance_id), 'The played Money card should be in the discard pile');
    });

    test('should trigger effects at start of turn if durability is >= 30', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;
        const moneyOnField = createCardInstance(cardDefinitions['マネー'], p1.id, { location: Location.FIELD, current_durability: 35 });
        p1.field.push(moneyOnField);
        gameState.all_card_instances[moneyOnField.instance_id] = moneyOnField;

        const cardToDiscard1 = createCardInstance(cardDefinitions['農民'], p1.id); // cost 0
        const cardToDiscard2 = createCardInstance(cardDefinitions['戦士'], p1.id); // cost 1
        const cardToKeep = createCardInstance(cardDefinitions['砦'], p1.id);     // cost 15
        p1.hand = [cardToKeep, cardToDiscard1, cardToDiscard2]; // Unordered
        [cardToKeep, cardToDiscard1, cardToDiscard2].forEach(c => gameState.all_card_instances[c.instance_id] = c);

        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, 3, 'Final hand size should be 3'); // Kept card + Capitalism + Money + turn draw - 2 discarded
        assert.ok(finalP1.hand.some(c => c.name === '資本主義'), 'Capitalism should be added to hand');
        assert.ok(finalP1.hand.some(c => c.instance_id === moneyOnField.instance_id), 'Money card should be returned to hand');
        assert.ok(finalP1.hand.some(c => c.instance_id === cardToKeep.instance_id), 'The highest cost card should be kept in hand');
        assert.ok(finalP1.discard.some(c => c.instance_id === cardToDiscard1.instance_id), 'Lowest cost card should be discarded');
        assert.ok(finalP1.discard.some(c => c.instance_id === cardToDiscard2.instance_id), 'Second lowest cost card should be discarded');
    });

    test('should NOT trigger effects at start of turn if durability is < 30', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        gameState.current_turn = PlayerId.PLAYER1;
        const moneyOnField = createCardInstance(cardDefinitions['マネー'], p1.id, { location: Location.FIELD, current_durability: 29 });
        p1.field.push(moneyOnField);
        gameState.all_card_instances[moneyOnField.instance_id] = moneyOnField;
        
        // Add a card to the deck so DRAW_CARD can function
        const dummyCard = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.deck.push(dummyCard);
        gameState.all_card_instances[dummyCard.instance_id] = dummyCard;

        const initialHand = [...p1.hand];

        let newState = startTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        // Hand should just increase by 1 from the normal turn draw
        assert.strictEqual(finalP1.hand.length, initialHand.length + 1, 'Hand should only change by the turn draw');
        assert.ok(finalP1.field.some(c => c.instance_id === moneyOnField.instance_id), 'Money card should remain on the field');
    });
});
