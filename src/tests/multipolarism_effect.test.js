
import { initializeGame, playCard, endTurn, resolveInput } from '../gameLogic/main.js';
import { processAllEffects } from './test_helpers.js';
import { EffectType, TriggerType, PlayerId } from '../gameLogic/constants.js';
import { createCardInstance } from '../gameLogic/gameUtils';

// card_definitions.json から必要なカード定義を抽出
const mockCardDefs = {
    "多極主義": {
        "name": "多極主義",
        "card_type": "イデオロギー",
        "required_scale": 60,
        "description": "配置時、自分の規模の50%の耐久値のマネーを手札に加え、自分の規模-50%。自分の手札にイデオロギーが加わるたびそれを捨て、「ディアスポラ」を1枚デッキに加える。ターン終了時、自分の規模が相手の規模を下回っているなら、相手の意識-5。",
        "triggers": {
            "CARD_PLACED_THIS": [
                {
                    "effect_type": "ADD_CARD_TO_GAME",
                    "args": {
                        "player_id": "self",
                        "card_template_name": "マネー",
                        "destination_pile": "hand",
                        "initial_durability_based_on_scale_percentage": 50
                    }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "self",
                        "amount_percentage": -50
                    }
                }
            ],
            "CARD_ADDED_TO_HAND_OWNER": [
                {
                    "effect_type": "PROCESS_CARD_OPERATION",
                    "args": {
                        "player_id": "self",
                        "operation": "move",
                        "source_pile": "hand",
                        "destination_pile": "discard_pile",
                        "selection_method": "bottom"
                    }
                },
                {
                    "effect_type": "ADD_CARD_TO_GAME",
                    "args": {
                        "player_id": "self",
                        "card_template_name": "ディアスポラ",
                        "destination_pile": "deck",
                        "position": "random"
                    }
                }
            ],
            "END_TURN_OWNER": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": {
                        "player_id": "opponent",
                        "amount": -5,
                        "condition_self_scale_lower": true
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
    "ディアスポラ": {
        "name": "ディアスポラ",
        "card_type": "事象",
        "required_scale": 20,
        "description": "自分の規模-5。相手のデッキに「移民」を2枚加える。",
        "triggers": {
            "PLAY_EVENT_THIS": [
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "self",
                        "amount": -5
                    }
                },
                {
                    "effect_type": "ADD_CARD_TO_GAME",
                    "args": {
                        "player_id": "opponent",
                        "card_template_name": "移民",
                        "destination_pile": "deck",
                        "count": 2
                    }
                }
            ]
        }
    },
    "理想主義": {
        "name": "理想主義",
        "card_type": "イデオロギー",
        "required_scale": 0,
        "description": "ターン開始時、相手の意識が自分の意識を上回っているなら相手の意識-2。そうでないなら互いの規模+3。",
        "triggers": {
            "START_TURN_OWNER": [
                {
                    "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE",
                    "args": {
                        "player_id": "opponent",
                        "amount": -2,
                        "condition_opponent_consciousness_higher": true
                    }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "self",
                        "amount": 3,
                        "condition_opponent_consciousness_higher": false
                    }
                },
                {
                    "effect_type": "MODIFY_SCALE_RESERVE",
                    "args": {
                        "player_id": "opponent",
                        "amount": 3,
                        "condition_opponent_consciousness_higher": false
                    }
                }
            ]
        }
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

// preset_decks.json からテスト用のデッキを抽出
const mockPresetDecks = [
    {
        "name": "test_multipolarism_deck",
        "description": "Deck for Multipolarism testing.",
        "cards": ["多極主義", "農民", "農民", "理想主義", "理想主義", "理想主義", "マネー", "マネー", "マネー", "ディアスポラ"]
    },
    {
        "name": "test_opponent_deck",
        "description": "Opponent deck for Multipolarism testing.",
        "cards": ["農民", "農民", "農民", "農民", "農民", "農民", "農民", "農民", "農民", "農民"]
    }
];

describe('多極主義 (Multipolarism) Card Effect', () => {
  let gameState;

  beforeEach(() => {
    // initializeGame を使用して gameState を初期化
    gameState = initializeGame(mockCardDefs, mockPresetDecks, "test_multipolarism_deck", "test_opponent_deck");
    // initializeGame でランダムに先攻が決まるため、player 1 が先攻になるように調整
    if (gameState.first_player !== PlayerId.PLAYER1) {
        gameState.current_turn = PlayerId.PLAYER1;
        gameState.first_player = PlayerId.PLAYER1;
        // 意識のデバフも調整
        gameState.players[PlayerId.PLAYER1].consciousness -= (-3);
        gameState.players[PlayerId.PLAYER2].consciousness += (-3);
    }

    // 「多極主義」カードが手札に確実に存在するように調整
    const player1 = gameState.players[PlayerId.PLAYER1];
    const multipolarismCardName = '多極主義';

    // 手札から既存の「多極主義」を削除
    player1.hand = player1.hand.filter(card => card.name !== multipolarismCardName);
    // デッキから既存の「多極主義」を削除
    player1.deck = player1.deck.filter(card => card.name !== multipolarismCardName);

    // 新しい「多極主義」インスタンスを作成し、手札の先頭に追加
    const newMultipolarismCard = createCardInstance(mockCardDefs[multipolarismCardName], PlayerId.PLAYER1);
    player1.hand.unshift(newMultipolarismCard);
    gameState.all_card_instances[newMultipolarismCard.instance_id] = newMultipolarismCard;

    player1.scale = 60; // Set scale to play the card
  });

  test('1. Placement effect: Halves scale and adds Money card with durability equal to half of the original scale', () => {
    // Player 1 plays 多極主義
    const multipolarismCard = gameState.players[PlayerId.PLAYER1].hand.find(c => c.name === '多極主義');
    gameState = playCard(gameState, PlayerId.PLAYER1, multipolarismCard.instance_id);
    gameState = processAllEffects(gameState);

    // Check player 1's scale
    expect(gameState.players[PlayerId.PLAYER1].scale).toBe(30);

    // Check if a "マネー" card with the correct durability was added to hand
    const moneyCard = gameState.players[PlayerId.PLAYER1].hand.find(c => c.name === 'マネー' && c.current_durability === 30);
    expect(moneyCard).toBeDefined();

    // Check the durability of the "マネー" card
    expect(moneyCard.current_durability).toBe(30);
  });

  test('2. Reaction effect: When an ideology card is added to hand, it is discarded and a "ディアスポラ" is added to the deck', () => {
    // Player 1 plays 多極主義
    const multipolarismCard = gameState.players[PlayerId.PLAYER1].hand.find(c => c.name === '多極主義');
    gameState = playCard(gameState, PlayerId.PLAYER1, multipolarismCard.instance_id);
    gameState = processAllEffects(gameState);

    // Manually add an ideology card to player 1's hand by queuing an effect
    gameState.effect_queue.push([
        {
            effect_type: EffectType.ADD_CARD_TO_GAME,
            args: {
                player_id: PlayerId.PLAYER1,
                card_template_name: '理想主義',
                destination_pile: 'hand',
            }
        },
        null // No specific source card for this action
    ]);

    // Process effects to trigger the reaction
    gameState = processAllEffects(gameState);

    // Check if the ideology card is in the discard pile
    const discardedIdeology = gameState.players[PlayerId.PLAYER1].discard.find(c => c.name === '理想主義');
    expect(discardedIdeology).toBeDefined();

    // Check if "ディアスポラ" is in the deck
    const diasporaCard = gameState.players[PlayerId.PLAYER1].deck.find(c => c.name === 'ディアスポラ');
    expect(diasporaCard).toBeDefined();
  });

  test("3. End of turn effect: If own scale is lower than opponent's, opponent loses 5 consciousness", () => {
    // Player 1 plays 多極主義
    const multipolarismCard = gameState.players[PlayerId.PLAYER1].hand.find(c => c.name === '多極主義');
    gameState = playCard(gameState, PlayerId.PLAYER1, multipolarismCard.instance_id);
    gameState = processAllEffects(gameState);

    // Set scales for the test case
    gameState.players[PlayerId.PLAYER1].scale = 20;
    gameState.players[PlayerId.PLAYER2].scale = 30;
    const initialOpponentConsciousness = gameState.players[PlayerId.PLAYER2].consciousness;

    // End player 1's turn
    gameState = endTurn(gameState);
    gameState = processAllEffects(gameState);

    // Check if opponent's consciousness decreased
    expect(gameState.players[PlayerId.PLAYER2].consciousness).toBe(initialOpponentConsciousness - 5);

    // Set scales for the other case (own scale is higher or equal)
    gameState.players[PlayerId.PLAYER1].scale = 40;
    gameState.players[PlayerId.PLAYER2].scale = 30;
    const secondOpponentConsciousness = gameState.players[PlayerId.PLAYER2].consciousness;

    // End player 2's turn and start player 1's turn again
    gameState = endTurn(gameState);
    gameState = processAllEffects(gameState);
    gameState = endTurn(gameState);
    gameState = processAllEffects(gameState);

    // Check if opponent's consciousness did not change
    expect(gameState.players[PlayerId.PLAYER2].consciousness).toBe(secondOpponentConsciousness);
  });
});
