import { initializeGame } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { createTestGameState, expectGameStateToMatch } from './test_helpers.js';
import { EffectType, TriggerType, PlayerId, CardType, Location } from '../gameLogic/constants.js';
import allCardDefs from '../../public/card_definitions.json';

const cardDefs = allCardDefs.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('官僚主義 (Bureaucracy) Effect', () => {
    let gameState;
    let player1, player2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefs);
        player1 = gameState.players[PlayerId.PLAYER1];
        player2 = gameState.players[PlayerId.PLAYER2];
    });

    test('PLAY_EVENT_THIS: When 官僚主義 is played, it moves to opponent\'s hand', () => {
        // Arrange
        const bureaucracyCard = {
            ...cardDefs['官僚主義'],
            instance_id: 'bureaucracy_1',
            owner: PlayerId.PLAYER1,
            location: Location.HAND,
        };
        player1.hand.push(bureaucracyCard);
        gameState.all_card_instances[bureaucracyCard.instance_id] = bureaucracyCard;

        const initialPlayer1HandSize = player1.hand.length;
        const initialPlayer2HandSize = player2.hand.length;

        // Simulate playing the card
        gameState.effect_queue.push([{
            effect_type: EffectType.PLAYER_ACTION,
            args: {
                player_id: PlayerId.PLAYER1,
                action_type: 'play_card',
                card_id: bureaucracyCard.instance_id,
            },
        }, null]);
        processEffects(gameState);

        // Assert
        expect(player1.hand.find(c => c.instance_id === 'bureaucracy_1')).toBeUndefined();
        expect(player2.hand.find(c => c.instance_id === 'bureaucracy_1')).toBeDefined();
        expect(player1.hand.length).toBe(initialPlayer1HandSize - 1);
        expect(player2.hand.length).toBe(initialPlayer2HandSize + 1);
        expect(gameState.all_card_instances['bureaucracy_1'].location).toBe(Location.HAND);
        expect(gameState.all_card_instances['bureaucracy_1'].owner).toBe(PlayerId.PLAYER2);
    });

    test('CARD_DISCARDED_OWNER: When owner discards an IDEOLOGY card, bureaucracy is also discarded', () => {
        // Arrange
        const bureaucracyCard = { ...cardDefs['官僚主義'], instance_id: 'bureaucracy_1', owner: PlayerId.PLAYER1, location: Location.HAND };
        const ideologyCard = { ...cardDefs['理想主義'], instance_id: 'ideology_1', owner: PlayerId.PLAYER1, location: Location.HAND };
        player1.hand.push(bureaucracyCard, ideologyCard);
        gameState.all_card_instances[bureaucracyCard.instance_id] = bureaucracyCard;
        gameState.all_card_instances[ideologyCard.instance_id] = ideologyCard;

        // Act: Discard the ideology card
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: ideologyCard.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DISCARD,
                player_id: PlayerId.PLAYER1,
            }
        }, null]);
        processEffects(gameState);

        // Assert
        // Both cards should be in the discard pile
        expect(player1.hand.length).toBe(0);
        expect(player1.discard.length).toBe(2);
        expect(player1.discard.find(c => c.instance_id === 'bureaucracy_1')).toBeDefined();
        expect(player1.discard.find(c => c.instance_id === 'ideology_1')).toBeDefined();
    });

    test('CARD_DISCARDED_OWNER: When owner discards a NON-IDEOLOGY card, bureaucracy remains in hand', () => {
        // Arrange
        const bureaucracyCard = { ...cardDefs['官僚主義'], instance_id: 'bureaucracy_1', owner: PlayerId.PLAYER1, location: Location.HAND };
        const wealthCard = { ...cardDefs['果実'], instance_id: 'wealth_1', owner: PlayerId.PLAYER1, location: Location.HAND };
        player1.hand.push(bureaucracyCard, wealthCard);
        gameState.all_card_instances[bureaucracyCard.instance_id] = bureaucracyCard;
        gameState.all_card_instances[wealthCard.instance_id] = wealthCard;

        // Act: Discard the wealth card
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: wealthCard.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DISCARD,
                player_id: PlayerId.PLAYER1,
            }
        }, null]);
        processEffects(gameState);

        // Assert
        // Bureaucracy should remain in hand, wealth card should be in discard pile
        expect(player1.hand.length).toBe(1);
        expect(player1.discard.length).toBe(1);
        expect(player1.hand[0].instance_id).toBe('bureaucracy_1');
        expect(player1.discard[0].instance_id).toBe('wealth_1');
    });
});