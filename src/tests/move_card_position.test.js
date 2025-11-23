import { processEffects } from '../gameLogic/effectHandler.js';
import { createTestGameState } from './test_helpers.js';
import { EffectType, PlayerId, Location } from '../gameLogic/constants.js';
import allCardDefs from '../../public/card_definitions.json';

const cardDefs = allCardDefs.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});

describe('MOVE_CARD with position argument', () => {
    let gameState;
    let player1;

    beforeEach(() => {
        gameState = createTestGameState(cardDefs);
        player1 = gameState.players[PlayerId.PLAYER1];
    });

    test('should move card to the top of the deck when position is "top"', () => {
        // Arrange
        const cardToMove = gameState.addCardToGameState(cardDefs['果実'], PlayerId.PLAYER1);
        const deckCard1 = gameState.addCardToGameState(cardDefs['農民'], PlayerId.PLAYER1);
        const deckCard2 = gameState.addCardToGameState(cardDefs['戦士'], PlayerId.PLAYER1);
        player1.hand.push(cardToMove);
        player1.deck.push(deckCard1, deckCard2);

        // Act
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: cardToMove.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DECK,
                player_id: PlayerId.PLAYER1,
                position: 'top',
            },
        }, null]);
        const newState = processEffects(gameState);

        // Assert
        expect(newState.players[PlayerId.PLAYER1].deck.length).toBe(3);
        expect(newState.players[PlayerId.PLAYER1].deck[0].instance_id).toBe(cardToMove.instance_id);
    });

    test('should move card to the bottom of the deck when position is "bottom"', () => {
        // Arrange
        const cardToMove = gameState.addCardToGameState(cardDefs['果実'], PlayerId.PLAYER1);
        const deckCard1 = gameState.addCardToGameState(cardDefs['農民'], PlayerId.PLAYER1);
        const deckCard2 = gameState.addCardToGameState(cardDefs['戦士'], PlayerId.PLAYER1);
        player1.hand.push(cardToMove);
        player1.deck.push(deckCard1, deckCard2);

        // Act
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: cardToMove.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DECK,
                player_id: PlayerId.PLAYER1,
                position: 'bottom',
            },
        }, null]);
        const newState = processEffects(gameState);

        // Assert
        expect(newState.players[PlayerId.PLAYER1].deck.length).toBe(3);
        expect(newState.players[PlayerId.PLAYER1].deck[2].instance_id).toBe(cardToMove.instance_id);
    });
    
    test('should move card to a random position in the deck when position is "random"', () => {
        // Arrange
        const cardToMove = gameState.addCardToGameState(cardDefs['果実'], PlayerId.PLAYER1);
        player1.hand.push(cardToMove);
        for (let i = 0; i < 10; i++) {
            const deckCard = gameState.addCardToGameState(cardDefs['農民'], PlayerId.PLAYER1, { instance_id: `deck_card_${i}`});
            player1.deck.push(deckCard);
        }

        // Act
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: cardToMove.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DECK,
                player_id: PlayerId.PLAYER1,
                position: 'random',
            },
        }, null]);
        const newState = processEffects(gameState);

        // Assert
        expect(newState.players[PlayerId.PLAYER1].deck.length).toBe(11);
        expect(newState.players[PlayerId.PLAYER1].deck.find(c => c.instance_id === cardToMove.instance_id)).toBeDefined();
    });

    test('should default to "random" when moving to deck without a position argument', () => {
        // Arrange
        const cardToMove = gameState.addCardToGameState(cardDefs['果実'], PlayerId.PLAYER1);
        player1.hand.push(cardToMove);
         for (let i = 0; i < 10; i++) {
            const deckCard = gameState.addCardToGameState(cardDefs['農民'], PlayerId.PLAYER1, { instance_id: `deck_card_${i}`});
            player1.deck.push(deckCard);
        }

        // Act
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: cardToMove.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DECK,
                player_id: PlayerId.PLAYER1,
            },
        }, null]);
        const newState = processEffects(gameState);

        // Assert
        expect(newState.players[PlayerId.PLAYER1].deck.length).toBe(11);
        expect(newState.players[PlayerId.PLAYER1].deck.find(c => c.instance_id === cardToMove.instance_id)).toBeDefined();
    });

    test('should default to "bottom" when moving to discard pile without a position argument', () => {
        // Arrange
        const cardToMove = gameState.addCardToGameState(cardDefs['果実'], PlayerId.PLAYER1);
        const discardCard = gameState.addCardToGameState(cardDefs['農民'], PlayerId.PLAYER1);
        player1.hand.push(cardToMove);
        player1.discard.push(discardCard);

        // Act
        gameState.effect_queue.push([{
            effect_type: EffectType.MOVE_CARD,
            args: {
                card_id: cardToMove.instance_id,
                source_pile: Location.HAND,
                destination_pile: Location.DISCARD,
                player_id: PlayerId.PLAYER1,
            },
        }, null]);
        const newState = processEffects(gameState);

        // Assert
        expect(newState.players[PlayerId.PLAYER1].discard.length).toBe(2);
        expect(newState.players[PlayerId.PLAYER1].discard[1].instance_id).toBe(cardToMove.instance_id);
    });
});
