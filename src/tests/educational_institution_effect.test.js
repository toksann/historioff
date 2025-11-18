const assert = require('assert');
const { processEffects } = require('../gameLogic/effectHandler.js');
const { PlayerId, CardType, Location, TriggerType, EffectType } = require('../gameLogic/constants.js');
const { createTestGameState, createCardInstance } = require('./test_helpers.js');
const { startTurn } = require('../gameLogic/main.js');

describe('教育機関 (Educational Institution) Card Effect', () => {

    const cardDefinitions = {
        "教育機関": {
            name: "教育機関",
            card_type: CardType.WEALTH,
            required_scale: 20,
            durability: 3,
            description: "このカードが場にある限り自分への意識減少効果を1軽減する。ターン開始時「愛国教育」か「嫌国教育」を1枚手札に加える。",
            triggers: {
                [TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER]: [
                    {
                        effect_type: EffectType.ADD_MODIFY_PARAMETER_CORRECTION,
                        args: {
                            player_id: "self",
                            correct_target: "consciousness",
                            correct_direction: "decrease",
                            correct_type: "attenuation",
                            amount: 1
                        }
                    }
                ],
                [TriggerType.START_TURN_OWNER]: [
                    {
                        effect_type: EffectType.PROCESS_ADD_CHOICE_CARD_TO_HAND,
                        args: {
                            player_id: "self",
                            options: [
                                "愛国教育",
                                "嫌国教育"
                            ]
                        }
                    }
                ]
            }
        },
        "愛国教育": {
            name: "愛国教育",
            card_type: CardType.EVENT,
            required_scale: 0,
            description: "テスト用",
        },
        "嫌国教育": {
            name: "嫌国教育",
            card_type: CardType.EVENT,
            required_scale: 0,
            description: "テスト用",
        },
        "攻撃カード": {
            name: "攻撃カード",
            card_type: CardType.EVENT,
            required_scale: 0,
            triggers: {
                "PLAY_EVENT_THIS": [{ "effect_type": "MODIFY_CONSCIOUSNESS_RESERVE", "args": { "player_id": "opponent", "amount": -5 } }]
            }
        },
    };

    test('意識減少効果が1軽減される', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const educationalInstitutionCard = createCardInstance(cardDefinitions['教育機関'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(educationalInstitutionCard);
        gameState.all_card_instances[educationalInstitutionCard.instance_id] = educationalInstitutionCard;
        p1.consciousness = 10; // 初期意識

        // 5ダメージを与える効果をシミュレート
        gameState.effect_queue.push([{
            effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE,
            args: { player_id: PlayerId.PLAYER1, amount: -5 }
        }, null]);
        processEffects(gameState);

        // 期待値: 10 - (5 - 1) = 6
        assert.strictEqual(p1.consciousness, 6, '意識減少が1軽減されるべき');
    });

    test('ターン開始時、「愛国教育」か「嫌国教育」を選択するプロンプトが表示される', () => {
        let gameState = createTestGameState(cardDefinitions);
        let p1 = gameState.players[PlayerId.PLAYER1];

        const educationalInstitutionCard = createCardInstance(cardDefinitions['教育機関'], PlayerId.PLAYER1, { location: Location.FIELD });
        p1.field.push(educationalInstitutionCard);
        gameState.all_card_instances[educationalInstitutionCard.instance_id] = educationalInstitutionCard;

        let nextState = startTurn(gameState, PlayerId.PLAYER1);
        // processEffectsはawaiting_inputがセットされたら停止する
        let finalState = processEffects(nextState);

        assert.ok(finalState.awaiting_input, '入力待ち状態であるべき');
        assert.strictEqual(finalState.awaiting_input.type, 'CHOICE_CARD_TO_ADD', 'カード選択プロンプトであるべき');
        assert.deepStrictEqual(finalState.awaiting_input.options, ['愛国教育', '嫌国教育'], '選択肢が正しいべき');
    });
});