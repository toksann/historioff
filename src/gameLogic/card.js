import { EffectType, CardType, PlayerId, TriggerType } from './constants.js';

const checkCondition = (condition, comparison) => {
    if (condition === undefined) return true;
    return condition ? comparison : !comparison;
};

// 未使用の関数を削除

export const checkCardReaction = (card, triggeredEffect, gameState) => {
    const triggeredEffectType = triggeredEffect.effect_type;
    const triggeringEffectArgs = triggeredEffect.args;
    // ログプレフィックスは現在未使用

    if (!card.triggers) {
        return [];
    }

    let effectsToCheck = card.triggers[triggeredEffectType];



    if (!effectsToCheck || effectsToCheck.length === 0) {
        return [];
    }

    const owner = gameState.players[card.owner];
    const opponent = gameState.players[card.owner === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
    if (!owner) {
        return [];
    }

    const thisCardTriggers = [
        TriggerType.PLAY_EVENT_THIS, TriggerType.CARD_DRAWN_THIS, TriggerType.CARD_PLACED_THIS,
        TriggerType.CARD_DISCARDED_THIS, TriggerType.CARD_BOUNCED_THIS, TriggerType.CARD_ADDED_TO_HAND_THIS,
        TriggerType.DAMAGE_THIS, TriggerType.BOOST_THIS, TriggerType.WEALTH_DURABILITY_ZERO_THIS,
        TriggerType.SUCCESS_PROCESS, TriggerType.FAILED_PROCESS
    ];
    if (thisCardTriggers.includes(triggeredEffectType)) {
        const idToCheck = (triggeredEffectType === TriggerType.PLAY_EVENT_THIS) ? triggeredEffect.args.card_id : triggeredEffect.args.target_card_id;
        if (!triggeredEffect.args || idToCheck !== card.instance_id) {
            return [];
        }
    }

    const opponentTriggers = [
        TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT, TriggerType.PLAY_EVENT_OPPONENT,
        TriggerType.CARD_PLACED_OPPONENT, TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT, 
        TriggerType.START_TURN_OPPONENT, TriggerType.END_TURN_OPPONENT,
        TriggerType.PLAYER_PLAY_CARD_ACTION_OPPONENT
    ];
    if (opponentTriggers.includes(triggeredEffectType)) {
        if (!triggeredEffect.args || !opponent || triggeredEffect.args.player_id !== opponent.id) {
            return [];
        }
    }

    const ownerTriggers = [
        TriggerType.MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER, TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER,
        TriggerType.MODIFY_SCALE_INCREASE_RESERVE_OWNER, TriggerType.PLAY_EVENT_OWNER, TriggerType.CARD_DRAWN_OWNER,
        TriggerType.CARD_PLACED_OWNER, TriggerType.CARD_DISCARDED_OWNER,
        TriggerType.CARD_BOUNCED_OWNER, TriggerType.CARD_ADDED_TO_HAND_OWNER, TriggerType.START_TURN_OWNER, TriggerType.END_TURN_OWNER, TriggerType.WEALTH_DURABILITY_ZERO_OWNER,
        TriggerType.PLAYER_PLAY_CARD_ACTION_OWNER
    ];
    if (ownerTriggers.includes(triggeredEffectType)) {
        const effect_player_id = triggeredEffect.args.target_player_id || triggeredEffect.args.player_id;
        if (!triggeredEffect.args || effect_player_id !== owner.id) {
            return [];
        }
    }

    if (triggeredEffectType === TriggerType.PLAYER_PLAY_CARD_ACTION) {
        const playedCardId = triggeringEffectArgs.card_id;
        if (card.instance_id === playedCardId) {
            // A card should not react to its own play action via this generic trigger.
            // It should use CARD_PLACED_THIS for its own placement effect.
            return [];
        }
    }

    const reactionEffects = [];

    // Refactored guard clauses for card location
    // Check in Field
    const isFieldCard = card.card_type === CardType.WEALTH || card.card_type === CardType.IDEOLOGY;
    const isOnField = card.location === 'field' || card.location === 'ideology';

    if (isFieldCard && !isOnField) {
        // 場にあるべきカードが場にない場合、原則として効果を発動させない
        const allowedTriggers = [
            TriggerType.CARD_DISCARDED_THIS,
            TriggerType.WEALTH_DURABILITY_ZERO_THIS,
        ];
        if (allowedTriggers.includes(triggeredEffectType)) {
            // 「このカードが捨てられた/破壊された時」の効果は許可
        } else if (card.name === "ポピュリズム" && triggeredEffectType === TriggerType.START_TURN_OWNER) {
            // ポピュリズムの特殊な自動配置効果は許可
        }
        else {
            return []; // 上記の例外以外はガード
        }
    }

    // Check in Playing Event
    const isEventCard = card.card_type === CardType.EVENT;
    const isOnPlayingEvent = card.location === 'playing_event';

    if (isEventCard && !isOnPlayingEvent) {
        const allowedTriggers = [
            TriggerType.CARD_DISCARDED_THIS,
            TriggerType.CARD_DRAWN_THIS
        ];
        if (allowedTriggers.includes(triggeredEffectType)) {
            // 「このカードが捨てられた/破壊された時」の効果は許可
        } else if ((card.name === "布教" && card.location === 'hand' ||
            (card.name === "官僚主義" && card.location === 'hand'))
        ) {
        } else {
            return []; // イベントカードがプレイ中でない場合、効果を発動させない
        }
    }


    for (const cardEffect of effectsToCheck) {
        let conditionMet = true;
        if (cardEffect.condition) {
            const { check } = cardEffect.condition;
            if (check === 'consciousness_decreased_by_opponent') {
                // Check the final calculated amount from temp_effect_data, not the original amount.
                if (gameState.temp_effect_data.last_consciousness_change && gameState.temp_effect_data.last_consciousness_change < 0) {
                    conditionMet = true;
                } else {
                    conditionMet = false;
                }
            } else if (check === 'is_opponent_play') {
                if (triggeringEffectArgs && triggeringEffectArgs.player_id !== owner.id) {
                    conditionMet = true;
                } else {
                    conditionMet = false;
                }
            }
        }

        if (!conditionMet) {
            continue; 
        }
        let current_args = { ...cardEffect.args };

        if (card.name === '帝国主義' && triggeredEffectType === TriggerType.END_TURN_OWNER) {
            if (owner.ideology && owner.ideology.instance_id === card.instance_id) {
                if (owner.field_limit > opponent.field_limit) {
                    const diff = owner.field_limit - opponent.field_limit;
                    if (current_args.player_id === 'opponent') {
                        current_args.amount = -diff;
                        delete current_args.amount_based_on_field_limit_diff;
                    } else if (current_args.player_id === 'self') {
                        current_args.amount = diff;
                        delete current_args.amount_based_on_field_limit_diff;
                    }
                } else {
                    continue;
                }
            } else {
                continue;
            }
        }

        if (current_args.source_pile === 'current') {
            current_args.source_pile = card.location;
        }



        if (cardEffect.effect_type === EffectType.PROCESS_ADD_CARD_CONDITIONAL_ON_DECK_COUNT) {
            const { threshold, card_if_above, card_if_below } = current_args;
            const player = gameState.players[owner.id];
            if (player) {
                const card_template_name = player.deck.length >= threshold ? card_if_above : card_if_below;
                reactionEffects.push({
                    effect_type: EffectType.ADD_CARD_TO_GAME,
                    args: {
                        player_id: owner.id,
                        card_template_name: card_template_name,
                        destination_pile: 'hand'
                    }
                });
            } else {
            }
            continue;
        }

        if (current_args.player_id === 'self') {
            current_args.player_id = owner.id;
        } else if (current_args.player_id === 'opponent' && opponent) {
            current_args.player_id = opponent.id;
        } else if (current_args.player_id === 'random' && opponent) {
            current_args.player_id = Math.random() < 0.5 ? owner.id : opponent.id;
        } else if (current_args.player_id === 'source' && triggeringEffectArgs.source_card_id) {
            const sourceCard = Object.values(gameState.players).flatMap(p => [...p.hand, ...p.field, p.ideology]).find(c => c && c.instance_id === triggeringEffectArgs.source_card_id);
            if (sourceCard) {
                current_args.player_id = sourceCard.owner;
            }
        }

        if (current_args.player_ids === 'self') {
            current_args.player_ids = [owner.id];
        } else if (current_args.player_ids === 'opponent' && opponent) {
            current_args.player_ids = [opponent.id];
        } else if (current_args.player_ids === 'self_and_opponent' && opponent) {
            current_args.player_ids = [owner.id, opponent.id];
        }

        if (current_args.target_player_id === 'self') {
            current_args.target_player_id = card.owner;
        } else if (current_args.target_player_id === 'opponent' && opponent) {
            current_args.target_player_id = opponent.id;
        }

        if (current_args.target_card_id === 'target') {
            if (triggeringEffectArgs && triggeringEffectArgs.target_card_id) {
                current_args.target_card_id = triggeringEffectArgs.target_card_id;
            } else {
                console.warn(`[ReactionCheck] Could not resolve 'target' for target_card_id.`);
                continue;
            }
        }
        if (current_args.card_id === 'target') {
            if (triggeringEffectArgs && triggeringEffectArgs.exposed_cards && triggeringEffectArgs.exposed_cards.length > 0) {
                current_args.card_id = triggeringEffectArgs.exposed_cards[0];
            } else if (triggeringEffectArgs && triggeringEffectArgs.target_card_id) {
                current_args.card_id = triggeringEffectArgs.target_card_id;
            } else {
                 console.warn(`[ReactionCheck] Could not resolve 'target' for card_id.`);
                continue;
            }
        }

        if (!current_args.card_id && current_args.target_card_id) {
            current_args.card_id = current_args.target_card_id;
        } else if (current_args.card_id === 'self') {
            current_args.card_id = card.instance_id;
        } else if (current_args.card_id === 'self_ideology') {
            if (owner.ideology) {
                current_args.card_id = owner.ideology.instance_id;
            }
            else {
                continue;
            }
        } else if (current_args.card_id === 'opponent_ideology' && opponent) {
            if (opponent.ideology) {
                current_args.card_id = opponent.ideology.instance_id;
            }
            else {
                continue;
            }
        } else if (current_args.card_id === 'self_money_on_field') {
            const moneyCard = owner.field.find(c => c.name === 'マネー');
            if (moneyCard) {
                current_args.card_id = moneyCard.instance_id;
            } else {
                continue;
            }
        } else if (current_args.card_id === 'self_money_on_field') {
            const moneyCard = owner.field.find(c => c.name === 'マネー');
            if (moneyCard) {
                current_args.card_id = moneyCard.instance_id;
            }
            else {
                continue;
            }
        }

        if (current_args.initial_durability === 'damage_this') {
            const damage = triggeringEffectArgs.damage_amount;
            if (damage && damage < 0) {
                current_args.initial_durability = Math.abs(damage);
            }
        }



        if (card.name === 'ポピュリズム' && triggeredEffectType === TriggerType.START_TURN_OWNER) {
            if (owner.consciousness > 5) {
                continue;
            }
            if (owner.ideology && owner.ideology.name === 'ポピュリズム') {
                continue;
            }
            if (card.location === 'field') {
                continue;
            }
        }

        if (card.name === '救世') {
            if (cardEffect.effect_type === EffectType.SET_CONSCIOUSNESS) {
                if (owner.consciousness < 100) {
                    continue;
                }
            } else { 
                if (owner.consciousness >= 100) {
                    continue;
                }
            }
        }

        if (card.name === '重金主義' && triggeredEffectType === TriggerType.MODIFY_SCALE_INCREASE_RESERVE_OWNER) {
            const scaleAmount = triggeringEffectArgs.amount || 0;
            if (scaleAmount > 0) {
                current_args.initial_durability = scaleAmount;
            }
        }

        if (['交易路', '隘路'].includes(card.name) && triggeredEffectType === TriggerType.CARD_PLACED_OPPONENT) {
            if (!triggeredEffect.args || triggeredEffect.args.player_id === owner.id) {
                continue;
            }
            const target_card = Object.values(gameState.players).flatMap(p => p.field).find(c => c && c.instance_id === triggeredEffect.args.card_id);
            if (!target_card || target_card.card_type !== CardType.WEALTH) {
                continue;
            }
        }

        if (card.name === '官僚主義' && triggeredEffectType === TriggerType.CARD_DISCARDED_OWNER) {
            const target_card = gameState.all_card_instances[triggeringEffectArgs.card_id];
            if (!target_card || target_card.card_type !== CardType.IDEOLOGY) {
                continue;
            }
        }

        if (card.name === 'ニューリベラリズム' && triggeredEffectType === TriggerType.CARD_PLACED_OWNER) {
            const placed_card = triggeringEffectArgs.card_id && gameState.players[triggeringEffectArgs.player_id]?.field.find(c => c.instance_id === triggeringEffectArgs.card_id);
            if (!placed_card || placed_card.name !== 'マネー') {
                continue;
            }
        }

        if (card.name === '孤立主義' && triggeredEffectType === EffectType.MODIFY_CONSCIOUSNESS) {
            // This block validates the self-destruct trigger (Python version compatibility).
            
            // First, ensure the effect is targeting this card's owner
            if (!triggeredEffect.args || triggeredEffect.args.target_player_id !== owner.id) {
                continue;
            }
            
            // Prevent infinite loop: Skip if the consciousness change was caused by 孤立主義 itself
            const sourceCardId = triggeredEffect.args.source_card_id;
            if (sourceCardId === card.instance_id) {
                continue;
            }
            
            // Check if the original amount is negative (damage)
            if (!triggeredEffect.args.amount || triggeredEffect.args.amount >= 0) {
                continue;
            }
            
            // Check if the final decrease meets the threshold (1 or more)
            const tempKey = `${owner.id}_last_consciousness_decrease`;
            const actualDecrease = gameState.temp_effect_data[tempKey];
            console.log(`[孤立主義] 実際の意識減少量: ${actualDecrease} ソース: ${sourceCardId} tempKey :${tempKey}`);
            if (!actualDecrease || actualDecrease < 1) {
                continue;
            }
        }

        if (card.name === '帝国主義' && (triggeredEffectType === TriggerType.END_TURN_OWNER || triggeredEffectType === TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT)) {
            if (owner.ideology && owner.ideology.instance_id === card.instance_id) {
                if (triggeredEffectType === TriggerType.END_TURN_OWNER) {
                    if (owner.field_limit > opponent.field_limit) {
                        const diff_field_limit = owner.field_limit - opponent.field_limit;
                        if (current_args.player_id === 'opponent') {
                            current_args.amount = diff_field_limit * -1;
                        } else if (current_args.player_id === 'self') {
                            current_args.amount = diff_field_limit;
                        }
                    }
                    else {
                        continue;
                    }
                }
                else if (triggeredEffectType === TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT) {
                    const destroyed_card_owner_id = triggeringEffectArgs.player_id;
                    if (destroyed_card_owner_id === opponent.id && gameState.current_turn === owner.id) {
                    }
                    else {
                        continue;
                    }
                }
            }
            else {
                continue;
            }
        }

        if (card.name === '自由主義' && triggeredEffectType === EffectType.MODIFY_SCALE) {
            if (gameState.current_turn === owner.id) {
                continue;
            }
            // This reaction should only happen on scale INCREASE.
            if (triggeringEffectArgs.amount <= 0) {
                continue;
            }
            if (current_args.condition_scale_exceeds_25) {
                if (owner.scale > 25) {
                    // The condition is met, proceed.
                } else {
                    continue;
                }
            }
        }

        if (card.name === 'グローバリズム' && triggeredEffectType === TriggerType.PLAYER_PLAY_CARD_ACTION) {
            // Should only trigger on opponent's card play, not self-play.
            if (!triggeringEffectArgs || triggeringEffectArgs.player_id === owner.id) {
                continue;
            }
        }

        if (card.name === '分離主義' && triggeredEffectType === TriggerType.CARD_ADDED_TO_HAND_OWNER) {
            const target_card = owner.hand[owner.hand.length - 1];
            if (target_card) {
                if (!(target_card.required_scale > owner.scale)) {
                    continue;
                }
            }
        }

        if (card.name === '社会主義' && triggeredEffectType === TriggerType.CARD_PLACED_OWNER) {
            const placed_card = gameState.all_card_instances[triggeringEffectArgs.card_id];
            if (!placed_card || placed_card.name !== 'マネー') {
                continue;
            }
        }

        if (card.name === 'アナーキズム' && triggeredEffectType === TriggerType.CARD_PLACED_OWNER) {
            const placed_card = gameState.all_card_instances[triggeringEffectArgs.card_id];
            if (placed_card) {
                if (placed_card.card_type !== CardType.WEALTH) {
                    return [];
                }
            }
        }

        if (current_args.condition_money_durability_ge_10) {
            const moneyCard = owner.field.find(c => c.name === 'マネー');
            if (!moneyCard || moneyCard.current_durability < 10) {
                continue;
            }
        }
        if (current_args.condition_field_wealth_count_ge_3) {
            const wealthCount = owner.field.filter(c => c.card_type === CardType.WEALTH).length;
            if (wealthCount < 3) {
                continue;
            }
        }
        if (!checkCondition(current_args.condition_self_consciousness_higher, owner.consciousness > opponent.consciousness)) {
            continue;
        }
        if (!checkCondition(current_args.condition_opponent_consciousness_higher, opponent.consciousness > owner.consciousness)) {
            continue;
        }
        if (!checkCondition(current_args.condition_self_consciousness_lower, owner.consciousness < opponent.consciousness)) {
            continue;
        }
        if (!checkCondition(current_args.condition_opponent_consciousness_lower, opponent.consciousness < owner.consciousness)) {
            continue;
        }

        if (!checkCondition(current_args.condition_self_scale_higher, owner.scale > opponent.scale)) {
            continue;
        }
        if (!checkCondition(current_args.condition_opponent_scale_higher, opponent.scale > owner.scale)) {
            continue;
        }
        if (!checkCondition(current_args.condition_self_scale_lower, owner.scale < opponent.scale)) {
            continue;
        }
        if (!checkCondition(current_args.condition_opponent_scale_lower, opponent.scale < owner.scale)) {
            continue;
        }

        if (!checkCondition(current_args.condition_fewer_wealth_than_opponent, owner.field.length < opponent.field.length)) {
            continue;
        }
        if (!checkCondition(current_args.condition_opponent_deck_smaller, opponent.deck.length < owner.deck.length)) {
            continue;
        }

        if (card.name === '多極主義' && cardEffect.effect_type === EffectType.ADD_CARD_TO_GAME) {
            if (current_args.initial_durability_based_on_scale_percentage) {
                const percentage = current_args.initial_durability_based_on_scale_percentage;
                current_args.initial_durability = Math.max(1, Math.floor(owner.scale * percentage / 100));
                delete current_args.initial_durability_based_on_scale_percentage;
            }
        }

        if (card.name === 'ネオリベラリズム' && cardEffect.effect_type === EffectType.ADD_CARD_TO_GAME) {
            if (current_args.initial_durability_based_on_field_wealth_count_plus_one) {
                const field_wealth_count = owner.field.filter(c => c.card_type === CardType.WEALTH).length;
                current_args.initial_durability = field_wealth_count + 1;
                delete current_args.initial_durability_based_on_field_wealth_count_plus_one;
            }
        }

        if (current_args.amount_based_on_self_durability) {
            const durability = card.current_durability !== undefined ? card.current_durability : card.durability;
            current_args.amount = current_args.amount_based_on_self_durability === 'minus' ? -durability : durability;
        }
        if (current_args.amount_based_on_opponent_field_wealth_count) {
            current_args.amount = opponent.field.filter(c => c.card_type === CardType.WEALTH).length;
        }
        if (current_args.amount_based_on_money_durability) {
            const moneyCard = owner.field.find(c => c.name === 'マネー');
            if (!moneyCard) {
                continue;
            }
            current_args.amount = moneyCard.current_durability;
        }
        if (current_args.amount_based_on_removed_discard_count) {
            current_args.amount = gameState.temp_effect_data.removed_discard_count || 0;
        }
        if (current_args.amount_based_on_temp_value) {
            current_args.amount = gameState.temp_effect_data[current_args.amount_based_on_temp_value] || 0;
        }
        if (current_args.amount_based_on_field_wealth_count) {
            current_args.amount = owner.field.filter(c => c.card_type === CardType.WEALTH).length;
            delete current_args.amount_based_on_field_wealth_count;
        }
        if (current_args.amount_based_on_discard_count) {
            current_args.amount = owner.discard.length;
            delete current_args.amount_based_on_discard_count;
        }

        // Add the source card id to all reaction effects for better tracking
        current_args.source_card_id = card.instance_id;

        if (card.name === 'ポピュリズム' && cardEffect.effect_type === EffectType.ADD_CARD_TO_GAME) {
            if (current_args.initial_durability_based_on_scale) {
                current_args.initial_durability = Math.max(1, owner.scale);
                delete current_args.initial_durability_based_on_scale;
            }
        }
        if (card.name === '重農主義' && triggeredEffectType === TriggerType.END_TURN_OWNER) {
            if (owner.cards_played_this_turn === 0) {
                continue;
            }
        }
        if (card.name === '多極主義' && triggeredEffectType === TriggerType.CARD_ADDED_TO_HAND_OWNER) {
            const target_card = owner.hand[owner.hand.length - 1];
            if (!target_card || target_card.card_type !== CardType.IDEOLOGY) {
                continue;
            }
        }
        if (card.name === '終末' && triggeredEffectType === TriggerType.CARD_DRAWN_THIS) { 
            if (!triggeredEffect.args || triggeredEffect.args.target_card_id !== card.instance_id) {
                continue;
            }
        }

        reactionEffects.push({ effect_type: cardEffect.effect_type, args: current_args, target_card_id: card.instance_id, target_player_id: card.owner, target_type: "card", target_card_type: card.card_type });
        if (cardEffect.effect_type === EffectType.ADD_MODIFY_PARAMETER_CORRECTION) {
            console.log(`[checkCardReaction] Pushed ADD_MODIFY_PARAMETER_CORRECTION from ${card.name} for trigger ${triggeredEffectType}`);
        }

    }

    if (reactionEffects.length > 0) {
            }
        
            return reactionEffects;
        };