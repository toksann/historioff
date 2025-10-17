import { playCard, endTurn, resolveInput } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { PlayerId, CardType } from '../gameLogic/constants.js';
import { deepCopy, createCardInstance } from '../gameLogic/gameUtils.js';

// Load definitions
import card_definitions_array from '../../public/card_definitions.json';
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    if (card['card-type']) {
        card.card_type = card['card-type'];
        delete card['card-type'];
    }
    acc[card.name] = card;
    return acc;
}, {});

const createInitialGameState = () => {
    let gameState = {
        players: {
            [PlayerId.PLAYER1]: {
                id: PlayerId.PLAYER1,
                consciousness: 50,
                scale: 10,
                hand: [],
                field: [],
                deck: [],
                discard: [],
                ideology: null,
                field_limit: 5,
                hand_limit: 7,
                cards_played_this_turn: 0,
            },
            [PlayerId.PLAYER2]: {
                id: PlayerId.PLAYER2,
                consciousness: 50,
                scale: 10,
                hand: [],
                field: [],
                deck: [],
                discard: [],
                ideology: null,
                field_limit: 5,
                hand_limit: 7,
                cards_played_this_turn: 0,
            },
        },
        current_turn: PlayerId.PLAYER1,
        turn_number: 1,
        effect_queue: [],
        reaction_queue: [],
        awaiting_input: null,
        game_over: false,
        winner: null,
        card_definitions: card_definitions_map,
        temp_effect_data: {},
    };
    return gameState;
};


describe('聖なる領域 カード効果テスト', () => {

    let processEffectsCounter;
    const PROCESS_EFFECTS_LIMIT = 500;

    beforeEach(() => {
        processEffectsCounter = 0;
    });

    const guardedProcessEffects = (gameState) => {
        processEffectsCounter++;
        if (processEffectsCounter > PROCESS_EFFECTS_LIMIT) {
            throw new Error(`processEffects was called more than ${PROCESS_EFFECTS_LIMIT} times. Infinite loop suspected.`);
        }
        return processEffects(gameState);
    };

    test('プレイ時：意識が+3される', () => {
        let gameState = createInitialGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];
        const initialConsciousness = p1.consciousness;

        // Add "聖なる領域" to hand
        const cardTemplate = card_definitions_map['聖なる領域'];
        const cardInstance = createCardInstance(cardTemplate, PlayerId.PLAYER1);
        p1.hand.push(cardInstance);

        // Play the card and process effects
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, cardInstance.instance_id);
        let finalState = guardedProcessEffects(stateAfterPlay);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const sacredDomainCard = finalP1.field.find(c => c.instance_id === cardInstance.instance_id);

        // Assertions
        expect(sacredDomainCard).toBeTruthy();
        expect(sacredDomainCard.name).toBe('聖なる領域');
        expect(finalP1.consciousness).toBe(initialConsciousness + 3);
    });

    test('ターン終了時：手札のイベントカードの必要規模が-1される', () => {
        let gameState = createInitialGameState();
        const p1 = gameState.players[PlayerId.PLAYER1];

        // Add "聖なる領域" to hand
        const sacredDomainTemplate = card_definitions_map['聖なる領域'];
        const sacredDomainInstance = createCardInstance(sacredDomainTemplate, PlayerId.PLAYER1);
        p1.hand.push(sacredDomainInstance);
        p1.scale = 10; // Ensure scale is sufficient
        
        // Play the card and process effects
        let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, sacredDomainInstance.instance_id);
        let stateWithSacredDomain = guardedProcessEffects(stateAfterPlay);

        // Add an Event card to hand
        const eventCardTemplate = card_definitions_map['大嵐']; // required_scale: 50
        const eventCardInstance = createCardInstance(eventCardTemplate, PlayerId.PLAYER1);
        stateWithSacredDomain.players[PlayerId.PLAYER1].hand.push(eventCardInstance);
        
        const initialRequiredScale = eventCardInstance.required_scale;

        // Set current turn to Player 1 and end it
        stateWithSacredDomain.current_turn = PlayerId.PLAYER1;
        let stateAfterEndTurn = endTurn(stateWithSacredDomain);
        // let stateAwaitingInput = guardedProcessEffects(stateAfterEndTurn); // この行を削除

        // Check if the game is awaiting input
        expect(stateAfterEndTurn.awaiting_input).toBeTruthy();
        expect(stateAfterEndTurn.awaiting_input.type).toBe('CHOICE_CARDS_FOR_OPERATION');
        
        // Simulate player choosing the event card
        const choiceOptions = stateAfterEndTurn.awaiting_input.options;
        const chosenCard = choiceOptions.find(c => c.instance_id === eventCardInstance.instance_id);
        expect(chosenCard).toBeTruthy();

        let stateAfterInput = resolveInput(stateAfterEndTurn, [chosenCard.instance_id]);
        let finalState = guardedProcessEffects(stateAfterInput);

        // Verify the required_scale of the event card
        const finalEventCard = finalState.players[PlayerId.PLAYER1].hand.find(c => c.instance_id === eventCardInstance.instance_id);
        expect(finalEventCard).toBeTruthy();
        expect(finalEventCard.required_scale).toBe(initialRequiredScale - 1);
    });
});