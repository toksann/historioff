const assert = require('assert');
const { playCard, endTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, Location } = require('../gameLogic/constants');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('悟りの道 (Path to Enlightenment) Card Effect', () => {
    const cardDefinitions = {
        "悟りの道": {
            "name": "悟りの道",
            "card_type": "イデオロギー",
            "required_scale": 30,
            "description": "配置時、自分の規模を-10し、自分の手札の財カードをすべて捨て、捨てた枚数「輪廻転生」をデッキに加える。自分か相手が事象カードを出すたび自分の意識+2。ターン終了時、カードを1枚引く。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": -10 } },
                    { "effect_type": "PROCESS_ADD_CARDS_BASED_ON_DISCARDED_COUNT", "args": { "player_id": "self", "card_template_name": "輪廻転生", "destination_pile": "deck", "card_type_to_discard": "財" } }
                ],
                "PLAY_EVENT": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 2 } }],
                "END_TURN_OWNER": [{ "effect_type": "MOVE_CARD", "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" } }]
            }
        },
        "輪廻転生": { "name": "輪廻転生", "card_type": "事象" },
        "果実": { "name": "果実", "card_type": "財" },
        "農民": { "name": "農民", "card_type": "財" },
        "大嵐": { "name": "大嵐", "card_type": "事象", "required_scale": 50 }
    };

    test('should discard wealth and add Reincarnation to deck on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const enlightenmentCard = createCardInstance(cardDefinitions['悟りの道'], p1.id);
        const wealthCard1 = createCardInstance(cardDefinitions['果実'], p1.id);
        const wealthCard2 = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.hand = [enlightenmentCard, wealthCard1, wealthCard2];
        [enlightenmentCard, wealthCard1, wealthCard2].forEach(c => gameState.all_card_instances[c.instance_id] = c);
        p1.deck = [];
        p1.scale = 40;
        const initialScale = p1.scale;

        let newState = playCard(gameState, PlayerId.PLAYER1, enlightenmentCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const reincarnationCount = finalP1.deck.filter(c => c.name === '輪廻転生').length;

        assert.strictEqual(finalP1.scale, initialScale - 10, 'Scale should decrease by 10');
        assert.strictEqual(finalP1.discard.length, 2, 'Two wealth cards should be discarded');
        assert.strictEqual(reincarnationCount, 2, 'Two Reincarnation cards should be added to the deck');
        assert.ok(finalP1.ideology && finalP1.ideology.name === '悟りの道', 'Path to Enlightenment should be the ideology');
    });

    test('should gain 2 consciousness when any player plays an event', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        const enlightenmentCard = createCardInstance(cardDefinitions['悟りの道'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = enlightenmentCard;
        gameState.all_card_instances[enlightenmentCard.instance_id] = enlightenmentCard;

        const eventCard = createCardInstance(cardDefinitions['大嵐'], p2.id);
        p2.hand.push(eventCard);
        gameState.all_card_instances[eventCard.instance_id] = eventCard;
        p2.scale = eventCard.required_scale;
        const initialConsciousness = p1.consciousness;

        gameState.current_turn = PlayerId.PLAYER2;
        let newState = playCard(gameState, PlayerId.PLAYER2, eventCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, initialConsciousness + 2, 'Consciousness should increase by 2');
    });

    test('should draw 1 card at the end of the turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const enlightenmentCard = createCardInstance(cardDefinitions['悟りの道'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = enlightenmentCard;
        gameState.all_card_instances[enlightenmentCard.instance_id] = enlightenmentCard;
        const peasant = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.deck = [peasant];
        gameState.all_card_instances[peasant.instance_id] = peasant;
        p1.hand = [];
        const initialHandCount = p1.hand.length;
        gameState.current_turn = PlayerId.PLAYER1;

        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, initialHandCount + 1, 'Hand size should increase by 1');
    });
});