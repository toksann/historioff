const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard, startTurn } = require('../gameLogic/main.js');

describe('ニューリベラリズム (New Liberalism) Card Effect', () => {

    const cardDefinitions = {
        "ニューリベラリズム": {
            name: "ニューリベラリズム",
            card_type: CardType.IDEOLOGY,
            required_scale: 25,
            description: "ターン開始時「解体」と「マネー」を1枚ずつ手札に加える。「マネー」を出すたびカードを1枚引き、自分の意識+1。",
            triggers: {
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: "ADD_CARD_TO_GAME",
                        args: {
                            player_id: "self",
                            card_template_name: "解体",
                            destination_pile: "hand"
                        }
                    },
                    {
                        effect_type: "ADD_CARD_TO_GAME",
                        args: {
                            player_id: "self",
                            card_template_name: "マネー",
                            destination_pile: "hand",
                            initial_durability: 1
                        }
                    }
                ],
                [TriggerType.CARD_PLACED_OWNER]: [
                    {
                        effect_type: "MOVE_CARD",
                        args: {
                            card_id: "draw_from_deck",
                            source_pile: "deck",
                            destination_pile: "hand",
                            player_id: "self"
                        }
                    },
                    {
                        effect_type: "MODIFY_CONSCIOUSNESS_RESERVE",
                        args: {
                            player_id: "self",
                            amount: 1
                        }
                    }
                ]
            },
            is_token: true
        },
        "解体": {
            name: "解体",
            card_type: CardType.EVENT, // Corrected to EVENT as per its likely function
            required_scale: 2,
            description: "テスト用「解体」カード",
        },
        "マネー": {
            name: "マネー",
            card_type: CardType.WEALTH,
            required_scale: 0,
            description: "テスト用「マネー」カード",
        },
        "デッキのカード": {
            name: "デッキのカード",
            card_type: CardType.WEALTH,
            required_scale: 0,
            description: "デッキにあるテスト用カード",
        }
    };

    // Test for the start of turn effect
    test('should add "解体" and "マネー" to hand at the start of the turn', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const newLiberalismCard = createCardInstance(cardDefinitions['ニューリベラリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = newLiberalismCard;
        gameState.all_card_instances[newLiberalismCard.instance_id] = newLiberalismCard;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const deconstructionInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === '解体');
        const moneyInHand = finalState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー');
        
        assert.ok(deconstructionInHand, '"解体" should be in hand');
        assert.ok(moneyInHand, '"マネー" should be in hand');
    });

    // Test for the effect when a "Money" card is played
    test('should draw a card and increase consciousness by 1 when a "マネー" card is played', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        
        // Add a card to the deck to be drawn
        const deckCard = createCardInstance(cardDefinitions['デッキのカード'], PlayerId.PLAYER1, { location: Location.DECK });
        p1.deck.push(deckCard);
        gameState.all_card_instances[deckCard.instance_id] = deckCard;

        const newLiberalismCard = createCardInstance(cardDefinitions['ニューリベラリズム'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = newLiberalismCard;
        gameState.all_card_instances[newLiberalismCard.instance_id] = newLiberalismCard;

        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const initialConsciousness = p1.consciousness;
        const initialHandSize = p1.hand.length;
        const initialDeckSize = p1.deck.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, moneyCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }
        
        const p1Final = finalState.players[PlayerId.PLAYER1];

        // Hand size should increase by 1 (draw) and decrease by 1 (play) -> same as initial
        assert.strictEqual(p1Final.hand.length, initialHandSize, 'Hand size should remain the same');
        assert.strictEqual(p1Final.deck.length, initialDeckSize - 1, 'Deck size should decrease by 1');
        assert.strictEqual(p1Final.consciousness, initialConsciousness + 1, 'Consciousness should increase by 1');
    });
});