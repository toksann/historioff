const assert = require('assert');
const { playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, Location } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');
const { createTestGameState, createCardInstance } = require('./test_helpers');

describe('多文化主義 (Multiculturalism) Card Effect', () => {
    const cardDefinitions = {
        "多文化主義": {
            "name": "多文化主義",
            "card_type": "イデオロギー",
            "required_scale": 8,
            "description": "配置時自分の意識を-50%（切捨て）、規模を+100%。ターン終了ごとに手札を2枚引く。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    { "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "self", "amount_percentage": -50, "round_down": true } },
                    { "effect_type": "MODIFY_SCALE_RESERVE", "args": { "player_id": "self", "amount_percentage": 100 } }
                ],
                "END_TURN_OWNER": [
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" } },
                    { "effect_type": "MOVE_CARD", "args": { "card_id": "draw_from_deck", "source_pile": "deck", "destination_pile": "hand", "player_id": "self" } }
                ]
            }
        },
        "農民": { "name": "農民", "card_type": "財", "required_scale": 0, "durability": 1 }
    };

    test('should halve consciousness and double scale on placement', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        const multiculturalismCard = createCardInstance(cardDefinitions['多文化主義'], p1.id);
        p1.hand.push(multiculturalismCard);
        gameState.all_card_instances[multiculturalismCard.instance_id] = multiculturalismCard;

        p1.scale = 10;
        p1.consciousness = 21; // To test rounding down
        const initialScale = p1.scale;

        // 2. Execution
        let newState = playCard(gameState, PlayerId.PLAYER1, multiculturalismCard.instance_id);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.consciousness, 11, 'Consciousness should be halved and rounded down (21 -> 11)');
        assert.strictEqual(finalP1.scale, initialScale * 2, 'Scale should be doubled');
        assert.ok(finalP1.ideology && finalP1.ideology.name === '多文化主義', 'The card should be set as the ideology');
    });

    test('should draw 2 cards at the end of the turn', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const multiculturalismCard = createCardInstance(cardDefinitions['多文化主義'], p1.id, { location: Location.IDEOLOGY });
        p1.ideology = multiculturalismCard;
        gameState.all_card_instances[multiculturalismCard.instance_id] = multiculturalismCard;

        const peasant1 = createCardInstance(cardDefinitions['農民'], p1.id);
        const peasant2 = createCardInstance(cardDefinitions['農民'], p1.id);
        const peasant3 = createCardInstance(cardDefinitions['農民'], p1.id);
        p1.deck = [peasant1, peasant2, peasant3];
        gameState.all_card_instances[peasant1.instance_id] = peasant1;
        gameState.all_card_instances[peasant2.instance_id] = peasant2;
        gameState.all_card_instances[peasant3.instance_id] = peasant3;
        p1.hand = []; // Start with an empty hand

        const initialHandCount = p1.hand.length;
        gameState.current_turn = PlayerId.PLAYER1;

        // 2. Execution
        let newState = endTurn(gameState);
        while (newState.effect_queue.length > 0) {
            newState = processEffects(newState);
        }

        // 3. Verification
        const finalP1 = newState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, initialHandCount + 2, 'Hand size should increase by 2');
    });
});
