/**
 * エフェクトから読みやすいログエントリーを生成するクラス
 */
class LogEntryGenerator {
    constructor() {
        this.formatters = {
            // プレイヤーアクション
            PLAYER_ACTION: this.formatPlayerAction.bind(this),
            
            // カードダメージ（補正前の値は表示しない）
            MODIFY_CARD_DURABILITY: () => null,        // 補正前の値は表示しない
            MODIFY_CARD_DURABILITY_RESERVE: () => null, // 補正前の値は表示しない
            
            // カード移動
            MOVE_CARD: this.formatCardMove.bind(this),
            
            // リソース変更（重要な効果は表示）
            MODIFY_CONSCIOUSNESS_RESERVE: this.formatConsciousnessChange.bind(this),
            MODIFY_SCALE_RESERVE: this.formatScaleChange.bind(this),
            MODIFY_CONSCIOUSNESS: this.formatConsciousnessChange.bind(this),
            MODIFY_SCALE: this.formatScaleChange.bind(this),
            SET_CONSCIOUSNESS: this.formatSetConsciousness.bind(this),
            SET_SCALE: this.formatSetScale.bind(this),
            
            // 実際の変化結果（補正後の値）
            CONSCIOUSNESS_CHANGED: this.formatActualConsciousnessChange.bind(this),
            SCALE_CHANGED: this.formatActualScaleChange.bind(this),
            CARD_DURABILITY_CHANGED: this.formatActualCardDamage.bind(this),
            
            // カード追加
            ADD_CARD_TO_GAME: this.formatCardAdd.bind(this),
            
            // その他のエフェクト
            DRAW_CARD: this.formatCardDraw.bind(this),
            
            // ターン管理
            END_TURN_OWNER: this.formatTurnEnd.bind(this),
            START_TURN_OWNER: this.formatTurnStart.bind(this),
            
            // デフォルトフォーマッター
            DEFAULT: this.formatDefault.bind(this)
        };
    }

    /**
     * エフェクトからログエントリーを生成
     * @param {string} effectType - エフェクトタイプ
     * @param {Object} args - エフェクト引数
     * @param {Object} sourceCard - 発生源カード
     * @param {Object} gameState - ゲーム状態
     * @returns {Object|null} ログエントリー
     */
    generateEntry(effectType, args, sourceCard, gameState) {
        try {
            const formatter = this.formatters[effectType] || this.formatters.DEFAULT;
            const entry = formatter(args, sourceCard, gameState);
            
            if (entry) {
                // 共通フィールドを追加
                entry.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                entry.timestamp = Date.now();
                entry.type = 'effect';
                entry.effectType = effectType;
            }
            
            return entry;
        } catch (error) {
            console.error('[LogEntryGenerator] Error generating entry:', error);
            return this.formatters.DEFAULT(args, sourceCard, gameState);
        }
    }

    /**
     * プレイヤーアクション（カードプレイ）のフォーマッター
     */
    formatPlayerAction(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            const card = gameState.all_card_instances[args.card_id];
            
            if (!player || !card) return null;

            let description = '';
            switch (args.action_type) {
                case 'play_card':
                    description = `${card.name}をプレイしました`;
                    break;
                case 'activate_effect':
                    description = `${card.name}の効果を発動しました`;
                    break;
                default:
                    description = `${card.name}でアクションを実行しました`;
            }

            return {
                playerName: player.name,
                sourceCard: this.formatCardSource(card, gameState),
                description,
                details: {
                    cardType: card.card_type,
                    actionType: args.action_type,
                    cardId: card.instance_id
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting player action:', error);
            return null;
        }
    }

    /**
     * カードダメージのフォーマッター
     */
    formatCardDamage(args, sourceCard, gameState) {
        try {
            const targetCard = gameState.all_card_instances[args.card_id];
            if (!targetCard) return null;

            const amount = Math.abs(args.amount);
            const isHealing = args.amount > 0;
            
            const playerName = sourceCard?.owner_name || 
                             (sourceCard ? gameState.players[sourceCard.owner]?.name : null) || 
                             '不明';
            const description = isHealing 
                ? `${targetCard.name}を${amount}回復`
                : `${targetCard.name}に${amount}ダメージ`;

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    targetCard: targetCard.name,
                    amount: args.amount,
                    isHealing,
                    targetCardType: targetCard.card_type,
                    newDurability: targetCard.current_durability || targetCard.durability
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting card damage:', error);
            return null;
        }
    }

    /**
     * カード移動のフォーマッター
     */
    formatCardMove(args, sourceCard, gameState) {
        try {
            const card = args.card_to_move || gameState.all_card_instances[args.card_id];
            const player = gameState.players[args.player_id];
            
            if (!card || !player) return null;
            
            // playing_eventへの移動はログに表示しない
            if (args.destination_pile === 'playing_event') {
                return null;
            }

            const sourceZone = this.translateZoneName(args.source_pile);
            const destZone = this.translateZoneName(args.destination_pile);
            
            const playerName = player.name;
            const sourceCardName = sourceCard?.name || 'システム';
            
            // NPCのドローは非表示
            if (args.source_pile === 'deck' && args.destination_pile === 'hand') {
                const isNPC = args.player_id === 'PLAYER2'; // PLAYER2がNPC
                if (isNPC) {
                    return null; // NPCのドローは表示しない
                }
            }

            let description;
            if (args.source_pile === 'deck' && args.destination_pile === 'hand') {
                description = `${card.name}をドロー`;
            } else if (args.source_pile === 'hand' && args.destination_pile === 'field') {
                description = `${card.name}を場に配置`;
            } else if (args.destination_pile === 'discard') {
                description = `${card.name}を捨て札に`;
            } else {
                description = `${card.name}を${sourceZone}から${destZone}に移動`;
            }

            return {
                playerName,
                sourceCard: this.formatCardSource(card, gameState),
                description,
                details: {
                    cardName: card.name,
                    cardType: card.card_type,
                    sourceZone: args.source_pile,
                    destZone: args.destination_pile,
                    cardId: card.instance_id
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting card move:', error);
            return null;
        }
    }

    /**
     * 意識変更のフォーマッター
     */
    formatConsciousnessChange(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const amount = args.amount;
            const playerName = player.name;
            
            const description = amount > 0 
                ? `意識を${amount}増加`
                : `意識を${Math.abs(amount)}減少`;

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    resource: 'consciousness',
                    amount,
                    newValue: player.consciousness
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting consciousness change:', error);
            return null;
        }
    }

    /**
     * 規模変更のフォーマッター
     */
    formatScaleChange(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const amount = args.amount;
            const playerName = player.name;
            
            // 発生源カードの特定を改善
            let actualSourceCard = sourceCard;
            
            if (!actualSourceCard && args.source_card_id) {
                // エフェクト引数から発生源カードを特定
                actualSourceCard = gameState.all_card_instances?.[args.source_card_id];
            }
            
            const description = amount > 0 
                ? `規模を${amount}増加`
                : `規模を${Math.abs(amount)}減少`;

            return {
                playerName,
                sourceCard: this.formatCardSource(actualSourceCard, gameState),
                description,
                details: {
                    resource: 'scale',
                    amount,
                    newValue: player.scale
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting scale change:', error);
            return null;
        }
    }

    /**
     * 意識設定のフォーマッター
     */
    formatSetConsciousness(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const amount = args.amount;
            const playerName = player.name;
            
            const description = `意識を${amount}に設定`;

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    resource: 'consciousness',
                    amount,
                    newValue: amount
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting set consciousness:', error);
            return null;
        }
    }

    /**
     * 規模設定のフォーマッター
     */
    formatSetScale(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const amount = args.amount;
            const playerName = player.name;
            
            const description = `規模を${amount}に設定`;

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    resource: 'scale',
                    amount,
                    newValue: amount
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting set scale:', error);
            return null;
        }
    }

    /**
     * カード追加のフォーマッター
     */
    formatCardAdd(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            const cardName = args.card_name || '新しいカード';
            
            if (!player) return null;

            const playerName = player.name;
            const destZone = this.translateZoneName(args.destination_pile || 'hand');
            
            const description = `${cardName}を${destZone}に追加`;

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    cardName,
                    destZone: args.destination_pile || 'hand'
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting card add:', error);
            return null;
        }
    }

    /**
     * カードドローのフォーマッター
     */
    formatCardDraw(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const playerName = player.name;
            
            const description = 'カードを1枚ドロー';

            return {
                playerName,
                sourceCard: this.formatCardSource(sourceCard, gameState),
                description,
                details: {
                    newHandCount: player.hand?.length || 0
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting card draw:', error);
            return null;
        }
    }

    /**
     * ターンエンドフォーマッター
     */
    formatTurnEnd(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const playerName = player.name;
            const description = `${playerName}のターン終了`;

            return {
                playerName,
                sourceCard: 'システム',
                description,
                details: {
                    turnEnd: true,
                    playerId: args.player_id
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting turn end:', error);
            return null;
        }
    }

    /**
     * ターンスタートフォーマッター
     */
    formatTurnStart(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const playerName = player.name;
            const description = `${playerName}のターン開始`;

            return {
                playerName,
                sourceCard: 'システム',
                description,
                details: {
                    turnStart: true,
                    playerId: args.player_id
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting turn start:', error);
            return null;
        }
    }

    /**
     * 実際の意識変更のフォーマッター（補正後の値）
     */
    formatActualConsciousnessChange(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const originalAmount = args.original_amount;
            const actualAmount = args.actual_amount;
            const playerName = player.name;
            
            // 発生源カードの特定を改善
            let actualSourceCard = sourceCard;
            if (!actualSourceCard && args.source_card_id) {
                actualSourceCard = gameState.all_card_instances?.[args.source_card_id];
            }
            
            let description;
            if (originalAmount !== actualAmount) {
                // 補正が発生した場合
                if (actualAmount > 0) {
                    description = `意識を${actualAmount}増加（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else if (actualAmount < 0) {
                    description = `意識を${Math.abs(actualAmount)}減少（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else {
                    // actualAmount === 0 の場合（補正により0になった）
                    description = `意識への効果が無効化（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                }
            } else {
                // 補正なしの場合
                if (actualAmount > 0) {
                    description = `意識を${actualAmount}増加`;
                } else if (actualAmount < 0) {
                    description = `意識を${Math.abs(actualAmount)}減少`;
                } else {
                    // actualAmount === 0 かつ補正なしの場合（元々0）
                    description = `意識への効果なし`;
                }
            }

            return {
                playerName,
                sourceCard: this.formatCardSource(actualSourceCard, gameState),
                description,
                details: {
                    resource: 'consciousness',
                    originalAmount,
                    actualAmount,
                    corrected: originalAmount !== actualAmount,
                    newValue: player.consciousness
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting actual consciousness change:', error);
            return null;
        }
    }

    /**
     * 実際の規模変更のフォーマッター（補正後の値）
     */
    formatActualScaleChange(args, sourceCard, gameState) {
        try {
            const player = gameState.players[args.player_id];
            if (!player) return null;

            const originalAmount = args.original_amount;
            const actualAmount = args.actual_amount;
            const playerName = player.name;
            
            // 発生源カードの特定を改善
            let actualSourceCard = sourceCard;
            if (!actualSourceCard && args.source_card_id) {
                actualSourceCard = gameState.all_card_instances?.[args.source_card_id];
            }
            
            let description;
            if (originalAmount !== actualAmount) {
                // 補正が発生した場合
                if (actualAmount > 0) {
                    description = `規模を${actualAmount}増加（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else if (actualAmount < 0) {
                    description = `規模を${Math.abs(actualAmount)}減少（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else {
                    // actualAmount === 0 の場合（補正により0になった）
                    description = `規模への効果が無効化（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                }
            } else {
                // 補正なしの場合
                if (actualAmount > 0) {
                    description = `規模を${actualAmount}増加`;
                } else if (actualAmount < 0) {
                    description = `規模を${Math.abs(actualAmount)}減少`;
                } else {
                    // actualAmount === 0 かつ補正なしの場合（元々0）
                    description = `規模への効果なし`;
                }
            }

            return {
                playerName,
                sourceCard: this.formatCardSource(actualSourceCard, gameState),
                description,
                details: {
                    resource: 'scale',
                    originalAmount,
                    actualAmount,
                    corrected: originalAmount !== actualAmount,
                    newValue: player.scale
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting actual scale change:', error);
            return null;
        }
    }

    /**
     * 実際のカードダメージのフォーマッター（補正後の値）
     */
    formatActualCardDamage(args, sourceCard, gameState) {
        try {
            const targetCard = gameState.all_card_instances[args.card_id];
            if (!targetCard) return null;

            const originalAmount = args.original_amount;
            const actualAmount = args.actual_amount;
            const isHealing = actualAmount > 0;
            
            // 発生源カードの特定を改善
            let actualSourceCard = sourceCard;
            if (!actualSourceCard && args.source_card_id) {
                actualSourceCard = gameState.all_card_instances?.[args.source_card_id];
            }
            
            const playerName = actualSourceCard?.owner_name || 
                             (actualSourceCard ? gameState.players[actualSourceCard.owner]?.name : null) || 
                             '不明';
            
            let description;
            if (originalAmount !== actualAmount) {
                // 補正が発生した場合
                if (actualAmount > 0) {
                    description = `${targetCard.name}を${actualAmount}回復（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else if (actualAmount < 0) {
                    description = `${targetCard.name}に${Math.abs(actualAmount)}ダメージ（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                } else {
                    // actualAmount === 0 の場合（補正により0になった）
                    const originalType = originalAmount > 0 ? '回復' : 'ダメージ';
                    description = `${targetCard.name}への${originalType}が無効化（元：${originalAmount > 0 ? '+' : ''}${originalAmount}）`;
                }
            } else {
                // 補正なしの場合
                if (actualAmount > 0) {
                    description = `${targetCard.name}を${actualAmount}回復`;
                } else if (actualAmount < 0) {
                    description = `${targetCard.name}に${Math.abs(actualAmount)}ダメージ`;
                } else {
                    // actualAmount === 0 かつ補正なしの場合（元々0）
                    description = `${targetCard.name}への効果なし`;
                }
            }

            return {
                playerName,
                sourceCard: this.formatCardSource(actualSourceCard, gameState),
                description,
                details: {
                    targetCard: targetCard.name,
                    originalAmount,
                    actualAmount,
                    corrected: originalAmount !== actualAmount,
                    isHealing,
                    targetCardType: targetCard.card_type,
                    newDurability: args.new_durability
                }
            };
        } catch (error) {
            console.error('[LogEntryGenerator] Error formatting actual card damage:', error);
            return null;
        }
    }

    /**
     * デフォルトフォーマッター（未知のエフェクト用）
     * 未対応のエフェクトはログに表示しない
     */
    formatDefault(args, sourceCard, gameState) {
        // 未対応のエフェクトはログに表示しない
        return null;
    }

    /**
     * カード情報を「保有者>カード名」の形式でフォーマット
     */
    formatCardSource(card, gameState) {
        if (!card) return 'システム';
        
        const owner = gameState.players[card.owner];
        const ownerName = owner?.name || '不明';
        return `${ownerName}>${card.name}`;
    }

    /**
     * ゾーン名を日本語に翻訳
     */
    translateZoneName(zoneName) {
        const translations = {
            'hand': '手札',
            'field': '場',
            'deck': 'デッキ',
            'discard': '捨て札',
            'discard_pile': '捨て札',
            'ideology': '場',
            'playing_event': '手元',
            'game': 'ゲーム'
        };
        
        return translations[zoneName] || zoneName;
    }

    /**
     * カスタムフォーマッターを追加
     * @param {string} effectType - エフェクトタイプ
     * @param {Function} formatter - フォーマッター関数
     */
    addFormatter(effectType, formatter) {
        this.formatters[effectType] = formatter.bind(this);
    }

    /**
     * 利用可能なフォーマッターのリストを取得
     * @returns {Array} フォーマッタータイプのリスト
     */
    getAvailableFormatters() {
        return Object.keys(this.formatters).filter(key => key !== 'DEFAULT');
    }
}

export default LogEntryGenerator;