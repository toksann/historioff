import { produce } from 'immer';
import { processEffects } from '../gameLogic/effectHandler';
import { EffectType, PlayerId, CardType } from '../gameLogic/constants';
import { createCardInstance, createInitialGameState } from '../gameLogic/gameUtils';
import assert from 'assert';

// Mock card definitions
const cardDefs = {
    '戦士': {
        name: '戦士',
        card_type: CardType.WEALTH,
        durability: 3,
        effects: [
            // Simplified effect for testing
            {
                trigger: 'END_TURN_OWNER',
                effect_type: 'PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH',
                args: {
                    player_ids: 'opponent',
                    amount: 1
                }
            }
        ]
    },
    '資源': {
        name: '資源',
        card_type: CardType.WEALTH,
        durability: 5,
        reactions: [
            {
                trigger: 'DAMAGE_THIS',
                effects: [
                    {
                        effect_type: 'ADD_CARD_TO_GAME',
                        args: {
                            player_id: 'opponent', // The one who damaged this card
                            card_template_name: 'マネー',
                            destination_pile: 'hand',
                            initial_durability: 'damage_this' // Special value
                        }
                    }
                ]
            }
        ]
    },
    'マネー': {
        name: 'マネー',
        card_type: CardType.WEALTH,
        durability: 1, // Default, will be overridden
    }
};

describe('Warrior Damage on Resource Card', () => {
    it('should decrease durability of Resource and give Money to the attacker', () => {
        // 1. Setup
        let gameState = createInitialGameState(PlayerId.PLAYER1, PlayerId.PLAYER2, cardDefs, {});

        const warriorCard = createCardInstance(cardDefs['戦士'], PlayerId.PLAYER1);
        const resourceCard = createCardInstance(cardDefs['資源'], PlayerId.PLAYER2);

        let nextState = produce(gameState, draft => {
            warriorCard.location = 'field';
            resourceCard.location = 'field';
            draft.players[PlayerId.PLAYER1].field.push(warriorCard);
            draft.players[PlayerId.PLAYER2].field.push(resourceCard);
            draft.all_card_instances[warriorCard.instance_id] = warriorCard;
            draft.all_card_instances[resourceCard.instance_id] = resourceCard;

            // Add damage effect directly to the queue
            draft.effect_queue.push([
                {
                    effect_type: EffectType.MODIFY_CARD_DURABILITY,
                    args: {
                        card_id: resourceCard.instance_id,
                        amount: -1, // Warrior deals 1 damage
                        source_card_id: warriorCard.instance_id
                    }
                },
                warriorCard
            ]);
        });

        // 2. Execution
        const finalState = processEffects(nextState, () => {});

        // 3. Assertion
        const finalResourceCard = finalState.all_card_instances[resourceCard.instance_id];
        const p1 = finalState.players[PlayerId.PLAYER1];

        // Assertion 1: Resource card's durability should be decreased.
        console.log(`Resource card durability: ${finalResourceCard.current_durability}`);
        assert.strictEqual(finalResourceCard.current_durability, 4, "Resource card's durability should be 4.");

        // Assertion 2: Attacker (Player 1) should receive a Money card.
        const moneyCardInHand = p1.hand.find(c => c.name === 'マネー');
        console.log(`Money card in hand: ${JSON.stringify(moneyCardInHand, null, 2)}`);
        assert.ok(moneyCardInHand, "Player 1 should have a Money card in hand.");

        // Assertion 3: The Money card's durability should equal the damage dealt.
        assert.strictEqual(moneyCardInHand.current_durability, 1, "Money card's durability should be 1.");
    });
});
