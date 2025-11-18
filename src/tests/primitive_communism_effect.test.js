import { initializeGame, playCard, startTurn } from '../gameLogic/main.js';
import { processEffects } from '../gameLogic/effectHandler.js';
import { EffectType, TriggerType, CardLocation, CardType, PlayerId } from '../gameLogic/constants.js';
import { createTestGameState, createCardInstance } from './test_helpers';

describe('Primitive Communism Card Effects', () => {
    let gameState;
    let player1Id, player2Id;

    const cardDefinitions = {
        "原始共産制": {
            "name": "原始共産制",
            "card_type": "イデオロギー",
            "required_scale": 0,
            "description": "配置時、自分の場のすべての財に1ダメージ。ターン終了時、自分の手札の財カードをすべて捨ててその枚数デッキからカードを引き、相手の場のすべての財に1ダメージ。ターン開始時、自分の場の財が2枚未満なら「農民」を配置する。これが配置中、自分は場に財カードを配置できなくなる。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        "args": {
                            "player_ids": "self",
                            "amount": 1
                        }
                    }
                ],
                "START_TURN_OWNER": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "self",
                            "card_template_name": "農民",
                            "destination_pile": "field",
                            "condition_field_wealth_limit": 2
                        }
                    }
                ],
                "END_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_DISCARD_ALL_HAND_WEALTH_CARDS_AND_DRAW",
                        "args": {
                            "player_id": "self",
                            "draw_based_on_discarded": true
                        }
                    },
                    {
                        "effect_type": "PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH",
                        "args": {
                            "player_ids": "opponent",
                            "amount": 1
                        }
                    }
                ]
            }
        },
        "マネー": {
            "name": "マネー",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "description": "自分のターン中は場のこのカードの耐久値を追加の規模とみなす。このカードが手札に戻るとき耐久値は維持される。ターン開始時、このカードの耐久値が30以上のとき、手札から必要規模の最も少ない(同じならランダム)カード2枚を捨て札にしてから、このカードを手札に戻し「資本主義」を1枚手札に加える。このカードが場に出るとき、既に他の「マネー」が配置されているなら、このカードを捨て札にしてこのカードの耐久値と同じ値を他の「マネー」の耐久値に加算する。",
            "triggers": {
                "CARD_PLACED_THIS": [
                    {
                        "effect_type": "PROCESS_MONEY_CARD_PLACEMENT_EFFECT",
                        "args": {
                            "player_id": "self",
                            "card_id": "self"
                        }
                    }
                ],
                "START_TURN_OWNER": [
                    {
                        "effect_type": "PROCESS_MONEY_CARD_TURN_START_EFFECT",
                        "args": {
                            "player_id": "self",
                            "card_id": "self",
                            "condition_durability_ge_30": true
                        }
                    }
                ]
            },
            "is_token": true
        },
        "農民": {
            "name": "農民",
            "card_type": "財",
            "required_scale": 0,
            "durability": 1,
            "description": "ターン終了時に自分の規模+1。耐久値が0になったとき「農民」を手札に加える。",
            "triggers": {
                "END_TURN_OWNER": [
                    {
                        "effect_type": "MODIFY_SCALE_RESERVE",
                        "args": {
                            "player_id": "self",
                            "amount": 1
                        }
                    }
                ],
                "WEALTH_DURABILITY_ZERO_THIS": [
                    {
                        "effect_type": "ADD_CARD_TO_GAME",
                        "args": {
                            "player_id": "self",
                            "card_template_name": "農民",
                            "destination_pile": "hand"
                        }
                    }
                ]
            }
        }
    };

    beforeEach(() => {
        gameState = createTestGameState(cardDefinitions);
        player1Id = gameState.players[PlayerId.PLAYER1].id;
        player2Id = gameState.players[PlayerId.PLAYER2].id;

        const primitiveCommunismTemplate = cardDefinitions['原始共産制'];
        const primitiveCommunismCard = createCardInstance(primitiveCommunismTemplate, player1Id);
        gameState.players[PlayerId.PLAYER1].hand.push(primitiveCommunismCard);
        gameState.all_card_instances[primitiveCommunismCard.instance_id] = primitiveCommunismCard;
    });

    test("1. Primitive Communism's effect triggers on owner's turn start", () => {
        const primitiveCommunismTemplate = cardDefinitions['原始共産制'];
        const primitiveCommunismCard = createCardInstance(primitiveCommunismTemplate, player1Id);
        gameState.all_card_instances[primitiveCommunismCard.instance_id] = primitiveCommunismCard;
        gameState.players[PlayerId.PLAYER1].ideology = primitiveCommunismCard;
        primitiveCommunismCard.location = 'field';

        const initialFieldCount = gameState.players[PlayerId.PLAYER1].field.length;

        gameState.current_turn = player1Id;
        let finalState = startTurn(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        expect(finalState.players[PlayerId.PLAYER1].field.length).toBe(initialFieldCount + 1);
        const addedCard = finalState.players[PlayerId.PLAYER1].field[finalState.players[PlayerId.PLAYER1].field.length - 1];
        expect(addedCard.name).toBe('農民');
    });

    test("2. Primitive Communism's effect does not trigger on subsequent turns if wealth count is 2 or more", () => {
        const primitiveCommunismTemplate = cardDefinitions['原始共産制'];
        const primitiveCommunismCard = createCardInstance(primitiveCommunismTemplate, player1Id);
        gameState.all_card_instances[primitiveCommunismCard.instance_id] = primitiveCommunismCard;
        gameState.players[PlayerId.PLAYER1].ideology = primitiveCommunismCard;
        primitiveCommunismCard.location = 'field';

        const peasantTemplate = cardDefinitions['農民'];
        const peasant1 = createCardInstance(peasantTemplate, player1Id);
        const peasant2 = createCardInstance(peasantTemplate, player1Id);
        gameState.players[PlayerId.PLAYER1].field.push(peasant1, peasant2);
        gameState.all_card_instances[peasant1.instance_id] = peasant1;
        gameState.all_card_instances[peasant2.instance_id] = peasant2;

        const initialFieldCount = gameState.players[PlayerId.PLAYER1].field.length;

        gameState.current_turn = player1Id;
        let finalState = startTurn(gameState);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        expect(finalState.players[PlayerId.PLAYER1].field.length).toBe(initialFieldCount);
    });

    test('3. Primitive Communism prevents playing wealth cards when on field', () => {
        const primitiveCommunismTemplate = cardDefinitions['原始共産制'];
        const primitiveCommunismCard = createCardInstance(primitiveCommunismTemplate, player1Id);
        gameState.all_card_instances[primitiveCommunismCard.instance_id] = primitiveCommunismCard;
        gameState.players[PlayerId.PLAYER1].ideology = primitiveCommunismCard;
        primitiveCommunismCard.location = 'field';

        const moneyCardTemplate = cardDefinitions['マネー'];
        const moneyCard = createCardInstance(moneyCardTemplate, player1Id);
        gameState.players[PlayerId.PLAYER1].hand.push(moneyCard);
        gameState.all_card_instances[moneyCard.instance_id] = moneyCard;

        const initialHandSize = gameState.players[PlayerId.PLAYER1].hand.length;
        const initialFieldSize = gameState.players[PlayerId.PLAYER1].field.length;

        let finalState = playCard(gameState, player1Id, moneyCard.instance_id);
        while (finalState.effect_queue.length > 0) {
            finalState = processEffects(finalState);
        }

        expect(finalState.players[PlayerId.PLAYER1].hand.length).toBe(initialHandSize);
        expect(finalState.players[PlayerId.PLAYER1].field.length).toBe(initialFieldSize);
        expect(finalState.players[PlayerId.PLAYER1].hand.some(card => card.instance_id === moneyCard.instance_id)).toBe(true);
    });
});
