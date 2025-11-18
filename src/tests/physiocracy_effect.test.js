const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, EffectType, Location, TriggerType, CardType } = require('../gameLogic/constants');

describe('重農主義 (Physiocracy) Card Effect', () => {
    const cardDefinitions = {
        "重農主義": {
            "name": "重農主義",
            "card_type": CardType.IDEOLOGY,
            "required_scale": 10,
            "triggers": {
                "START_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_CARD_DURABILITY_RESERVE",
                        "args": {
                            "card_id": "self_money_on_field",
                            "amount": -1,
                            "condition_money_on_field": true
                        }
                    }
                ],
                "SUCCESS_PROCESS": [ // This is triggered by MODIFY_CARD_DURABILITY_RESERVE's SUCCESS_PROCESS
                    {
                        "effect_type": "MOVE_CARD",
                        "args": {
                            "card_id": "draw_from_deck",
                            "source_pile": "deck",
                            "destination_pile": "hand",
                            "player_id": "self",
                            "condition_money_on_field": true
                        }
                    }
                ],
                "END_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_ADD_MONEY_TOKEN_BASED_ON_CARDS_PLAYED",
                        "args": { "player_id": "self" }
                    }
                ]
            }
        },
        "マネー": { "name": "マネー", "card_type": CardType.WEALTH, "is_token": true, "durability": 100 },
        "デッキカード1": { "name": "デッキカード1", "card_type": CardType.WEALTH },
        "デッキカード2": { "name": "デッキカード2", "card_type": CardType.WEALTH },
        "プレイされたカード1": { "name": "プレイされたカード1", "card_type": CardType.EVENT },
        "プレイされたカード2": { "name": "プレイされたカード2", "card_type": CardType.EVENT },
    };

    let gameState;

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 10; // To play Physiocracy
        const physiocracyCard = createCardInstance(cardDefinitions['重農主義'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = physiocracyCard;
        gameState.all_card_instances[physiocracyCard.instance_id] = physiocracyCard;
    });

    test('should decrease Money durability and draw a card at turn start', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        const moneyCard = createCardInstance(cardDefinitions['マネー'], PlayerId.PLAYER1, { location: Location.FIELD, current_durability: 10 });
        const deckCard = createCardInstance(cardDefinitions['デッキカード1'], PlayerId.PLAYER1, { location: Location.DECK });
        p1.field.push(moneyCard);
        p1.deck.push(deckCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;
        gameState.all_card_instances[deckCard.instance_id] = deckCard;

        const initialMoneyDurability = moneyCard.current_durability;
        const initialHandSize = p1.hand.length;
        const initialDeckSize = p1.deck.length;

        // 2. Execution - Trigger START_TURN_OWNER
        let nextState = processEffects({
            ...gameState,
            effect_queue: [[{ effect_type: TriggerType.START_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 } }, null]]
        });

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const moneyCardFinal = p1Final.field.find(c => c.instance_id === moneyCard.instance_id);

        assert.strictEqual(moneyCardFinal.current_durability, initialMoneyDurability - 1, 'Money durability should decrease by 1');
        assert.strictEqual(p1Final.hand.length, initialHandSize + 1, 'Player 1 should draw one card');
        assert.strictEqual(p1Final.deck.length, initialDeckSize - 1, 'Player 1\'s deck should decrease by one card');
    });

    test('should add Money based on cards played this turn at turn end', () => {
        // 1. Setup
        const p1 = gameState.players[PlayerId.PLAYER1];
        p1.cards_played_this_turn = 2; // Simulate 2 cards played this turn
        const initialHandSize = p1.hand.length;

        // 2. Execution - Trigger END_TURN_OWNER
        let nextState = processEffects({
            ...gameState,
            effect_queue: [[{ effect_type: TriggerType.END_TURN_OWNER, args: { player_id: PlayerId.PLAYER1, target_player_id: PlayerId.PLAYER1 } }, null]]
        });

        // 3. Verification
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const moneyCard = p1Final.hand.find(c => c.name === 'マネー');

        assert.strictEqual(p1Final.hand.length, initialHandSize + 1, 'Player 1 should have one more card in hand');
        assert.ok(moneyCard, 'A Money card should be added to hand');
        assert.strictEqual(moneyCard.current_durability, 2, 'Money durability should equal cards played this turn');
    });
});
