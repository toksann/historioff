const assert = require('assert');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, processAllEffects } = require('./test_helpers.js');
const { playCard, startTurn, endTurn } = require('../gameLogic/main.js');

describe('軍国主義 (Militarism) Card Effect', () => {

    let cardDefinitions;

    beforeEach(() => {
        global.testHooks = {};
        cardDefinitions = {
            "軍国主義": {
                name: "軍国主義",
                card_type: CardType.IDEOLOGY,
                required_scale: 15,
                description: "配置時、手札のイデオロギーカードすべてをデッキに戻し、自分の場の財すべてに3ダメージ。自分か相手の財の耐久値が0になるたび自分の規模+3。ターン開始時、自分の場の財が上限未満なら「兵器」を1枚手札に加える。",
                triggers: {
                    [TriggerType.CARD_PLACED_THIS]: [
                        {
                            effect_type: EffectType.PROCESS_CARD_OPERATION,
                            args: {
                                player_id: "self",
                                operation: "move",
                                source_pile: "hand",
                                destination_pile: "deck",
                                card_type: CardType.IDEOLOGY,
                                selection_method: "all"
                            }
                        },
                        {
                            effect_type: EffectType.PROCESS_CARD_OPERATION,
                            args: {
                                player_id: "self",
                                operation: "modify_durability",
                                source_pile: "field",
                                card_type: CardType.WEALTH,
                                selection_method: "all",
                                amount: -3
                            }
                        }
                    ],
                    [TriggerType.START_TURN_OWNER]: [
                        {
                            effect_type: EffectType.ADD_CARD_TO_GAME,
                            args: {
                                player_id: "self",
                                card_template_name: "兵器",
                                destination_pile: "hand",
                                condition_field_wealth_limit: 0
                            }
                        }
                    ],
                    [TriggerType.WEALTH_DURABILITY_ZERO]: [
                        {
                            effect_type: EffectType.MODIFY_SCALE_RESERVE,
                            args: {
                                player_id: "self",
                                amount: 3
                            }
                        }
                    ]
                }
            },
            "ダミーイデオロギー": { name: "ダミーイデオロギー", card_type: CardType.IDEOLOGY, required_scale: 0 },
            "ダミー財1": { name: "ダミー財1", card_type: CardType.WEALTH, required_scale: 0, durability: 5, current_durability: 5 },
            "ダミー財2": { name: "ダミー財2", card_type: CardType.WEALTH, required_scale: 0, durability: 3, current_durability: 3 },
            "兵器": { name: "兵器", card_type: CardType.WEALTH, required_scale: 10, durability: 10, current_durability: 10 },
            "攻撃カード": { 
                name: "攻撃カード", 
                card_type: CardType.EVENT, 
                required_scale: 5, 
                triggers: {
                    [TriggerType.PLAY_EVENT_THIS]: [
                        { effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { amount: -5, target_card_id: "target" } }
                    ]
                }
            }
        };
    });

    afterEach(() => {
        delete global.testHooks;
    });

    test('配置時：手札のイデオロギーカードすべてをデッキに戻す', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20; // Required scale for 軍国主義

        const militarismCard = gameState.addCardToGameState(cardDefinitions['軍国主義'], PlayerId.PLAYER1, { location: Location.HAND });
        const dummyIdeology1 = gameState.addCardToGameState(cardDefinitions['ダミーイデオロギー'], PlayerId.PLAYER1, { location: Location.HAND });
        const dummyIdeology2 = gameState.addCardToGameState(cardDefinitions['ダミーイデオロギー'], PlayerId.PLAYER1, { location: Location.HAND });

        p1.hand.push(militarismCard, dummyIdeology1, dummyIdeology2);
        const initialHandSize = p1.hand.length;
        const initialDeckSize = p1.deck.length;

        let nextState = playCard(gameState, PlayerId.PLAYER1, militarismCard.instance_id);
        let finalState = processAllEffects(nextState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];

        // 軍国主義カード自体は場に出るので手札から減る
        // ダミーイデオロギー2枚はデッキに戻るので手札から減る
        assert.strictEqual(finalP1.hand.length, 0, "手札のイデオロギーカードはすべてデッキに戻されるため、手札は空になる");
        assert.strictEqual(finalP1.deck.length, initialDeckSize + 2, "ダミーイデオロギー2枚がデッキに戻る");
        assert.ok(finalP1.ideology && finalP1.ideology.name === '軍国主義', "軍国主義が場に配置される");
    });

    test('配置時：自分の場の財すべてに3ダメージ', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;

        const militarismCard = gameState.addCardToGameState(cardDefinitions['軍国主義'], PlayerId.PLAYER1, { location: Location.HAND });
        const wealth1 = gameState.addCardToGameState(cardDefinitions['ダミー財1'], PlayerId.PLAYER1, { location: Location.FIELD });
        const wealth2 = gameState.addCardToGameState(cardDefinitions['ダミー財2'], PlayerId.PLAYER1, { location: Location.FIELD });

        p1.hand.push(militarismCard);
        p1.field.push(wealth1, wealth2);

        let nextState = playCard(gameState, PlayerId.PLAYER1, militarismCard.instance_id);
        let finalState = processAllEffects(nextState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        const finalWealth1 = finalP1.field.find(c => c.instance_id === wealth1.instance_id);
        const finalWealth2InDiscard = finalP1.discard.find(c => c.instance_id === wealth2.instance_id);

        assert.strictEqual(finalWealth1.current_durability, 2, "ダミー財1の耐久値が3減少する");
        assert.ok(finalWealth2InDiscard, "ダミー財2は耐久値が0になり捨て札に移動する");
        assert.strictEqual(finalWealth2InDiscard.current_durability, 0, "捨て札のダミー財2の耐久値は0である");
    });

    test('リアクション：自分か相手の財の耐久値が0になるたび自分の規模+3', () => {
        let gameState = createTestGameState(cardDefinitions);
        gameState.current_turn = PlayerId.PLAYER1; // ターンを明確にP1から開始
        let p1 = gameState.players[PlayerId.PLAYER1];
        let p2 = gameState.players[PlayerId.PLAYER2];
        p1.scale = 20;
        p2.scale = 20;

        const militarismCard = gameState.addCardToGameState(cardDefinitions['軍国主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(militarismCard);
        
        // 軍国主義を配置
        let finalState = playCard(gameState, PlayerId.PLAYER1, militarismCard.instance_id);
        finalState = processAllEffects(finalState);

        // プレイヤー1の財を場に出す (耐久値3)
        const p1Wealth = gameState.addCardToGameState(cardDefinitions['ダミー財2'], PlayerId.PLAYER1, { location: Location.HAND });
        finalState.players[PlayerId.PLAYER1].hand.push(p1Wealth);
        finalState = playCard(finalState, PlayerId.PLAYER1, p1Wealth.instance_id);
        finalState = processAllEffects(finalState);

        // ターンをP2に交代
        finalState = endTurn(finalState, PlayerId.PLAYER1);
        finalState = processAllEffects(finalState);
        finalState = startTurn(finalState, PlayerId.PLAYER2);
        finalState = processAllEffects(finalState);

        // プレイヤー2の財を場に出す (耐久値3)
        const p2Wealth = gameState.addCardToGameState(cardDefinitions['ダミー財2'], PlayerId.PLAYER2, { location: Location.HAND });
        finalState.players[PlayerId.PLAYER2].hand.push(p2Wealth);
        finalState = playCard(finalState, PlayerId.PLAYER2, p2Wealth.instance_id);
        finalState = processAllEffects(finalState);

        // ターンをP1に戻す
        finalState = endTurn(finalState, PlayerId.PLAYER2);
        finalState = processAllEffects(finalState);
        finalState = startTurn(finalState, PlayerId.PLAYER1);
        finalState = processAllEffects(finalState);

        const initialP1Scale = finalState.players[PlayerId.PLAYER1].scale;

        // プレイヤー1の財にダメージを与え、耐久値を0にする
        const attackCard1 = gameState.addCardToGameState(cardDefinitions['攻撃カード'], PlayerId.PLAYER1, { location: Location.HAND });
        finalState.players[PlayerId.PLAYER1].hand.push(attackCard1);
        finalState = playCard(finalState, PlayerId.PLAYER1, attackCard1.instance_id, { target_card_id: p1Wealth.instance_id });
        finalState = processAllEffects(finalState);

        // プレイヤー2の財にダメージを与え、耐久値を0にする
        const attackCard2 = gameState.addCardToGameState(cardDefinitions['攻撃カード'], PlayerId.PLAYER1, { location: Location.HAND });
        finalState.players[PlayerId.PLAYER1].hand.push(attackCard2);
        finalState = playCard(finalState, PlayerId.PLAYER1, attackCard2.instance_id, { target_card_id: p2Wealth.instance_id });
        finalState = processAllEffects(finalState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.scale, initialP1Scale + 6, "財が2枚0になったので規模が6増加する");
    });

    test('ターン開始時：自分の場の財が上限未満なら「兵器」を1枚手札に加える', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;
        p1.field_limit = 5; // デフォルトのフィールド上限

        const militarismCard = gameState.addCardToGameState(cardDefinitions['軍国主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(militarismCard);
        
        // 軍国主義を配置
        let nextState = playCard(gameState, PlayerId.PLAYER1, militarismCard.instance_id);
        let finalState = processAllEffects(nextState);

        // 場の財を2枚にする (上限5未満)
        finalState.players[PlayerId.PLAYER1].field.push(
            gameState.addCardToGameState(cardDefinitions['ダミー財1'], PlayerId.PLAYER1, { location: Location.FIELD }),
            gameState.addCardToGameState(cardDefinitions['ダミー財2'], PlayerId.PLAYER1, { location: Location.FIELD })
        );
        const initialHandSize = finalState.players[PlayerId.PLAYER1].hand.length;

        // ターン開始
        finalState = startTurn(finalState, PlayerId.PLAYER1);
        finalState = processAllEffects(finalState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, initialHandSize + 1, "手札に兵器が1枚追加される");
        assert.ok(finalP1.hand.some(c => c.name === '兵器'), "手札に兵器カードがある");
    });

    test('ターン開始時：場の財が上限以上なら「兵器」は手札に加わらない', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];
        p1.scale = 20;
        p1.field_limit = 2; // フィールド上限を2に設定

        const militarismCard = gameState.addCardToGameState(cardDefinitions['軍国主義'], PlayerId.PLAYER1, { location: Location.HAND });
        p1.hand.push(militarismCard);
        
        // 軍国主義を配置
        let nextState = playCard(gameState, PlayerId.PLAYER1, militarismCard.instance_id);
        let finalState = processAllEffects(nextState);

        // 場の財を2枚にする (上限2と同じ)
        finalState.players[PlayerId.PLAYER1].field.push(
            gameState.addCardToGameState(cardDefinitions['ダミー財1'], PlayerId.PLAYER1, { location: Location.FIELD }),
            gameState.addCardToGameState(cardDefinitions['ダミー財2'], PlayerId.PLAYER1, { location: Location.FIELD })
        );
        const initialHandSize = finalState.players[PlayerId.PLAYER1].hand.length;

        // ターン開始
        finalState = startTurn(finalState, PlayerId.PLAYER1);
        finalState = processAllEffects(finalState);

        const finalP1 = finalState.players[PlayerId.PLAYER1];
        assert.strictEqual(finalP1.hand.length, initialHandSize, "手札に兵器は追加されない");
        assert.ok(!finalP1.hand.some(c => c.name === '兵器'), "手札に兵器カードがない");
    });


});