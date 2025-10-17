const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { playCard } = require('../gameLogic/main.js');

describe('記憶の浄化 (Memory Purification) Card Effect', () => {

    beforeEach(() => {
        global.testHooks = {};
    });

    afterEach(() => {
        delete global.testHooks;
    });

    const cardDefinitions = {
        "記憶の浄化": {
            name: "記憶の浄化",
            card_type: CardType.EVENT,
            required_scale: 15,
            description: "捨て札の事象カードを最大3枚まで除外し、除外した枚数×2だけ自分の意識をプラスする。",
            triggers: {
                [TriggerType.PLAY_EVENT_THIS]: [
                    {
                        effect_type: EffectType.PROCESS_CARD_OPERATION,
                        args: {
                            player_id: "self",
                            operation: "remove",
                            source_pile: "discard",
                            card_type: CardType.EVENT,
                            count: 3,
                            selection_method: "random",
                            store_count_key: "purified_event_count"
                        }
                    },
                    {
                        effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
                        args: {
                            player_id: "self",
                            amount_based_on_temp_value: "purified_event_count"
                        }
                    },
                    {
                        effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
                        args: {
                            player_id: "self",
                            amount_based_on_temp_value: "purified_event_count"
                        }
                    }
                ]
            }
        },
        "ダミー事象1": { name: "ダミー事象1", card_type: CardType.EVENT, required_scale: 0 },
        "ダミー事象2": { name: "ダミー事象2", card_type: CardType.EVENT, required_scale: 0 },
        "ダミー事象3": { name: "ダミー事象3", card_type: CardType.EVENT, required_scale: 0 },
        "ダミー事象4": { name: "ダミー事象4", card_type: CardType.EVENT, required_scale: 0 },
        "ダミー事象5": { name: "ダミー事象5", card_type: CardType.EVENT, required_scale: 0 },
        "農民": { name: "農民", card_type: CardType.WEALTH, required_scale: 0 },
        "反応イデオロギー": {
            name: "反応イデオロギー",
            card_type: CardType.IDEOLOGY,
            required_scale: 0,
            triggers: {
                [TriggerType.MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER]: [
                    { effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: "self", amount: 1 } }
                ]
            }
        }
    };

    test('should remove up to 3 event cards and increase consciousness by count * 2', () => {
        let removedCardCount = 0;
        global.testHooks.onCardRemoved = () => {
            removedCardCount++;
        };

        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;
        const initialConsciousness = p1.consciousness;

        // Add 5 event cards and 1 wealth card to discard pile
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象1'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象2'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象3'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象4'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象5'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['農民'], PlayerId.PLAYER1));
        
        const purificationCard = createCardInstance(cardDefinitions['記憶の浄化'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(purificationCard);

        let nextState = playCard(gameState, PlayerId.PLAYER1, purificationCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const remainingEvents = finalP1.discard.filter(c => c.card_type === CardType.EVENT).length;
        const remainingWealth = finalP1.discard.filter(c => c.card_type === CardType.WEALTH).length;

        assert.strictEqual(removedCardCount, 3, "Should have removed 3 event cards");
        assert.strictEqual(remainingWealth, 1, "Should not remove non-event cards");
        assert.strictEqual(finalP1.consciousness, initialConsciousness + (3 * 2), "Consciousness should increase by 6 (3 removed * 2)");
    });

    test('should trigger subsequent effects twice', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;
        const initialScale = p1.scale;

        // Add a reaction ideology to the field
        const reactionIdeology = createCardInstance(cardDefinitions['反応イデオロギー'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.ideology = reactionIdeology;

        // Add 2 event cards to discard pile
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象1'], PlayerId.PLAYER1));
        p1.discard.push(createCardInstance(cardDefinitions['ダミー事象2'], PlayerId.PLAYER1));
        
        const purificationCard = createCardInstance(cardDefinitions['記憶の浄化'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(purificationCard);

        let nextState = playCard(gameState, PlayerId.PLAYER1, purificationCard.instance_id);
        let finalState = nextState;
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        // Consciousness increases by 2 (removed) * 2 = 4
        // Scale should increase by 1 for each consciousness increase effect = 2
        assert.strictEqual(finalP1.scale, initialScale + 2, "Scale should increase by 2 due to two separate consciousness increase effects");
    });
});