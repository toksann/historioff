const { playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, Location, EffectType, TriggerType } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');


describe('一神教 (Monotheism) Card Effect', () => {
    const cardDefinitions = {
        "一神教": {
            "name": "一神教",
            "card_type": "イデオロギー",
            "required_scale": 15,
            "description": "配置時、手札とデッキのすべてのイデオロギーカードを捨て札にし、デッキの一番下に「終末」を加える。ターン終了時、場の財が上限未満なら「聖典」を1枚手札に加える。このカードが捨て札になったとき、自分の規模が-10されるがこのカードは即座に手札に戻り必要規模を0にする。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    { "effect_type": "PROCESS_DISCARD_ALL_IDEOLOGY_FROM_HAND_AND_DECK", "args": { "player_id": "self" } },
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "終末", "destination_pile": "deck", "position": "bottom" } }
                ],
                "END_TURN_OWNER": [
                    { "effect_type": "ADD_CARD_TO_GAME", "args": { "player_id": "self", "card_template_name": "聖典", "destination_pile": "hand", "condition_field_wealth_slots_available": true } }
                ],
                "CARD_DISCARDED_THIS": [
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount": -10 } },
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "self", "source_pile": "discard", "destination_pile": "hand", "player_id": "self", "maintain": true } },
                    { "effect_type": "MODIFY_CARD_REQUIRED_SCALE", "args": { "card_id": "self", "amount": 0, "set_value": true } }
                ]
            }
        },
        "物質主義": { "name": "物質主義", "card_type": "イデオロギー" },
        "終末": { "name": "終末", "card_type": "事象" },
        "聖典": { "name": "聖典", "card_type": "財" },
        "戦士": { "name": "戦士", "card_type": "財" }
    };

    test('should discard other ideologies and add Apocalypse to deck on placement', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const monotheismCard = createCardInstance(cardDefinitions['一神教'], p1.id);
        const ideologyInHand = createCardInstance(cardDefinitions['物質主義'], p1.id);
        const ideologyInDeck = createCardInstance(cardDefinitions['物質主義'], p1.id);
        p1.hand = [monotheismCard, ideologyInHand];
        p1.deck = [ideologyInDeck];
        [monotheismCard, ideologyInHand, ideologyInDeck].forEach(c => gameState.all_card_instances[c.instance_id] = c);
        p1.scale = 15;

        let newState = playCard(gameState, PlayerId.PLAYER1, monotheismCard.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        expect(finalP1.discard.some(c => c.instance_id === ideologyInHand.instance_id)).toBeTruthy();
        expect(finalP1.discard.some(c => c.instance_id === ideologyInDeck.instance_id)).toBeTruthy();
        expect(finalP1.deck[finalP1.deck.length - 1].name).toBe('終末');
        expect(finalP1.ideology && finalP1.ideology.name === '一神教').toBeTruthy();
    });

    test('should add Sacred Scripture to hand at end of turn if field has space', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const monotheismCard = createCardInstance(cardDefinitions['一神教'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = monotheismCard;
        gameState.all_card_instances[monotheismCard.instance_id] = monotheismCard;
        p1.field_limit = 5;
        p1.field = [createCardInstance(cardDefinitions['戦士'], p1.id, { location: Location.FIELD })]; // 1 card, so space is available
        const initialHandCount = p1.hand.length;
        gameState.current_turn = PlayerId.PLAYER1;

        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        expect(finalP1.hand.length).toBe(initialHandCount + 1);
        expect(finalP1.hand.some(c => c.name === '聖典')).toBeTruthy();
    });

    test('should return to hand with 0 cost and reduce scale when discarded', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const monotheismCard = createCardInstance(cardDefinitions['一神教'], p1.id, { location: Location.IDEOLOGY, required_scale: 15 });
        p1.ideology = monotheismCard;
        gameState.all_card_instances[monotheismCard.instance_id] = monotheismCard;
        p1.scale = 20;
        const initialScale = p1.scale;

        // Manually trigger the discard effect
        p1.ideology = null;
        p1.discard.push(monotheismCard);
        monotheismCard.location = Location.DISCARD;
        const discardEffect = { effect_type: TriggerType.CARD_DISCARDED_THIS, args: { card_id: monotheismCard.instance_id, target_card_id: monotheismCard.instance_id, player_id: p1.id } };
        gameState.effect_queue.push([discardEffect, monotheismCard]);

        let newState = gameState;
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        const finalP1 = newState.players[PlayerId.PLAYER1];
        const returnedMonotheism = finalP1.hand.find(c => c.instance_id === monotheismCard.instance_id);

        expect(finalP1.scale).toBe(initialScale - 10);
        expect(returnedMonotheism).toBeTruthy();
        expect(returnedMonotheism.required_scale).toBe(0);
    });
});