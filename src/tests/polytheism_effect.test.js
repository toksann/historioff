const assert = require('assert');
const { playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('多神教 (Polytheism) Card Effect', () => {
    const cardDefinitions = {
        "多神教": {
            "name": "多神教",
            "card_type": "イデオロギー",
            "required_scale": 10,
            "description": "ターン終了ごとに意識を+1し、デッキからランダムな事象カードを1枚手札に加えて必要規模を-50%する。事象カード使用時、捨て札の事象カードをランダムに1枚デッキに戻す",
            "triggers": {
                "END_TURN_OWNER": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount": 1 } },
                    { "effect_type": "PROCESS_DRAW_RANDOM_CARD_AND_MODIFY_REQUIRED_SCALE", "args": { "player_id": "self", "card_type": "事象", "amount": 1, "scale_reduction_percentage": 50, "round_down": true } }
                ],
                "PLAY_EVENT_OWNER": [
                    { "effect_type": "PROCESS_CARD_OPERATION", "args": { "player_id": "self", "operation": "move", "source_piles": ["discard"], "destination_pile": "deck", "card_type": "事象", "count": 1, "selection_method": "random" } }
                ]
            }
        },
        "大嵐": { "name": "大嵐", "card_type": "事象", "required_scale": 50 },
        "豊作": { "name": "豊作", "card_type": "事象", "required_scale": 0 },
        "移民": { "name": "移民", "card_type": "事象", "required_scale": 0 }
    };

    test('should draw and discount an event card at the end of the turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const polytheismCard = createCardInstance(cardDefinitions['多神教'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = polytheismCard;
        gameState.all_card_instances[polytheismCard.instance_id] = polytheismCard;
        gameState.current_turn = PlayerId.PLAYER1;

        const eventCard = createCardInstance(cardDefinitions['大嵐'], p1.id); // required_scale: 50
        const dummyCard = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.deck = [eventCard, dummyCard];
        gameState.all_card_instances[eventCard.instance_id] = eventCard;
        gameState.all_card_instances[dummyCard.instance_id] = dummyCard;
        p1.hand = [];
        const initialConsciousness = p1.consciousness;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const drawnCard = finalP1.hand.find(c => c.name === '大嵐');

        assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
        assert.ok(drawnCard, 'An event card should be drawn');
        assert.strictEqual(drawnCard.required_scale, 25, 'Drawn event card cost should be halved (50 -> 25)');
    });

    test('should return 1 random event card from discard to deck when playing an event', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const polytheismCard = createCardInstance(cardDefinitions['多神教'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = polytheismCard;
        gameState.all_card_instances[polytheismCard.instance_id] = polytheismCard;

        const eventInDiscard = createCardInstance(cardDefinitions['豊作'], p1.id, { location: Location.DISCARD });
        p1.discard = [eventInDiscard];
        gameState.all_card_instances[eventInDiscard.instance_id] = eventInDiscard;

        const eventToPlay = createCardInstance(cardDefinitions['移民'], p1.id);
        p1.hand = [eventToPlay];
        gameState.all_card_instances[eventToPlay.instance_id] = eventToPlay;
        p1.scale = eventToPlay.required_scale;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, eventToPlay.instance_id);
        while (newState.effect_queue.length > 0) { newState = processEffects(newState); }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        const returnedCardInDeck = finalP1.deck.find(c => c.instance_id === eventInDiscard.instance_id);
        const cardInDiscard = finalP1.discard.find(c => c.instance_id === eventInDiscard.instance_id);

        assert.ok(returnedCardInDeck, 'The event card from discard should be returned to the deck');
        assert.ok(!cardInDiscard, 'The event card should no longer be in the discard pile');
    });
});
