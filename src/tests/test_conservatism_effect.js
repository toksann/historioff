import { initializeGame } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { createTestGameState, expectGameStateToMatch } from './test_helpers.js';
import { EffectType, TriggerType, PlayerId, CardType, Location } from '../gameLogic/constants.js';
import allCardDefs from '../../public/card_definitions.json';

const cardDefs = allCardDefs.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('保守主義 (Conservatism) Effect', () => {
    let gameState;
    let player1, player2;

    beforeEach(() => {
        gameState = createTestGameState(cardDefs);
        player1 = gameState.players[PlayerId.PLAYER1];
        player2 = gameState.players[PlayerId.PLAYER2];
    });

    // Test case 1: CARD_PLACED_THIS
    test('CARD_PLACED_THIS: When Conservatism is placed, it adds Bureaucracy to hand', () => {
        // Arrange
        const conservatismCard = {
            ...cardDefs['保守主義'],
            instance_id: 'conservatism_1',
            owner: PlayerId.PLAYER1,
            location: Location.HAND,
        };
        player1.hand.push(conservatismCard);
        gameState.all_card_instances[conservatismCard.instance_id] = conservatismCard;

        const initialPlayer1HandSize = player1.hand.length;

        // Act: Play Conservatism
        gameState.effect_queue.push([{
            effect_type: EffectType.PLAYER_ACTION,
            args: {
                player_id: PlayerId.PLAYER1,
                action_type: 'play_card',
                card_id: conservatismCard.instance_id,
            },
        }, null]);
        processEffects(gameState);

        // Assert
        expect(player1.hand.find(c => c.name === '官僚主義')).toBeDefined();
        expect(player1.hand.length).toBe(initialPlayer1HandSize); // Conservatism moves to field, Bureaucracy added to hand
        expect(player1.ideology.instance_id).toBe('conservatism_1');
        expect(gameState.all_card_instances['conservatism_1'].location).toBe(Location.FIELD);
    });

    // Test case 2: MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER
    test('MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER: Reduces consciousness decrease effect by 1', () => {
        // Arrange
        const conservatismCard = {
            ...cardDefs['保守主義'],
            instance_id: 'conservatism_1',
            owner: PlayerId.PLAYER1,
            location: Location.FIELD, // Assume already placed
        };
        player1.ideology = conservatismCard;
        gameState.all_card_instances[conservatismCard.instance_id] = conservatismCard;
        player1.consciousness = 10; // Initial consciousness

        // Act: Trigger a consciousness decrease of 5
        gameState.effect_queue.push([{
            effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
            args: {
                player_id: PlayerId.PLAYER1,
                amount: -5,
            },
        }, null]);
        processEffects(gameState);

        // Assert: Expect consciousness to decrease by 4 (5 - 1)
        expect(player1.consciousness).toBe(6);
    });

    // Test case 3: MODIFY_SCALE_INCREASE_RESERVE_OWNER
    test('MODIFY_SCALE_INCREASE_RESERVE_OWNER: Reduces scale increase effect by 1', () => {
        // Arrange
        const conservatismCard = {
            ...cardDefs['保守主義'],
            instance_id: 'conservatism_1',
            owner: PlayerId.PLAYER1,
            location: Location.FIELD, // Assume already placed
        };
        player1.ideology = conservatismCard;
        gameState.all_card_instances[conservatismCard.instance_id] = conservatismCard;
        player1.scale = 10; // Initial scale

        // Act: Trigger a scale increase of 5
        gameState.effect_queue.push([{
            effect_type: EffectType.MODIFY_SCALE_RESERVE,
            args: {
                player_id: PlayerId.PLAYER1,
                amount: 5,
            },
        }, null]);
        processEffects(gameState);

        // Assert: Expect scale to increase by 4 (5 - 1)
        expect(player1.scale).toBe(14);
    });

    // Test case 4: END_TURN_OWNER
    test('END_TURN_OWNER: Returns a random card from discard to hand', () => {
        // Arrange
        const conservatismCard = {
            ...cardDefs['保守主義'],
            instance_id: 'conservatism_1',
            owner: PlayerId.PLAYER1,
            location: Location.FIELD, // Assume already placed
        };
        player1.ideology = conservatismCard;
        gameState.all_card_instances[conservatismCard.instance_id] = conservatismCard;

        const discardedCard = { ...cardDefs['果実'], instance_id: 'discarded_1', owner: PlayerId.PLAYER1, location: Location.DISCARD };
        player1.discard.push(discardedCard);
        gameState.all_card_instances[discardedCard.instance_id] = discardedCard;

        const initialPlayer1HandSize = player1.hand.length;
        const initialPlayer1DiscardSize = player1.discard.length;

        // Act: End turn
        gameState.effect_queue.push([{
            effect_type: TriggerType.END_TURN_OWNER,
            args: {
                player_id: PlayerId.PLAYER1,
            },
        }, null]);
        processEffects(gameState);

        // Assert
        expect(player1.hand.length).toBe(initialPlayer1HandSize + 1);
        expect(player1.discard.length).toBe(initialPlayer1DiscardSize - 1);
        expect(player1.hand.find(c => c.instance_id === 'discarded_1')).toBeDefined();
    });
});