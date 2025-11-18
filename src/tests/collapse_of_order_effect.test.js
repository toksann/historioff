const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler');
const { playCard, resolveInput } = require('../gameLogic/main');
const { createTestGameState, createCardInstance } = require('./test_helpers');
const { PlayerId, Location, CardType } = require('../gameLogic/constants');

describe('秩序の瓦解 (Collapse of Order) Card Effect', () => {
    const cardDefinitions = {
        "秩序の瓦解": {
            "name": "秩序の瓦解",
            "card_type": "事象",
            "required_scale": 20,
            "description": "自分か相手のイデオロギーを捨て札にする。",
            "triggers": {
                "PLAY_EVENT_THIS": [
                    {
                        "effect_type": "PROCESS_CHOOSE_AND_DISCARD_IDEOLOGY",
                        "args": { "player_id": "self" }
                    }
                ]
            }
        },
        "イデオロギーA": { "name": "イデオロギーA", "card_type": CardType.IDEOLOGY },
        "イデオロギーB": { "name": "イデオロギーB", "card_type": CardType.IDEOLOGY },
    };

    test('should prompt choice and discard the chosen ideology', () => {
        // 1. Setup
        let gameState = createTestGameState(cardDefinitions);
        const p1 = gameState.players[PlayerId.PLAYER1];
        const p2 = gameState.players[PlayerId.PLAYER2];

        p1.scale = 20; // To meet the required_scale

        const collapseCard = createCardInstance(cardDefinitions['秩序の瓦解'], PlayerId.PLAYER1, { location: Location.HAND });
        const ideologyA = createCardInstance(cardDefinitions['イデオロギーA'], PlayerId.PLAYER1, { location: Location.FIELD });
        const ideologyB = createCardInstance(cardDefinitions['イデオロギーB'], PlayerId.PLAYER2, { location: Location.FIELD });

        p1.hand.push(collapseCard);
        p1.ideology = ideologyA;
        p2.ideology = ideologyB;
        gameState.all_card_instances[collapseCard.instance_id] = collapseCard;
        gameState.all_card_instances[ideologyA.instance_id] = ideologyA;
        gameState.all_card_instances[ideologyB.instance_id] = ideologyB;

        // 2. Execution - Play the card
        let nextState = playCard(gameState, PlayerId.PLAYER1, collapseCard.instance_id);
        nextState = processEffects(nextState);

        // 3. Verification - Check for input prompt
        assert.ok(nextState.awaiting_input, 'Game should be awaiting input');
        assert.strictEqual(nextState.awaiting_input.type, 'CHOICE_CARD_FOR_EFFECT', 'Awaiting input type should be CHOICE_CARD_FOR_EFFECT');
        assert.strictEqual(nextState.awaiting_input.options.length, 2, 'There should be two ideology cards to choose from');
        assert.deepStrictEqual(nextState.awaiting_input.options.map(c => c.name).sort(), ['イデオロギーA', 'イデオロギーB'], 'Options should be the two ideologies');

        // 4. Execution - Resolve input (choose opponent's ideology)
        const chosenCard = nextState.awaiting_input.options.find(c => c.owner === PlayerId.PLAYER2);
        nextState = resolveInput(nextState, chosenCard);
        
        // 5. Verification - Check the result
        const p1Final = nextState.players[PlayerId.PLAYER1];
        const p2Final = nextState.players[PlayerId.PLAYER2];
        const discardedIdeology = p2Final.discard.find(c => c.instance_id === ideologyB.instance_id);

        assert.strictEqual(p1Final.ideology.name, 'イデオロギーA', "Player 1's ideology should remain");
        assert.strictEqual(p2Final.ideology, null, "Player 2's ideology should be removed");
        assert.ok(discardedIdeology, "Player 2's ideology should be in their discard pile");
    });
});
