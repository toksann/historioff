import { produce } from "immer";
import { createCardInstance, shuffle } from './gameUtils.js';
import { PlayerId, TriggerType, CardType, EffectType } from './constants.js';
import { checkCardReaction } from './card.js';
import { _updateGameOverState } from './gameOver.js';
import LogEntryGenerator from './LogEntryGenerator.js'; // Import LogEntryGenerator

const logEntryGenerator = new LogEntryGenerator(); // Instantiate LogEntryGenerator globally
let globalEffectLogger = null;

const modifyParameterCorrectionCalculation = (gameState, playerId, correctTarget, correctDirection, amount) => {
    const player = gameState.players[playerId];
    if (!player || !player.modify_parameter_corrections || player.modify_parameter_corrections.length === 0) {
        return amount;
    }

    let limit = null;
    let amplification = 0;
    let attenuation = 0;
    const usedCorrections = [];

    // 1. Collect all applicable corrections and mark them for removal
    player.modify_parameter_corrections.forEach((correction, index) => {
        if (correction.correct_target === correctTarget && correction.correct_direction === correctDirection) {
            usedCorrections.push(index);
            switch (correction.correct_type) {
                case 'limit':
                    if (limit === null || correction.amount < limit) {
                        limit = correction.amount;
                    }
                    break;
                case 'amplification':
                    amplification += correction.amount;
                    break;
                case 'attenuation':
                    attenuation += correction.amount;
                    break;
                default:
                    // 未知の補正タイプは無視
                    break;
            }
        }
    });

    if (usedCorrections.length === 0) {
        return amount;
    }

    // 2. Calculate the final amount based on collected corrections
    let finalAmount = amount;
    const correctionValue = amplification - attenuation;
    const sign = amount >= 0 ? 1 : -1;

    finalAmount = Math.max(0, Math.abs(amount) + correctionValue) * sign;
    
    // 3. Apply limit
    if (limit !== null) {
        if (Math.abs(finalAmount) > Math.abs(limit)) {
            finalAmount = limit * sign;
        }
    }

    // 4. Remove all used corrections from the player's list
    const uniqueUsedIndexes = [...new Set(usedCorrections)];
    uniqueUsedIndexes.sort((a, b) => b - a).forEach(index => {
        player.modify_parameter_corrections.splice(index, 1);
    });

    return finalAmount;
};

const enforceHandLimit = (gameState, player, cardToAdd, effectsQueue, sourceCard) => {
    if (player.hand.length >= player.hand_capacity) {
        // 手札の上限到達警告演出をトリガー
        // Push to gameState.animation_queue instead of effectsQueue
        gameState.animation_queue.push({
            effect: {
                effect_type: 'LIMIT_WARNING',
                args: {
                    player_id: player.id,
                    limit_type: 'hand',
                    message: '手札の上限に達しています'
                }
            },
            sourceCard: null
        });
        
        // 手札上限超過時は捨て札に移動
        player.discard.push(cardToAdd);
        cardToAdd.location = 'discard';
        return false; // 手札に追加しない
    }
    return true; // 手札に追加可能
};

const _getTargetPlayers = (gameState, selfPlayerId, targetPlayerIdStr) => {
    if (Array.isArray(targetPlayerIdStr)) {
        return targetPlayerIdStr.map(id => gameState.players[id]);
    }
    const opponentPlayerId = selfPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
    switch (targetPlayerIdStr) {
        case 'self':
            return [gameState.players[selfPlayerId]];
        case 'opponent':
            return [gameState.players[opponentPlayerId]];
        case 'self_and_opponent':
            return [gameState.players[selfPlayerId], gameState.players[opponentPlayerId]];
        default:
            return [gameState.players[targetPlayerIdStr]]; 
    }
};

const _getCardsFromPiles = (player, source_piles, card_type) => {
      let cards = [];
      if (!player || !source_piles) return cards;

      source_piles.forEach(pileName => {
          const pile = player[pileName];
          if (pile) {
              const cardsInPile = Array.isArray(pile) ? pile : [pile];
  
              const filteredCards = cardsInPile.filter(c => {
                  const match = !card_type || c.card_type === card_type;
                  return match;
              });
              cards.push(...filteredCards);
          }
      });
      return cards;
  };

const _selectCards = (gameState, player, available_cards, selection_method, count, sourceCard, original_args) => {
    if (!available_cards || available_cards.length === 0) return [];
    // For 'choice' selection method, default to 1 if count is not specified
    const selectionCount = count != null ? count : (selection_method === 'choice' ? 1 : available_cards.length);

    switch (selection_method) {
        case 'all':
            return available_cards;
        case 'random':
            return shuffle([...available_cards]).slice(0, selectionCount);
        case 'highest_required_scale':
            return [...available_cards].sort((a, b) => b.required_scale - a.required_scale).slice(0, selectionCount);
        case 'lowest_durability':
            const numToSelect = count != null ? count : 1;
            return [...available_cards].sort((a, b) => {
                const durabilityA = a.current_durability !== undefined ? a.current_durability : a.durability;
                const durabilityB = b.current_durability !== undefined ? b.current_durability : b.durability;
                return durabilityA - durabilityB;
            }).slice(0, numToSelect);
        case 'top':
            return available_cards.slice(0, selectionCount);
        case 'bottom':
            return available_cards.slice(-selectionCount);
        case 'choice':
            gameState.awaiting_input = {
                type: 'CHOICE_CARDS_FOR_OPERATION',
                options: available_cards,
                player_id: player.id,
                source_card_instance_id: sourceCard.instance_id,
                source_card_name: sourceCard.name,
                count: selectionCount,
                source_effect: { 
                    effect_type: EffectType.PROCESS_CARD_OPERATION,
                    args: { ...original_args, selection_method: 'pre_selected' },
                },
                // Add context information for turn management
                is_turn_end_effect: gameState.processing_status?.is_processing_turn_end || false
            };
            return null;
        case 'pre_selected':
            const selectedCards = original_args.selected_cards;
            // selected_cardsが配列でない場合の安全な処理
            if (!Array.isArray(selectedCards)) {
                // console.warn('[_selectCards] selected_cards is not an array:', selectedCards);
                return [];
            }
            // selectedCardsはカードオブジェクトの配列なので、instance_idを抽出
            const selectedIds = new Set(selectedCards.map(card => 
                typeof card === 'object' && card.instance_id ? card.instance_id : card
            ));
            return available_cards.filter(card => selectedIds.has(card.instance_id));
        default:
            return [];
    }
};

const syncCardDataInAllPiles = (draftState, cardId, updatedData) => {
    let cardFoundAndUpdated = false; // 更新があったかどうかを追跡するフラグ

    // 1. all_card_instances を更新
    if (draftState.all_card_instances[cardId]) {
        for (const key in updatedData) {
            if (draftState.all_card_instances[cardId][key] !== updatedData[key]) {
                draftState.all_card_instances[cardId][key] = updatedData[key];
                cardFoundAndUpdated = true;
            }
        }
    } else {
        return;
    }

    // 2. players の中のカードも更新する
    for (const playerId in draftState.players) {
        const player = draftState.players[playerId];
        const piles = ['hand', 'field', 'deck', 'discard'];
        piles.forEach(pileName => {
            if (player[pileName] && Array.isArray(player[pileName])) {
                const cardIndex = player[pileName].findIndex(c => c.instance_id === cardId);
                if (cardIndex !== -1) {
                    for (const key in updatedData) {
                         if (player[pileName][cardIndex][key] !== updatedData[key]) {
                            player[pileName][cardIndex][key] = updatedData[key];
                            cardFoundAndUpdated = true;
                        }
                    }
                }
            }
        });
        if (player.ideology && player.ideology.instance_id === cardId) {
            for (const key in updatedData) {
                if (player.ideology[key] !== updatedData[key]) {
                    player.ideology[key] = updatedData[key];
                    cardFoundAndUpdated = true;
                }
            }
        }
    }

    // 3. 変更があった場合、gameStateのトップレベルプロパティを更新してImmerに検知させる
    if (cardFoundAndUpdated) {
        draftState.lastUpdate = Date.now();
    }
};

const effectHandlers = {
    [EffectType.PLAYER_ACTION]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, action_type, card_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        if (action_type === 'play_card') {
            const card = player.hand.find(c => c.instance_id === card_id);
            if (!card) return;

            player.cards_played_this_turn = (player.cards_played_this_turn || 0) + 1;

            const addEffect = (type, effectArgs, srcCard) => {
                effectsQueue.unshift([{ effect_type: type, args: effectArgs }, srcCard]);
            };
            const addEffectToBack = (type, effectArgs, srcCard) => {
                effectsQueue.push([{ effect_type: type, args: effectArgs }, srcCard]);
            }

            if (card.card_type === CardType.EVENT) {
                if (card.name !== '官僚主義') {
                    addEffect(EffectType.MOVE_CARD, {
                        card_id: card.instance_id,
                        source_pile: 'playing_event',
                        destination_pile: 'discard',
                        player_id: player_id,
                    }, card);
                }

                const playEventArgs = {
                    player_id: player_id,
                    card_id: card.instance_id,
                    target_card_id: args.target_card_id || card.instance_id
                };
                addEffect(TriggerType.PLAY_EVENT_THIS, playEventArgs, card);
                
                addEffect(EffectType.MOVE_CARD, {
                    card_id: card.instance_id,
                    source_pile: 'hand',
                    destination_pile: 'playing_event',
                    player_id: player_id,
                }, card);

                const ownerPlayerId = player_id;
                const opponentPlayerId = ownerPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
                const baseEventArgs = { card_id: card.instance_id, target_card_id: card.instance_id, card_type: card.card_type };
                const ownerEventArgs = { ...baseEventArgs, player_id: ownerPlayerId, target_player_id: ownerPlayerId };
                const opponentEventArgs = { ...baseEventArgs, player_id: ownerPlayerId, target_player_id: opponentPlayerId };

                addEffectToBack(TriggerType.PLAY_EVENT, ownerEventArgs, card);
                addEffectToBack(TriggerType.PLAY_EVENT_OWNER, ownerEventArgs, card);
                addEffectToBack(TriggerType.PLAY_EVENT_OPPONENT, opponentEventArgs, card);
                
                // 汎用、オーナー限定、相手限定の3つのトリガーをすべて発行
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION, { player_id: player_id, action_type: 'card_played', card_id: card.instance_id, target_card_id: card.instance_id }, card);
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION_OWNER, { player_id: ownerPlayerId, action_type: 'card_played', card_id: card.instance_id }, card);
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION_OPPONENT, { player_id: opponentPlayerId, action_type: 'card_played', card_id: card.instance_id }, card);


            } else { // Wealth & Ideology
                // Queue the effect to move the played card from hand to the field/ideology slot.
                // This is queued first so it executes *after* the old ideology is discarded.
                addEffect(EffectType.MOVE_CARD, {
                    card_id: card.instance_id,
                    source_pile: 'hand',
                    destination_pile: card.card_type === CardType.IDEOLOGY ? 'ideology' : 'field',
                    player_id: player_id,
                }, card);
                
                const ownerPlayerId = player_id;
                const opponentPlayerId = ownerPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
                
                // 汎用、オーナー限定、相手限定の3つのトリガーをすべて発行
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION, { player_id: player_id, action_type: 'card_played', card_id: card.instance_id, target_card_id: card.instance_id }, card);
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION_OWNER, { player_id: ownerPlayerId, action_type: 'card_played', card_id: card.instance_id }, card);
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION_OPPONENT, { player_id: opponentPlayerId, action_type: 'card_played', card_id: card.instance_id }, card);
            }
            gameState.temp_effect_data["last_played_card_id"] = card.instance_id;
        }
    },
    [TriggerType.START_TURN]: () => {},
    [TriggerType.END_TURN_OWNER]: () => {},
    [TriggerType.PLAY_EVENT_THIS]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        // This trigger is a signal for cards to react to their own play event.
        // The actual effects are handled by the checkAllReactions -> checkCardReaction flow.
        // Therefore, this handler itself does nothing.
    },
    [TriggerType.DAMAGE_THIS]: () => {},
    [TriggerType.WEALTH_DURABILITY_ZERO]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, target_player_id, card_id, target_card_id } = args;
        const eventArgs = { player_id, target_player_id, card_id, target_card_id };
        effectsQueue.unshift([{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT, args: eventArgs }, sourceCard]);
    },

    [EffectType.DRAW_CARD]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];

        if (player && player.deck.length > 0) {
            effectsQueue.unshift([{
                effect_type: EffectType.MOVE_CARD,
                args: {
                    player_id: player_id,
                    card_id: 'draw_from_deck',
                    source_pile: 'deck',
                    destination_pile: 'hand',
                }
            }, sourceCard]);
        }
    },

    [EffectType.ADD_CARD_TO_GAME]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, card_template_name, destination_pile, count = 1, position, condition_field_wealth_limit } = args;
        let { initial_durability } = args;
        const player = gameState.players[player_id];
        const cardTemplate = gameState.cardDefs[card_template_name];

        if (player && cardTemplate) {
            if (condition_field_wealth_limit !== undefined) {
                const limit = condition_field_wealth_limit > 0 ? condition_field_wealth_limit : player.field_limit;
                const wealthOnField = player.field.filter(c => c.card_type === CardType.WEALTH).length;

                if (wealthOnField >= limit) {
                    return;
                }
            }

            if (typeof initial_durability === 'string') {

                if (initial_durability === 'self_all_wealth_on_field') {
                    initial_durability = player.field
                        .filter(c => c.card_type === CardType.WEALTH)
                        .reduce((sum, card) => sum + (Math.max(card.current_durability, 0)), 0);
                }
                initial_durability = Math.max(0, initial_durability);
            } else if (args.initial_durability_based_on_field_wealth_total) { // Added this block
                initial_durability = player.field
                    .filter(c => c.card_type === CardType.WEALTH)
                    .reduce((sum, card) => sum + (card.current_durability || 0), 0);
                initial_durability = Math.max(0, initial_durability);
            }
            initial_durability = initial_durability === 0 ? null : initial_durability;

            for (let i = 0; i < count; i++) {
                const newCard = createCardInstance(cardTemplate, player_id);
                if (initial_durability === null && cardTemplate.card_type === CardType.WEALTH) break;
                if (initial_durability !== undefined) {
                    newCard.durability = initial_durability;
                    newCard.current_durability = initial_durability;
                }
                // Register the new card in all_card_instances
                gameState.all_card_instances[newCard.instance_id] = newCard;
                
                if (destination_pile === 'field') {

                    if (newCard.card_type === CardType.IDEOLOGY) {
                        if (player.ideology) {
                            player.ideology.location = 'discard';
                            player.discard.push(player.ideology);
                        }

                        player.ideology = newCard;
                        newCard.location = 'field'; 
                    } else {
                        player.field.push(newCard);
                        newCard.location = 'field';
                    }

                } else if (player[destination_pile] && Array.isArray(player[destination_pile])) {
                    if (destination_pile === 'deck') {
                        if (position === 'top') {
                            player.deck.unshift(newCard);
                        }
                        else { 
                            player.deck.push(newCard);
                        }
                    } else {
                        // Check hand limit before adding to hand
                        if (destination_pile === 'hand') {
                            if (!enforceHandLimit(gameState, player, newCard, effectsQueue, sourceCard)) {
                                // Card was moved to discard due to hand limit, skip adding to hand
                                continue;
                            }
                        }
                        player[destination_pile].push(newCard);
                    }
                    newCard.location = destination_pile;

                    const eventArgs = {
                        player_id: newCard.owner,
                        target_player_id: newCard.owner,
                        card_id: newCard.instance_id,
                        target_card_id: newCard.instance_id,
                        card_type: newCard.card_type,
                        source_pile: 'game_source',
                        destination_pile: destination_pile,
                    };

                    if (destination_pile === 'hand') {
                        const addEffect = (type, args) => {
                            effectsQueue.unshift([{ effect_type: type, args: args }, sourceCard || newCard]);
                        };
                        addEffect(TriggerType.CARD_ADDED_TO_HAND_THIS, eventArgs);
                        addEffect(TriggerType.CARD_ADDED_TO_HAND, eventArgs);
                        addEffect(TriggerType.CARD_ADDED_TO_HAND_OWNER, eventArgs);
                    }
                } else {
                }
            }
        }
    },

        
    [EffectType.REMOVE_CARD_FROM_GAME]: (gameState, args) => {
        const { card_id, player_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const piles = ['hand', 'deck', 'field', 'discard'];
        let cardRemoved = false;
        for (const pileName of piles) {
            const pile = player[pileName];
            if(Array.isArray(pile)){
                const originalLength = pile.length;
                const newPile = pile.filter(c => c.instance_id !== card_id);
                if (originalLength > newPile.length) {
                    player[pileName] = newPile;
                    cardRemoved = true;
                    break; 
                }
            }
        }
        if (!cardRemoved && player.ideology && player.ideology.instance_id === card_id) {
            player.ideology = null;
            cardRemoved = true;
        }

        if (cardRemoved) {
            // global.testHooks was removed as it's for testing purposes and not available in the browser.
        }
    },
    [EffectType.MODIFY_CONSCIOUSNESS]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            const originalAmount = amount;
            const finalAmount = modifyParameterCorrectionCalculation(gameState, player_id, 'consciousness', amount > 0 ? 'increase' : 'decrease', amount);
            gameState.temp_effect_data.last_consciousness_change = finalAmount;
            
            // Store decrease amount for threshold checking (Python version compatibility)
            if (finalAmount < 0) {
                const tempKey = `${player_id}_last_consciousness_decrease`;
                gameState.temp_effect_data[tempKey] = Math.abs(finalAmount);
            }
            
            gameState.players[player_id].consciousness += finalAmount;
            
            // Add trigger for card reactions
            const triggerArgs = { ...args, target_player_id: player_id };
            effectsQueue.unshift([{ effect_type: TriggerType.MODIFY_CONSCIOUSNESS, args: triggerArgs }, sourceCard]);
            
            // Add actual change result for accurate logging
            // Show log if there's any change OR if correction occurred (even if result is 0)
            if (finalAmount !== 0 || originalAmount !== finalAmount) {
                // 軽減により効果が無効化された場合の演出
                if (originalAmount !== 0 && finalAmount === 0) { // Removed gameState.presentationController check
                    // console.log('🎮GAME_ANIM [EffectHandler] Adding EFFECT_NULLIFIED effect - Consciousness change nullified by correction');
                    effectsQueue.push([{ // Changed to effectsQueue.push
                        effect_type: 'EFFECT_NULLIFIED',
                        args: {
                            target_card_id: sourceCard?.instance_id,
                            reason: 'correction_nullified',
                            message: '意識変化が軽減により無効化されました'
                        }
                    }, sourceCard]);
                }
                
                const changeArgs = {
                    player_id,
                    original_amount: originalAmount,
                    actual_amount: finalAmount,
                    source_card_id: args.source_card_id || (sourceCard ? sourceCard.instance_id : null)
                };
                
                // Add to animation queue for visual effect
                gameState.animation_queue.push({
                    effect: {
                        effect_type: EffectType.CONSCIOUSNESS_CHANGED,
                        args: changeArgs
                    },
                    sourceCard: sourceCard
                });

                effectsQueue.unshift([{ effect_type: EffectType.CONSCIOUSNESS_CHANGED, args: changeArgs }, sourceCard]);
                effectsQueue.unshift([{ effect_type: EffectType.CHECK_GAME_OVER, args: {} }, sourceCard]);
            }
        }
    },
    [EffectType.MODIFY_SCALE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            const originalAmount = amount;
            const finalAmount = modifyParameterCorrectionCalculation(gameState, player_id, 'scale', amount > 0 ? 'increase' : 'decrease', amount);
            gameState.temp_effect_data.last_scale_change = finalAmount;
            // Apply scale change with minimum value of 0 to prevent negative scale
            gameState.players[player_id].scale = Math.max(0, gameState.players[player_id].scale + finalAmount);
            
            // Add actual change result for accurate logging
            // Show log if there's any change OR if correction occurred (even if result is 0)
            if (finalAmount !== 0 || originalAmount !== finalAmount) {
                // 軽減により効果が無効化された場合の演出
                if (originalAmount !== 0 && finalAmount === 0) { // Removed gameState.presentationController check
                    // console.log('🎮GAME_ANIM [EffectHandler] Adding EFFECT_NULLIFIED effect - Scale change nullified by correction');
                    effectsQueue.push([{ // Changed to effectsQueue.push
                        effect_type: 'EFFECT_NULLIFIED',
                        args: {
                            target_card_id: sourceCard?.instance_id,
                            reason: 'correction_nullified',
                            message: '規模変化が軽減により無効化されました'
                        }
                    }, sourceCard]);
                }
                
                const changeArgs = {
                    player_id,
                    original_amount: originalAmount,
                    actual_amount: finalAmount,
                    source_card_id: args.source_card_id || (sourceCard ? sourceCard.instance_id : null)
                };
                
                // Add to animation queue for visual effect
                gameState.animation_queue.push({
                    effect: {
                        effect_type: EffectType.SCALE_CHANGED,
                        args: changeArgs
                    },
                    sourceCard: sourceCard
                });

                effectsQueue.unshift([{ effect_type: EffectType.SCALE_CHANGED, args: changeArgs }, sourceCard]);
            }
        }
    },
    [EffectType.SET_CONSCIOUSNESS]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            gameState.players[player_id].consciousness = Math.max(0, amount);
            effectsQueue.unshift([{ effect_type: EffectType.CHECK_GAME_OVER, args: {} }, sourceCard]);
        }
    },
    [EffectType.SET_SCALE]: (gameState, args) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            gameState.players[player_id].scale = Math.max(0, amount);
        }
    },
    [EffectType.MODIFY_CARD_DURABILITY]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        let resolved_card_id = args.card_id;
        const playerContext = gameState.players[sourceCard ? sourceCard.owner : args.player_id]; // Determine player context
        const originalAmount = args.amount; // Store original amount for triggers

        // --- ABSTRACT TARGET RESOLUTION LOGIC ---
        if (typeof args.card_id === 'string') {
            if (args.card_id === 'self_money_on_field' && sourceCard) {
                if (playerContext) {
                    const moneyCard = playerContext.field.find(c => c.name === 'マネー');
                    if (moneyCard) {
                        resolved_card_id = moneyCard.instance_id;
                    } else {
                        resolved_card_id = null; // No money card on field
                    }
                } else { resolved_card_id = null; } // No player context
            } else if (args.card_id === 'front' && sourceCard) {
                if (playerContext) {
                    const opponent = gameState.players[playerContext.id === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
                    if (opponent && sourceCard) {
                        const card_index_on_field = playerContext.field.findIndex(c => c.instance_id === sourceCard.instance_id);
                        if (card_index_on_field !== -1 && opponent.field.length > card_index_on_field) {
                            resolved_card_id = opponent.field[card_index_on_field].instance_id;
                        } else {
                            resolved_card_id = null; // No card in front.
                        }
                    } else { resolved_card_id = null; } // No opponent or sourceCard.
                } else { resolved_card_id = null; } // No player context.
            } else if (args.card_id === 'left_opponent' && sourceCard) {
                if (playerContext) {
                    const opponent = gameState.players[playerContext.id === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
                    if (opponent && opponent.field.length > 0) {
                        const targetCard = opponent.field[0];
                        if (targetCard) {
                            resolved_card_id = targetCard.instance_id;
                        } else {
                            resolved_card_id = null; // No card on opponent's field.
                        }
                    } else { resolved_card_id = null; } // No opponent or no cards on opponent's field.
                } else { resolved_card_id = null; } // No player context.
            }
        }
        // --- END ABSTRACT TARGET RESOLUTION LOGIC ---

        const targetCardRef = gameState.all_card_instances[resolved_card_id];

        // --- TARGET VALIDITY CHECK (if target resolution failed) ---
        if (!targetCardRef) {
            if (sourceCard) { // Trigger FAILED_PROCESS if sourceCard exists
                effectsQueue.unshift([{
                    effect_type: TriggerType.FAILED_PROCESS,
                    args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: args.card_id } // Use original args.card_id for context
                }, sourceCard]);
            }
            return;
        }

        // --- Dispatch RESERVE owner triggers after target resolution ---
        const triggerArgsForOwnerReserve = { ...args, card_id: resolved_card_id, target_card_id: resolved_card_id, target_player_id: targetCardRef.owner };
        if (originalAmount > 0) {
            effectsQueue.unshift([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_INCREASE_RESERVE_OWNER, args: triggerArgsForOwnerReserve }, sourceCard]);
        } else if (originalAmount < 0) {
            effectsQueue.unshift([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_DECREASE_RESERVE_OWNER, args: triggerArgsForOwnerReserve }, sourceCard]);
        }

        // --- Actual Damage Application Logic ---
        // "Mountain" card's passive damage immunity removed as per architectural guidance.
        // The check for targetCard.current_durability <= 0 is explicitly NOT added here.

        if (targetCardRef && (targetCardRef.location === 'field' || targetCardRef.location === 'ideology')) {
            const finalAmount = modifyParameterCorrectionCalculation(gameState, targetCardRef.owner, 'wealth', originalAmount > 0 ? 'increase' : 'decrease', originalAmount);
            
            const currentDurability = targetCardRef.current_durability !== undefined ? targetCardRef.current_durability : targetCardRef.durability;
            const newDurability = currentDurability + finalAmount;

            syncCardDataInAllPiles(gameState, resolved_card_id, { current_durability: newDurability });
            
            if (finalAmount !== 0 || originalAmount !== finalAmount) {
                if (originalAmount !== 0 && finalAmount === 0) {
                    effectsQueue.push([{
                        effect_type: 'EFFECT_NULLIFIED',
                        args: { target_card_id: resolved_card_id, reason: 'correction_nullified', message: '財ダメージが軽減により無効化されました' }
                    }, sourceCard]);
                }
                
                const changeArgs = {
                    card_id: resolved_card_id,
                    original_amount: originalAmount,
                    actual_amount: finalAmount,
                    source_card_id: args.source_card_id || (sourceCard ? sourceCard.instance_id : null),
                    new_durability: newDurability
                };
                
                gameState.animation_queue.push({
                    effect: {
                        effect_type: EffectType.CARD_DURABILITY_CHANGED,
                        args: changeArgs
                    },
                    sourceCard: sourceCard
                });
                
                effectsQueue.unshift([{ effect_type: EffectType.CARD_DURABILITY_CHANGED, args: changeArgs }, sourceCard]);
            }

            if (finalAmount < 0) {
                effectsQueue.unshift([{ 
                    effect_type: TriggerType.DAMAGE_THIS, 
                    args: { 
                        damaged_card_id: resolved_card_id, 
                        damage_amount: finalAmount,
                        source_card_id: sourceCard ? sourceCard.instance_id : null,
                        target_card_id: resolved_card_id
                    }, 
                    target_card_id: resolved_card_id 
                }, sourceCard]);
            }
            if (newDurability <= 0) {
                const ownerPlayerId = targetCardRef.owner;
            
                const baseArgs = {
                    player_id: ownerPlayerId,
                    card_id: resolved_card_id,
                    target_card_id: resolved_card_id,
                };
            
                const ownerArgs = { ...baseArgs, target_player_id: ownerPlayerId };

                const delayedEffects = [
                    [{ effect_type: EffectType.MOVE_CARD, args: {
                        player_id: targetCardRef.owner,
                        card_id: resolved_card_id,
                        source_pile: 'field',
                        destination_pile: 'discard',
                        source_card_id: sourceCard ? sourceCard.instance_id : null,
                    }}, sourceCard],
                    [{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO, args: ownerArgs }, targetCardRef],
                    [{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_OWNER, args: ownerArgs }, targetCardRef],
                    [{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_THIS, args: ownerArgs }, targetCardRef]
                ];
                
                if (!gameState.delayedEffects) {
                    gameState.delayedEffects = [];
                }
                gameState.delayedEffects.push(...delayedEffects);
            }
            if (sourceCard) {
                effectsQueue.unshift([{
                    effect_type: TriggerType.SUCCESS_PROCESS,
                    args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: resolved_card_id }
                }, sourceCard]);
            }
        } else {
            if (sourceCard) {
                effectsQueue.unshift([{
                    effect_type: TriggerType.FAILED_PROCESS,
                    args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: resolved_card_id }
                }, sourceCard]);
            }
        }
    },
    [EffectType.MODIFY_CARD_REQUIRED_SCALE]: (draftState, args) => {
        const { card_id, amount, min_value = 0, set_value = false } = args;
        const targetCard = draftState.all_card_instances[card_id];

        if (targetCard) {
            let new_scale;
            if (set_value) {
                new_scale = Math.max(min_value, amount);
            } else {
                new_scale = Math.max(min_value, targetCard.required_scale + amount);
            }
            
            syncCardDataInAllPiles(draftState, card_id, { required_scale: new_scale });
        }
    },
    [EffectType.MODIFY_FIELD_LIMIT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const new_limit = player.field_limit + amount;
        const current_field_cards = player.field.length;

        if (amount < 0) { // This is a decrease
            if (new_limit < current_field_cards) { // If new limit is less than current cards on field, it's a failure
                if (sourceCard) {
                    effectsQueue.unshift([{
                        effect_type: TriggerType.FAILED_PROCESS,
                        args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: sourceCard.instance_id }
                    }, sourceCard]);
                }
                return;
            } else { // Otherwise, it's a success
                if (sourceCard) {
                    effectsQueue.unshift([{
                        effect_type: TriggerType.SUCCESS_PROCESS,
                        args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: sourceCard.instance_id }
                    }, sourceCard]);
                }
            }
        }
        // Apply new limit after checking for decrease success/failure
        player.field_limit = Math.max(0, new_limit);
    },

    [EffectType.MOVE_CARD]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        let { player_id, card_id, source_pile, destination_pile, maintain = false , card_to_move = null } = args;

        const destination_player_id = args.target_player_id || player_id;
        const destination_player = gameState.players[destination_player_id];
        if (!destination_player) {
            return;
        }

        if (card_id === 'draw_from_deck') {
            const player = gameState.players[player_id];
            if (player && player.deck.length > 0) {
                const drawnCard = player.deck.shift();
                const newArgs = { ...args, card_id: drawnCard.instance_id, card_to_move: drawnCard };
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: newArgs }, sourceCard]);
            }
            return;
        }

        if (source_pile === 'discard_pile') source_pile = 'discard';
        if (destination_pile === 'discard_pile') destination_pile = 'discard';

        const player = gameState.players[player_id];
        if (!player) {
            return;
        }

        let cardToMove = card_to_move;
        let originalLocation = null;

        // Find and remove the card from its source pile in one go.
        if (!cardToMove && source_pile !== 'game_source') {
            const sourcePlayer = gameState.players[player_id];
            if (sourcePlayer) {
                if (source_pile === 'playing_event') {
                    // This is a temporary state. The card is likely passed via sourceCard or card_to_move.
                    cardToMove = (sourceCard && sourceCard.instance_id === card_id) ? sourceCard : null;
                } else if (source_pile === 'ideology') {
                    if (sourcePlayer.ideology && sourcePlayer.ideology.instance_id === card_id) {
                        cardToMove = sourcePlayer.ideology;
                        sourcePlayer.ideology = null;
                    }
                } else if (source_pile === 'field') {
                    let cardIndex = sourcePlayer.field.findIndex(c => c.instance_id === card_id);
                    if (cardIndex > -1) {
                        cardToMove = sourcePlayer.field.splice(cardIndex, 1)[0];
                    } else if (sourcePlayer.ideology && sourcePlayer.ideology.instance_id === card_id) {
                        // Ideology cards are logically on the field.
                        cardToMove = sourcePlayer.ideology;
                        sourcePlayer.ideology = null;
                    }
                } else if (sourcePlayer[source_pile] && Array.isArray(sourcePlayer[source_pile])) {
                    const pile = sourcePlayer[source_pile];
                    const cardIndex = pile.findIndex(c => c.instance_id === card_id);
                    if (cardIndex > -1) {
                        cardToMove = pile.splice(cardIndex, 1)[0];
                    }
                }
            }
        }

        if (!cardToMove) {
            // If card is still not found, it might have been passed directly.
            cardToMove = card_to_move;
        }
        
        if (!cardToMove) {
            return;
        }

        // Add CHECK_GAME_OVER effect if a card was moved from the deck
        if (source_pile === 'deck') {
            effectsQueue.unshift([{ effect_type: EffectType.CHECK_GAME_OVER, args: {} }, sourceCard]);
        }

        if (source_pile !== 'game_source') {
            originalLocation = cardToMove.location;
        }
        
        cardToMove.location = destination_pile;
        cardToMove.owner = args.target_player_id || player_id; // Update owner before pushing to destination

        if (!maintain && destination_pile !== 'field' && destination_pile !== 'discard') {
            const cardTemplate = gameState.cardDefs[cardToMove.name];
            if (cardTemplate) {
                const updates = {};
                if (cardToMove.name !== 'マネー' && cardToMove.card_type === CardType.WEALTH && cardTemplate.durability !== undefined) {
                    updates.durability = cardTemplate.durability;
                    updates.current_durability = cardTemplate.durability;
                }
                if (cardTemplate.required_scale !== undefined) {
                    updates.required_scale = cardTemplate.required_scale;
                }

                if (Object.keys(updates).length > 0) {
                    // Apply updates to the object we are holding
                    Object.assign(cardToMove, updates);
                    // Sync these updates to all other references of the card
                    syncCardDataInAllPiles(gameState, cardToMove.instance_id, updates);
                }
            }
        }

        if (destination_pile === 'ideology' || (destination_pile === 'field' && cardToMove.card_type === CardType.IDEOLOGY)) {
            // Check for same-name ideology bonus before replacing
            if (destination_player.ideology && 
                destination_player.ideology.instance_id !== cardToMove.instance_id &&
                destination_player.ideology.name === cardToMove.name) {
                // Same-name ideology placement bonus: +1 consciousness
                effectsQueue.unshift([{
                    effect_type: EffectType.MODIFY_CONSCIOUSNESS,
                    args: {
                        player_id: destination_player.id,
                        amount: 1
                    }
                }, cardToMove]);
            }
            
            // If there's an old ideology and we haven't handled its replacement yet
            if (destination_player.ideology && destination_player.ideology.instance_id !== cardToMove.instance_id && !args.is_after_replacement) {
                // To correctly handle replacement, we need to sequence two MOVE_CARD effects.
                
                // 2. Re-queue this MOVE_CARD effect to run *after* the old one is removed.
                //    This is queued first, so it runs second.
                const newArgs = { ...args, card_to_move: cardToMove, is_after_replacement: true };
                effectsQueue.unshift([{
                    effect_type: EffectType.MOVE_CARD,
                    args: newArgs
                }, sourceCard]);

                // 1. Queue the removal of the old ideology.
                //    This is queued second, so it runs first.
                effectsQueue.unshift([{
                    effect_type: EffectType.MOVE_CARD,
                    args: {
                        card_id: destination_player.ideology.instance_id,
                        source_pile: 'ideology',
                        destination_pile: 'discard',
                        player_id: destination_player_id
                    }
                }, cardToMove]);

                // 3. Early return to prevent the new card from being placed immediately.
                return;
            }
            
            // This part now runs only if there was no ideology to replace, 
            // or if the old one has already been moved.
            destination_player.ideology = cardToMove;
            cardToMove.location = 'field';
        } else if (destination_pile === 'field') {
            destination_player.field.push(cardToMove);
            cardToMove.location = 'field';
        } else if (destination_pile === 'playing_event') {
            // It's a temporary state, do not add to any specific pile.
            // Just update the card's location.
            cardToMove.location = 'playing_event';
        } else if (destination_player[destination_pile] && Array.isArray(destination_player[destination_pile])) {
             if (destination_pile === 'hand') {
                if (!enforceHandLimit(gameState, destination_player, cardToMove, effectsQueue, sourceCard)) {
                    // Card was moved to discard due to hand limit, location already set in enforceHandLimit
                } else {
                    destination_player[destination_pile].push(cardToMove);
                }
            } else {
                destination_player[destination_pile].push(cardToMove);
            }
        } else {
            if (originalLocation && destination_player[originalLocation]) {
                 destination_player[originalLocation].push(cardToMove);
                 cardToMove.location = originalLocation;
            }
            return;
        }

        // Ensure the location is synchronized in the central card instance registry.
        if (gameState.all_card_instances[cardToMove.instance_id]) {
            gameState.all_card_instances[cardToMove.instance_id].location = cardToMove.location;
        }

        const ownerPlayerId = cardToMove.owner;
        const opponentPlayerId = ownerPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;

        const baseEventArgs = {
            card_id: cardToMove.instance_id,
            target_card_id: cardToMove.instance_id,
            card_type: cardToMove.card_type,
            source_pile: source_pile,
            destination_pile: destination_pile,
        };

        const ownerEventArgs = { ...baseEventArgs, player_id: ownerPlayerId, target_player_id: ownerPlayerId };
        const opponentEventArgs = { ...baseEventArgs, player_id: ownerPlayerId, target_player_id: opponentPlayerId };

        const addEffect = (type, args) => {
            effectsQueue.unshift([{ effect_type: type, args: args }, sourceCard || cardToMove]);
        };

        if (destination_pile === 'field' || destination_pile === 'ideology') {
            // Add to animation queue for visual effect
            gameState.animation_queue.push({
                effect: {
                    effect_type: 'MOVE_CARD', // Use a generic CARD_PLACED for animation
                    args: {
                        player_id: ownerPlayerId,
                        card_id: cardToMove.instance_id,
                        card_type: cardToMove.card_type,
                        source_pile: 'hand',
                        destination_pile: destination_pile,
                    }
                },
                sourceCard: cardToMove
            });

            addEffect(TriggerType.CARD_PLACED_THIS, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED_OWNER, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED_OPPONENT, opponentEventArgs);
            
            // 場の上限チェック（財カードの場合のみ）
            if (destination_pile === 'field' && cardToMove.card_type === '財' && player.field.length >= player.field_limit) {
                gameState.animation_queue.push({
                    effect: {
                        effect_type: 'LIMIT_WARNING',
                        args: {
                            player_id: player.id,
                            limit_type: 'field',
                            message: '場の上限に達しました'
                        }
                    },
                    sourceCard: null
                });
            }
        }

        if (destination_pile === 'hand') {
            addEffect(TriggerType.CARD_ADDED_TO_HAND_THIS, ownerEventArgs);
            addEffect(TriggerType.CARD_ADDED_TO_HAND, ownerEventArgs);
            addEffect(TriggerType.CARD_ADDED_TO_HAND_OWNER, ownerEventArgs);

            if (source_pile === 'deck') {
                addEffect(TriggerType.CARD_DRAWN_THIS, ownerEventArgs);
                addEffect(TriggerType.CARD_DRAWN, ownerEventArgs);
                addEffect(TriggerType.CARD_DRAWN_OWNER, ownerEventArgs);

                // Add to animation queue for visual effect
                gameState.animation_queue.push({
                    effect: {
                        effect_type: EffectType.DRAW_CARD, // Use DRAW_CARD for animation
                        args: {
                            player_id: ownerPlayerId,
                            card_id: cardToMove.instance_id,
                            card_type: cardToMove.card_type,
                            source_pile: source_pile,
                            destination_pile: destination_pile,
                        }
                    },
                    sourceCard: cardToMove
                });
            }
        } 
        
        if (destination_pile === 'discard' && source_pile !== 'discard') {
            addEffect(TriggerType.CARD_DISCARDED_THIS, ownerEventArgs);
            addEffect(TriggerType.CARD_DISCARDED, ownerEventArgs);
            addEffect(TriggerType.CARD_DISCARDED_OWNER, ownerEventArgs);
        }
    },

    [EffectType.PROCESS_CARD_OPERATION]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        if (args.target_card_id === 'last_added_card') {
            if (args.triggering_effect_args && args.triggering_effect_args.card_id) {
                args.target_card_id = args.triggering_effect_args.card_id;
            } else {
                return;
            }
        }

        let { operation, source_piles, source_pile, card_type, selection_method, count } = args;

        // Handle special late-binding selections for durability modification
        if (operation === 'modify_durability' && (selection_method === 'front' || selection_method === 'left_opponent')) {
            effectsQueue.unshift([{ 
                effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, 
                args: { 
                    ...args, // Pass all args through
                    card_id: selection_method, // Use the selection_method string as the card_id
                }
            }, sourceCard]);
            return;
        }

        // source_pile の正規化
        if (source_pile === 'discard_pile') source_pile = 'discard';
        if (source_piles) {
            source_piles = source_piles.map(p => p === 'discard_pile' ? 'discard' : p);
        }

        const player_id = args.player_id || (sourceCard ? sourceCard.owner : null);
        const target_player_id = args.target_player_id || player_id;
        if (!player_id) {
            return;
        }

        const targetPlayers = _getTargetPlayers(gameState, player_id, target_player_id);

        for (const player of targetPlayers) {
            if (!player) continue;

            let targetCards = [];

            if (args.target_card_id) {
                const foundCard = Object.values(gameState.players)
                    .flatMap(p => [p.ideology, ...p.hand, ...p.deck, ...p.field, ...p.discard])
                    .find(c => c && c.instance_id === args.target_card_id);
                
                if (foundCard && foundCard.owner === player.id) {
                    targetCards.push(foundCard);
                }
            } else {
                if (source_pile && !source_piles) {
                    source_piles = [source_pile];
                } else if (!source_piles) {
                    source_piles = ['field'];
                }

                let availableCards = _getCardsFromPiles(player, source_piles, card_type);
                if (sourceCard) {
                    availableCards = availableCards.filter(c => c.instance_id !== sourceCard.instance_id);
                }
                // Exclude the card that triggered this operation, if applicable (e.g. a played event card)
                if (args.triggering_effect_args && args.triggering_effect_args.card_id) {
                    availableCards = availableCards.filter(c => c.instance_id !== args.triggering_effect_args.card_id);
                }
                
                const selected = _selectCards(gameState, player, availableCards, selection_method, count, sourceCard, args);
                if (selected === null) {
                    return;
                }
                targetCards = selected;
            }

            if (targetCards.length === 0) {
                continue;
            }

            if (args.store_count_key) {
                gameState.temp_effect_data[args.store_count_key] = targetCards.length;
            }

            switch (operation) {
                case 'modify_durability': {
                    const { amount } = args;
                    for (const card of targetCards) {
                        effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { card_id: card.instance_id, amount: amount, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
                    }
                    break;
                }
                case 'modify_required_scale': {
                    const { amount, min_value = 0 } = args;
                    for (const card of targetCards) {
                        effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_REQUIRED_SCALE, args: { card_id: card.instance_id, amount: amount, min_value: min_value, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
                    }
                    break;
                }
                case 'move':
                case 'move_card': {
                    const { destination_pile, position } = args;
                    for (const card of targetCards) {
                        const actual_source_pile = card.location || (source_piles ? source_piles[0] : 'field');
                        effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player.id, card_id: card.instance_id, source_pile: actual_source_pile, destination_pile: destination_pile, position: position, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
                    }
                    break;
                }
                case 'remove': {
                    const uniqueCards = [...new Set(targetCards)];
                    for (const card of uniqueCards) {
                        effectsQueue.unshift([{ effect_type: EffectType.REMOVE_CARD_FROM_GAME, args: { player_id: player.id, card_id: card.instance_id, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
                    }
                    break;
                }
                case 'generate_card': {
                    const { card_template_name, destination_pile, count = 1 } = args;
                    effectsQueue.unshift([{ effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: player.id, card_template_name, destination_pile, count, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
                    break;
                }
                default:
            }
        }
    },

    [EffectType.PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_ids, amount, next_effect } = args;
        if (!player_ids || !amount) return;

        const operationArgs = {
            player_id: sourceCard ? sourceCard.owner : null,
            operation: 'modify_durability',
            target_player_id: player_ids,
            selection_method: 'all',
            source_piles: ['field'],
            card_type: CardType.WEALTH,
            amount: -amount
        };

        if (next_effect) {
            effectsQueue.unshift([next_effect, sourceCard]);
        }

        effectsQueue.unshift([{
            effect_type: EffectType.PROCESS_CARD_OPERATION,
            args: operationArgs
        }, sourceCard]);
    },
    [EffectType.PROCESS_CHOOSE_AND_DISCARD_IDEOLOGY]: (gameState, args, cardDefs, sourceCard) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        const opponent = gameState.players[player_id === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
        
        const options = [];
        if (player.ideology) {
            options.push(player.ideology);
        }
        if (opponent.ideology) {
            options.push(opponent.ideology);
        }

        if (options.length > 0) {
            gameState.awaiting_input = {
                type: 'CHOICE_CARD_FOR_EFFECT',
                options: options,
                player_id: player_id,
                source_card_instance_id: sourceCard.instance_id,
                source_card_name: sourceCard.name,
                source_effect: {
                    effect_type: 'PROCESS_CHOOSE_AND_DISCARD_IDEOLOGY_RESOLVED',
                    args: {}
                }
            };
        }
    },
    PROCESS_CHOOSE_AND_DISCARD_IDEOLOGY_RESOLVED: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { card_id } = args;
        let targetPlayerId = null;
        
        for (const pId of [PlayerId.PLAYER1, PlayerId.PLAYER2]) {
            const player = gameState.players[pId];
            if (player.ideology && player.ideology.instance_id === card_id) {
                targetPlayerId = pId;
                break;
            }
        }

        if (targetPlayerId) {
            effectsQueue.unshift([{
                effect_type: EffectType.MOVE_CARD,
                args: {
                    player_id: targetPlayerId,
                    card_id: card_id,
                    source_pile: 'ideology',
                    destination_pile: 'discard'
                }
            }, sourceCard]);
        }
    },
    [EffectType.PROCESS_DISCARD_ALL_HAND_WEALTH_CARDS_AND_DRAW]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const cardsToDiscard = player.hand.filter(c => c.card_type === CardType.WEALTH);
        const discardedCount = cardsToDiscard.length;

        if (discardedCount > 0) {
            for (let i = 0; i < discardedCount; i++) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: 'draw_from_deck', source_pile: 'deck', destination_pile: 'hand', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
            for (const card of cardsToDiscard) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: card.instance_id, source_pile: 'hand', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_MOVE_HAND_WEALTH_TO_DECK_AND_DRAW]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const cardsToMove = player.hand.filter(c => c.card_type === CardType.WEALTH);
        const movedCount = cardsToMove.length;

        if (movedCount > 0) {
            for (let i = 0; i < movedCount; i++) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: 'draw_from_deck', source_pile: 'deck', destination_pile: 'hand', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
            for (const card of cardsToMove) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: card.instance_id, source_pile: 'hand', destination_pile: 'deck', position: 'random', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_EXPOSE_CARD_BY_TYPE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, source_piles, card_type, count = 1 } = args;
        const player = gameState.players[player_id];
        if (!player) {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
            return;
        }

        const candidateCards = _getCardsFromPiles(player, source_piles, card_type);

        if (candidateCards.length > 0) {
            const exposedCards = shuffle(candidateCards).slice(0, count);
            if (!gameState.exposed_cards) gameState.exposed_cards = [];
            gameState.exposed_cards.push(...exposedCards.map(c => ({...c, exposed_by: player.id})));
            effectsQueue.unshift([{ effect_type: TriggerType.SUCCESS_PROCESS, args: { ...args, exposed_cards: exposedCards.map(c => c.instance_id), target_card_id: sourceCard.instance_id } }, sourceCard]);
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
        }
    },
        [EffectType.PROCESS_DISCARD_ALL_IDEOLOGY_FROM_HAND_AND_DECK]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
            const { player_id} = args;
            const player = gameState.players[player_id];
            if (!player) return;

    
            const ideologiesToDiscard = [
                ...player.hand.filter(c => c.card_type === CardType.IDEOLOGY),
                ...player.deck.filter(c => c.card_type === CardType.IDEOLOGY)
            ];
    
            if (ideologiesToDiscard.length === 0) {
                return;
            }
    
            for (const card of ideologiesToDiscard) {
                const source_pile = player.hand.some(c => c.instance_id === card.instance_id) ? 'hand' : 'deck';
                effectsQueue.unshift([{ 
                    effect_type: EffectType.MOVE_CARD,
                    args: {
                        player_id: player_id,
                        card_id: card.instance_id,
                        source_pile: source_pile,
                        destination_pile: 'discard',
                        source_card_id: sourceCard ? sourceCard.instance_id : null,
                    }
                }, sourceCard]);
            }
        },    [EffectType.PROCESS_SET_ALL_SCALE_TO_ZERO_AND_REDUCE_CONSCIOUSNESS]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_ids } = args;
        const targetPlayers = _getTargetPlayers(gameState, sourceCard.owner, player_ids);
        const scalesBefore = new Map();

        for (const player of targetPlayers) {
            if (player) scalesBefore.set(player.id, player.scale);
        }

        for (const player of [...targetPlayers].reverse()) {
            const scaleBefore = scalesBefore.get(player.id);
            if (player && scaleBefore > 0) {
                effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CONSCIOUSNESS_RESERVE, args: { player_id: player.id, amount: -scaleBefore, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }

        for (const player of [...targetPlayers].reverse()) {
            if (player && scalesBefore.has(player.id)) {
                 effectsQueue.unshift([{ effect_type: EffectType.SET_SCALE, args: { player_id: player.id, amount: 0, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_MONEY_CARD_PLACEMENT_EFFECT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, card_id } = args;
        const player = gameState.players[player_id];
        const playedMoneyCard = player.field.find(c => c.instance_id === card_id);
        if (!player || !playedMoneyCard) return;

        const existingMoneyCards = player.field.filter(c => c.name === 'マネー' && c.instance_id !== card_id);
        if (existingMoneyCards.length > 0) {
            const targetMoneyCard = existingMoneyCards[0];
            const durabilityToAdd = playedMoneyCard.current_durability;
            effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { card_id: targetMoneyCard.instance_id, amount: durabilityToAdd, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: playedMoneyCard.instance_id, source_pile: 'field', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_MONEY_CARD_TURN_START_EFFECT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, card_id, condition_durability_ge_30 } = args;
        const player = gameState.players[player_id];
        const moneyCard = player.field.find(c => c.instance_id === card_id);
        if (!player || !moneyCard) return;
        if (condition_durability_ge_30 && moneyCard.current_durability < 30) return;
        
        effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: moneyCard.instance_id, source_pile: 'field', destination_pile: 'hand', maintain: true, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
        
        const sortedHand = [...player.hand].sort((a, b) => a.required_scale - b.required_scale);
        const cardsToDiscard = sortedHand.slice(0, 2);

        if (cardsToDiscard.length > 0) {
            effectsQueue.unshift([{ effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: player_id, card_template_name: '資本主義', destination_pile: 'hand', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            for (const card of [...cardsToDiscard].reverse()) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: card.instance_id, source_pile: 'hand', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_DISCARD_ALL_HAND_IDEOLOGY_AND_ADD_MONEY]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const ideologiesInHand = player.hand.filter(c => c.card_type === CardType.IDEOLOGY);
        const discardedCount = ideologiesInHand.length;

        if (discardedCount > 0) {
            effectsQueue.unshift([{ effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: player_id, card_template_name: 'マネー', destination_pile: 'hand', initial_durability: discardedCount, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            for (const card of [...ideologiesInHand].reverse()) {
                effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: card.instance_id, source_pile: 'hand', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_MODIFY_MONEY_DURABILITY_RANDOM]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, change_type, value1, value2 } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const moneyCard = player.field.find(c => c.name === 'マネー');
        if (!moneyCard) return;

        let amount_change = 0;
        if (change_type === 'percent_decrease_or_percent_increase') {
            const is_decrease = Math.random() < 0.5;
            amount_change = is_decrease ? -Math.floor(moneyCard.current_durability * (value1 / 100)) : Math.floor(moneyCard.current_durability * (value2 / 100));
        }

        if (amount_change !== 0) {
            effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { card_id: moneyCard.instance_id, amount: amount_change, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_REDUCE_MONEY_DURABILITY_AND_GAIN_SCALE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const moneyCard = player.field.find(c => c.name === 'マネー');
        if (!moneyCard) return;

        gameState.awaiting_input = {
            type: 'CHOICE_NUMBER',
            player_id: player_id,
            source_card_instance_id: sourceCard.instance_id,
            min: 0,
            max: moneyCard.current_durability,
            prompt: `「マネー」の耐久値をどれだけ減らしますか？ (現在の耐久値: ${moneyCard.current_durability})`,
            source_effect: { effect_type: 'PROCESS_REDUCE_MONEY_DURABILITY_AND_GAIN_SCALE_RESOLVED', args: { player_id: player_id, money_card_id: moneyCard.instance_id, source_card_id: sourceCard ? sourceCard.instance_id : null } }
        };
    },
    [EffectType.PROCESS_ADD_MONEY_TOKEN_BASED_ON_CARDS_PLAYED]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (player && player.cards_played_this_turn > 0) {
            effectsQueue.unshift([{ effect_type: EffectType.ADD_CARD_TO_GAME, args: { player_id: player_id, card_template_name: 'マネー', destination_pile: 'hand', initial_durability: player.cards_played_this_turn, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_MONEY_DURABILITY_BASED_COUNT_MODIFY_CARD_DURABILITY]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, target_player_id, amount } = args;
        const player = gameState.players[player_id];
        const target_player = gameState.players[target_player_id];
        if (!player || !target_player) return;

        const moneyCard = player.field.find(c => c.name === 'マネー');
        if (!moneyCard || moneyCard.current_durability <= 0) return;

        const count = moneyCard.current_durability;
        const target_cards = target_player.field.filter(c => c.card_type === CardType.WEALTH);
        if (target_cards.length === 0) return;

        for (let i = 0; i < count; i++) {
            const random_card = target_cards[Math.floor(Math.random() * target_cards.length)];
            effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { card_id: random_card.instance_id, amount: amount, source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
        }
        effectsQueue.push([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: moneyCard.instance_id, source_pile: 'field', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
    },
    PROCESS_REDUCE_MONEY_DURABILITY_AND_GAIN_SCALE_RESOLVED: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, money_card_id, amount, source_card_id } = args;
        if (amount > 0) {
            effectsQueue.unshift([{ effect_type: EffectType.MODIFY_SCALE_RESERVE, args: { player_id: player_id, amount: amount, source_card_id: source_card_id } }, sourceCard]);
            effectsQueue.unshift([{ effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, args: { card_id: money_card_id, amount: -amount, source_card_id: source_card_id } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_ADD_CARDS_BASED_ON_DISCARDED_COUNT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, card_template_name, destination_pile, card_type_to_discard } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const cardsToDiscard = player.hand.filter(c => c.card_type === card_type_to_discard);
        const discardedCount = cardsToDiscard.length;

        if (discardedCount > 0) {
            for (let i = 0; i < discardedCount; i++) {
                effectsQueue.unshift([{
                    effect_type: EffectType.ADD_CARD_TO_GAME,
                    args: {
                        player_id: player_id,
                        card_template_name: card_template_name,
                        destination_pile: destination_pile,
                    }
                }, sourceCard]);
            }

            for (const card of cardsToDiscard) {
                effectsQueue.unshift([{
                    effect_type: EffectType.MOVE_CARD,
                    args: {
                        player_id: player_id,
                        card_id: card.instance_id,
                        source_pile: 'hand',
                        destination_pile: 'discard',
                    }
                }, sourceCard]);
            }
        }
    },
    [EffectType.PROCESS_ADD_CARD_CONDITIONAL]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, condition_target, threshold, card_template_name, is_above = true } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const value = player[condition_target];
        const conditionMet = is_above ? value >= threshold : value < threshold;

        if (conditionMet) {
            effectsQueue.unshift([{
                effect_type: EffectType.ADD_CARD_TO_GAME,
                args: {
                    player_id: player_id,
                    card_template_name: card_template_name,
                    destination_pile: 'hand',
                    source_card_id: sourceCard ? sourceCard.instance_id : null,
                }
            }, sourceCard]);
        }
    },
    [EffectType.PROCESS_ADD_CHOICE_CARD_TO_HAND]: (gameState, args, cardDefs, sourceCard) => {
        const { player_id, options } = args;
        gameState.awaiting_input = { type: 'CHOICE_CARD_TO_ADD', options, player_id, source_card_instance_id: sourceCard.instance_id };
    },
    [EffectType.PROCESS_CHOOSE_AND_MOVE_CARD_FROM_PILE]: (gameState, args, cardDefs, sourceCard) => {
        let { player_id, source_piles, destination_pile, card_type } = args;

        if (source_piles && source_piles.includes('discard_pile')) {
            source_piles = source_piles.map(p => p === 'discard_pile' ? 'discard' : p);
        }

        const player = gameState.players[player_id];
        if (!player) return;

        let candidateCards = [];
        source_piles.forEach(pileName => {
            const pile = player[pileName];
            if (pile) {
                const cardsInPile = Array.isArray(pile) ? pile : [pile];
                candidateCards.push(...cardsInPile.filter(c => !card_type || c.card_type === card_type));
            }
        });

        if (card_type) candidateCards = candidateCards.filter(c => c.card_type === card_type);

        if (candidateCards.length > 0) {
            gameState.awaiting_input = { type: 'CHOICE_CARD_FROM_PILE', options: candidateCards, destination_pile, player_id, source_card_instance_id: sourceCard.instance_id, source_piles };
        } 
    },
    [EffectType.PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, target_player_id } = args;
        const targetPlayer = gameState.players[target_player_id];
        if (!targetPlayer) {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
            return;
        };

        const candidateCards = targetPlayer.field.filter(c => c.card_type === '財');
        if (candidateCards.length > 0) {
            gameState.awaiting_input = { 
                type: 'CHOICE_CARD_FOR_EFFECT', 
                options: candidateCards, 
                player_id, 
                source_card_instance_id: sourceCard.instance_id, 
                source_card_name: sourceCard.name,
                source_effect: { 
                    effect_type: 'PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH_RESOLVED', 
                    args: { ...args } 
                } 
            };
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_RETURN_LARGEST_REQUIRED_SCALE_CARD_TO_DECK]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id } = args;
        const player = gameState.players[player_id];
        if (!player || player.hand.length === 0) {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
            return;
        }

        const cardsToReturn = _selectCards(gameState, player, player.hand, 'highest_required_scale', 1, sourceCard, args);

        if (cardsToReturn && cardsToReturn.length > 0) {
            const cardToReturn = cardsToReturn[0];

            effectsQueue.unshift([{
                effect_type: EffectType.MOVE_CARD,
                args: {
                    player_id: player_id,
                    card_id: cardToReturn.instance_id,
                    source_pile: 'hand',
                    destination_pile: 'deck',
                    position: 'random'
                }
            }, sourceCard]);

            effectsQueue.unshift([{
                effect_type: TriggerType.SUCCESS_PROCESS,
                args: { ...args, returned_card_id: cardToReturn.instance_id, target_card_id: sourceCard.instance_id }
            }, sourceCard]);
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_ALL_WEALTH_BOOST]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;

        const operationArgs = {
            player_id: player_id,
            operation: 'modify_durability',
            target_player_id: player_id,
            selection_method: 'all',
            source_piles: ['field'],
            card_type: CardType.WEALTH,
            amount: amount
        };

        effectsQueue.unshift([{
            effect_type: EffectType.PROCESS_CARD_OPERATION,
            args: operationArgs
        }, sourceCard]);
    },

    [EffectType.PROCESS_ALL_WEALTH_BOOST]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;

        const operationArgs = {
            player_id: player_id,
            operation: 'modify_durability',
            target_player_id: player_id,
            selection_method: 'all',
            source_piles: ['field'],
            card_type: CardType.WEALTH,
            amount: amount
        };

        effectsQueue.unshift([{
            effect_type: EffectType.PROCESS_CARD_OPERATION,
            args: operationArgs
        }, sourceCard]);
    },

    PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH_RESOLVED: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { card_id, amount, bonus_effect_if_money, bonus_scale_amount, player_id } = args;
        
        let targetCard = null;
        for (const p of Object.values(gameState.players)) {
            const card = p.field.find(c => c.instance_id === card_id);
            if (card) { targetCard = card; break; }
        }

        if (targetCard) {
            effectsQueue.unshift([{ 
                effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE, 
                args: { card_id: targetCard.instance_id, amount: amount, source_card_id: sourceCard ? sourceCard.instance_id : null } 
            }, sourceCard]);

            if (bonus_effect_if_money && targetCard.name === 'マネー') {
                effectsQueue.unshift([{
                    effect_type: EffectType.MODIFY_SCALE_RESERVE,
                    args: { player_id: player_id, amount: bonus_scale_amount }
                }, sourceCard]);
            }
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_CHOOSE_AND_BOUNCE_TO_WEALTH]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, target_player_id } = args;
        const targetPlayer = gameState.players[target_player_id];
        if (!targetPlayer) {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
            return;
        }

        const candidateCards = targetPlayer.field.filter(c => c.card_type === CardType.WEALTH);
        if (candidateCards.length > 0) {
            gameState.awaiting_input = { 
                type: 'CHOICE_CARD_FOR_EFFECT', 
                options: candidateCards, 
                player_id, 
                source_card_instance_id: sourceCard.instance_id, 
                source_card_name: sourceCard.name,
                source_effect: { 
                    effect_type: 'PROCESS_CHOOSE_AND_BOUNCE_TO_WEALTH_RESOLVED', 
                    args: { ...args } 
                } 
            };
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_id } }, sourceCard]);
        }
    },

    PROCESS_CHOOSE_AND_BOUNCE_TO_WEALTH_RESOLVED: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { card_id, target_player_id } = args;
        
        if (card_id) {
            effectsQueue.unshift([{ 
                effect_type: EffectType.MOVE_CARD, 
                args: { 
                    player_id: target_player_id, 
                    card_id: card_id, 
                    source_pile: 'field', 
                    destination_pile: 'hand' 
                } 
            }, sourceCard]);

            effectsQueue.unshift([{ 
                effect_type: TriggerType.SUCCESS_PROCESS, 
                args: { ...args, target_card_id: sourceCard.instance_id }
            }, sourceCard]);
        } else {
            effectsQueue.unshift([{ effect_type: TriggerType.FAILED_PROCESS, args: { ...args, target_card_id: sourceCard.instance_instance_id } }, sourceCard]);
        }
    },
    [EffectType.PROCESS_DRAW_RANDOM_CARD_AND_MODIFY_REQUIRED_SCALE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => { // effectsQueue を引数に追加
        const { player_id, card_type, amount, scale_reduction, scale_reduction_percentage, round_down } = args;
        const player = gameState.players[player_id];
        if (!player || !player.deck || player.deck.length === 0) return;

        const matchingCards = player.deck.filter(c => c.card_type === card_type);
        if (matchingCards.length === 0) return;

        const shuffledMatchingCards = shuffle([...matchingCards]);

        for (let i = 0; i < amount; i++) {
            if (i >= shuffledMatchingCards.length) break;
            const cardToDraw = shuffledMatchingCards[i];
            
            // 必要規模の変更エフェクトを先に積む（後で実行される）
            let scaleChangeAmount = 0;
            if (scale_reduction) {
                scaleChangeAmount = -scale_reduction;
            } else if (scale_reduction_percentage) {
                let reduction = cardToDraw.required_scale * (scale_reduction_percentage / 100);
                if (round_down) reduction = Math.floor(reduction);
                scaleChangeAmount = -reduction;
            }

            if (scaleChangeAmount !== 0) {
                effectsQueue.unshift([{
                    effect_type: EffectType.MODIFY_CARD_REQUIRED_SCALE,
                    args: {
                        card_id: cardToDraw.instance_id,
                        amount: scaleChangeAmount,
                        min_value: 0
                    }
                }, sourceCard]);
            }
            
            // MOVE_CARDエフェクトを後に積む（先に実行される）
            effectsQueue.unshift([{
                effect_type: EffectType.MOVE_CARD,
                args: {
                    player_id: player_id,
                    card_id: cardToDraw.instance_id,
                    source_pile: 'deck',
                    destination_pile: 'hand',
                }
            }, sourceCard]);
        }
    },
    [EffectType.PROCESS_COUNTER_ATTACK]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { counter_damage, triggering_effect_args } = args;
        const attacker_card_id = triggering_effect_args ? triggering_effect_args.source_card_id : null;

        if (attacker_card_id && counter_damage) {
            effectsQueue.unshift([{
                effect_type: EffectType.MODIFY_CARD_DURABILITY_RESERVE,
                args: {
                    card_id: attacker_card_id,
                    amount: -counter_damage,
                    source_card_id: sourceCard ? sourceCard.instance_id : null
                }
            }, sourceCard]);
        }
    },
    [EffectType.SKIP_EFFECT]: (gameState, args) => {
        if (!gameState.effects_to_skip) gameState.effects_to_skip = {};
        gameState.effects_to_skip[args.effect_type] = args.player_id;
    },
    [EffectType.ADD_MODIFY_PARAMETER_CORRECTION]: (gameState, args) => {
        const player = gameState.players[args.player_id];
        if (player) {
            if (!player.modify_parameter_corrections) {
                player.modify_parameter_corrections = [];
            }
            const newCorrection = { 
                correct_target: args.correct_target, 
                correct_direction: args.correct_direction, 
                correct_type: args.correct_type, 
                amount: args.amount,
                source_card_id: args.source_card_id
            };
            player.modify_parameter_corrections.push(newCorrection);
        }
    },

    [EffectType.MODIFY_CONSCIOUSNESS_RESERVE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        let resolvedArgs = { ...args };
        const player = gameState.players[args.player_id];

        if (player && args.amount_percentage) {
            const originalAmount = player.consciousness;
            let change = originalAmount * (Math.abs(args.amount_percentage) / 100);
            if (args.round_down) {
                change = Math.floor(change);
            }
            
            if (args.store_original_value_for_temp) {
                gameState.temp_effect_data[args.store_original_value_for_temp] = change;
            }

            resolvedArgs.amount = args.amount_percentage < 0 ? -change : change;
        } else if (args.amount_based_on_removed_discard_count) {
            resolvedArgs.amount = gameState.temp_effect_data.removed_discard_count || 0;
        } else if (args.amount_based_on_temp_value) {
            let amount = gameState.temp_effect_data[args.amount_based_on_temp_value] || 0;
            if (args.is_negative) {
                amount = -amount;
            }
            resolvedArgs.amount = amount;
        } else if (args.amount_based_on_hand_count) {
            resolvedArgs.amount = player.hand.length;
        }
        
        resolvedArgs.target_player_id = resolvedArgs.player_id;
        
        // Add source_card_id for proper tracking (prevents infinite loops)
        if (sourceCard && !resolvedArgs.source_card_id) {
            resolvedArgs.source_card_id = sourceCard.instance_id;
        }
        
        const effects_to_add = [];
        effects_to_add.push([{ effect_type: EffectType.MODIFY_CONSCIOUSNESS, args: resolvedArgs }, sourceCard]);

        if (resolvedArgs.amount > 0) {
            effects_to_add.push([{ effect_type: TriggerType.MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER, args: resolvedArgs }, sourceCard]);
        } else if (resolvedArgs.amount < 0) {
            effects_to_add.push([{ effect_type: TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER, args: resolvedArgs }, sourceCard]);
            effects_to_add.push([{ effect_type: TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT, args: resolvedArgs }, sourceCard]);
        }
        effectsQueue.unshift(...effects_to_add.reverse());
    },
    [EffectType.MODIFY_SCALE_RESERVE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        let resolvedArgs = { ...args };
        const player = gameState.players[args.player_id];

        if (player && args.amount_percentage) {
            const originalAmount = player.scale;
            let change = originalAmount * (Math.abs(args.amount_percentage) / 100);
            if (args.round_down) {
                change = Math.floor(change);
            }
            
            if (args.store_original_value_for_temp) {
                gameState.temp_effect_data[args.store_original_value_for_temp] = change;
            }

            resolvedArgs.amount = args.amount_percentage < 0 ? -change : change;
        }

        resolvedArgs.target_player_id = resolvedArgs.player_id;
        
        // Add source_card_id for proper tracking (prevents infinite loops)
        if (sourceCard && !resolvedArgs.source_card_id) {
            resolvedArgs.source_card_id = sourceCard.instance_id;
        }
        
        const effects_to_add = [];
        effects_to_add.push([{ effect_type: EffectType.MODIFY_SCALE, args: resolvedArgs }, sourceCard]);

        if (resolvedArgs.amount > 0) {
            effects_to_add.push([{ effect_type: TriggerType.MODIFY_SCALE_INCREASE_RESERVE_OWNER, args: resolvedArgs }, sourceCard]);
        } else if (resolvedArgs.amount < 0) {
            effects_to_add.push([{ effect_type: TriggerType.MODIFY_SCALE_DECREASE_RESERVE_OWNER, args: resolvedArgs }, sourceCard]);
        }
        effectsQueue.unshift(...effects_to_add.reverse());
    },
    [EffectType.MODIFY_CARD_DURABILITY_RESERVE]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        let resolved_args = { ...args };

        // Keep the amount_based_on_self_durability logic here as it's a pre-calculation based on sourceCard, not target resolution.
        if (resolved_args.amount_based_on_self_durability && sourceCard) {
            const source_durability = sourceCard.current_durability !== undefined ? sourceCard.current_durability : sourceCard.durability;
            if (resolved_args.amount_based_on_self_durability === 'minus') {
                resolved_args.amount = -source_durability;
            }
            delete resolved_args.amount_based_on_self_durability;
        }
        
        // Pass the original (potentially abstract) card_id to MODIFY_CARD_DURABILITY
        const newArgs = { ...resolved_args, card_id: args.card_id };

        const effects_to_add = [];
        // The target_card_id here should be the original args.card_id as it will be resolved in MODIFY_CARD_DURABILITY
        effects_to_add.push([{ effect_type: EffectType.MODIFY_CARD_DURABILITY, args: newArgs, target_card_id: args.card_id }, sourceCard]);

        // Trigger effects based on MODIFY_CARD_DURABILITY_RESERVE itself (pre-check, not for the target card)
        const targetCardForTrigger = gameState.all_card_instances[args.card_id]; // This is problematic if args.card_id is abstract
        // We will move these trigger dispatches to MODIFY_CARD_DURABILITY after target resolution
        // For now, let's simplify and assume direct card_id or fix it when we modify MODIFY_CARD_DURABILITY
        // For now, we'll keep the targetCard for trigger determination using original card_id
        if (targetCardForTrigger) { // This will only work if args.card_id is concrete here
            const triggerArgs = { ...newArgs, target_player_id: targetCardForTrigger.owner };
            if (newArgs.amount > 0) {
                effects_to_add.push([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_INCREASE_RESERVE_OWNER, args: triggerArgs }, sourceCard]);
            } else if (newArgs.amount < 0) {
                effects_to_add.push([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_DECREASE_RESERVE_OWNER, args: triggerArgs }, sourceCard]);
            }
        }

        effectsQueue.unshift(...effects_to_add.reverse());
    },
    
    // 演出完了後にカード移動を実行するハンドラー（演出システム連携版）
    [EffectType.MOVE_CARD_AFTER_ANIMATION]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { card_id } = args;
        const targetCard = gameState.all_card_instances[card_id];
        
        if (!targetCard) {
            return;
        }
        
        // 演出システムに完了コールバックを登録
        // この処理は演出システムが実装されるまでの暫定処理
        if (gameState.animationCallbacks) {
            gameState.animationCallbacks.set(card_id, () => {
                effectsQueue.unshift([{ 
                    effect_type: EffectType.MOVE_CARD, 
                    args: {
                        player_id: args.player_id,
                        card_id: args.card_id,
                        source_pile: args.source_pile,
                        destination_pile: args.destination_pile,
                        source_card_id: args.source_card_id
                    }
                }, sourceCard]);
            });
        } else {
            // フォールバック：演出システムが利用できない場合は即座に実行
            effectsQueue.unshift([{ 
                effect_type: EffectType.MOVE_CARD, 
                args: {
                    player_id: args.player_id,
                    card_id: args.card_id,
                    source_pile: args.source_pile,
                    destination_pile: args.destination_pile,
                    source_card_id: args.source_card_id
                }
            }, sourceCard]);
        }
    },
    
    // 演出完了後にトリガーを実行するハンドラー（演出システム連携版）
    [EffectType.TRIGGER_AFTER_ANIMATION]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        // 演出システムに完了コールバックを登録
        // この処理は演出システムが実装されるまでの暫定処理
        if (gameState.animationCallbacks) {
            const callbackId = `trigger-${Date.now()}-${Math.random()}`;
            gameState.animationCallbacks.set(callbackId, () => {
                effectsQueue.unshift([{ 
                    effect_type: args.trigger_type, 
                    args: args.trigger_args
                }, sourceCard]);
            });
        } else {
            // フォールバック：演出システムが利用できない場合は即座に実行
            effectsQueue.unshift([{ 
                effect_type: args.trigger_type, 
                args: args.trigger_args
            }, sourceCard]);
        }
    },
    
    // ゲーム進行演出用のエフェクトハンドラー（演出専用、ゲームロジックは変更しない）
    [EffectType.TURN_START]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
    },
    
    [EffectType.TURN_END]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
    },
    
    [EffectType.GAME_RESULT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
    },
    
    [EffectType.TURN_ORDER_DECISION]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
    },

    [EffectType.REORDER_FIELD_CARDS]: (gameState, args) => {
        const { player_id, card_id, position } = args;
        const player = gameState.players[player_id];
        if (!player || !player.field) return;

        const cardIndex = player.field.findIndex(c => c.instance_id === card_id);
        if (cardIndex === -1) return; // カードが場にない場合は何もしない

        const [cardToMove] = player.field.splice(cardIndex, 1); // 場からカードを削除

        if (position === 'leftmost') {
            player.field.unshift(cardToMove); // 一番左に挿入
        } else if (position === 'rightmost') {
            player.field.push(cardToMove); // 一番右に挿入
        }
        // 他のpositionも必要であれば追加
        
        // Add to animation queue for visual effect
        gameState.animation_queue.push({
            effect: {
                effect_type: 'FIELD_CARDS_REORDERED',
                args: {
                    player_id: player_id,
                    card_id: card_id,
                    position: position
                }
            },
            sourceCard: null // This effect is not directly tied to a source card
        });
    },
    [EffectType.CHECK_GAME_OVER]: () => {
        // This is a marker effect. The actual check is done in the processEffects loop.
    },
};

const checkAllReactions = (processedEffect, sourceCard, gameState) => {
    const newEffects = [];
    const allCards = [];
    Object.values(gameState.players).forEach(player => {
        if (player.ideology) {
            allCards.push(player.ideology);
        }
        allCards.push(...player.field);
        allCards.push(...player.hand);
        allCards.push(...player.discard);
        allCards.push(...player.deck);
    });
    // Add cards in 'playing_event' to the list of cards checked for reactions
    if (sourceCard && sourceCard.location === 'playing_event') {
        allCards.push(sourceCard);
    }
    const filteredCards = allCards.filter(card => card && card.card_type);

    for (const card of filteredCards) {
        const reactionEffects = checkCardReaction(card, processedEffect, gameState);
        if (reactionEffects.length > 0) {
            for (const reactionEffect of reactionEffects) {
                // reactionEffect はすでに EffectInfo オブジェクトなので、args をマージする
                reactionEffect.args = {
                    ...reactionEffect.args,
                    triggering_source_card_id: processedEffect.source_card_id || (sourceCard ? sourceCard.instance_id : null),
                    triggering_effect_args: processedEffect.args,
                };
                newEffects.push([reactionEffect, card]);
            }
        }
    }
    return newEffects;
};

export const setEffectLogger = (logger) => {
    globalEffectLogger = logger;
    console.log('🎬ANIM [effectHandler] EffectLogger has been set.');
};

/**
 * エフェクトをログに記録すべきかどうかを判定する内部ヘルパー関数
 * @param {Object} effect - エフェクト
 * @returns {boolean} ログに記録すべきかどうか
 */
const shouldLogEffectInternal = (effect) => {
    if (!effect || !effect.effect_type) return false;

    // 除外するエフェクト（内部処理や重複ログ防止）
    const excludedEffects = [
        // アニメーションキューで処理されるため除外
        'TURN_START', 'TURN_END', 'GAME_RESULT', 'TURN_ORDER_DECISION', 
        'LIMIT_WARNING', 'EFFECT_NULLIFIED',

        // 内部処理のみ
        'ADD_MODIFY_PARAMETER_CORRECTION', 'REMOVE_MODIFY_PARAMETER_CORRECTION', 'CLEAR_MODIFY_PARAMETER_CORRECTIONS',
        'TRIGGER_EFFECT', 'CHECK_REACTION', 'CHECK_GAME_OVER',
        'MODIFY_CONSCIOUSNESS_RESERVE', 'MODIFY_SCALE_RESERVE', 'MODIFY_CARD_DURABILITY_RESERVE', // RESERVEは中間処理
        'MODIFY_CONSCIOUSNESS', 'MODIFY_SCALE', 'MODIFY_CARD_DURABILITY', // 直接的な変更は結果のxxx_CHANGEDでログ
        'SKIP_EFFECT',
        
        // トリガー系は具体的な効果が処理された際にログに記録されるため、トリガー自体は除外
        TriggerType.START_TURN, TriggerType.END_TURN_OWNER, TriggerType.END_TURN_OPPONENT,
        TriggerType.PLAY_EVENT, TriggerType.PLAY_EVENT_OWNER, TriggerType.PLAY_EVENT_OPPONENT, TriggerType.PLAY_EVENT_THIS,
        TriggerType.PLAYER_PLAY_CARD_ACTION, TriggerType.PLAYER_PLAY_CARD_ACTION_OWNER, TriggerType.PLAYER_PLAY_CARD_ACTION_OPPONENT,
        TriggerType.CARD_ADDED_TO_HAND_THIS, TriggerType.CARD_ADDED_TO_HAND, TriggerType.CARD_ADDED_TO_HAND_OWNER,
        TriggerType.CARD_DRAWN_THIS, TriggerType.CARD_DRAWN, TriggerType.CARD_DRAWN_OWNER,
        TriggerType.CARD_PLACED_THIS, TriggerType.CARD_PLACED, TriggerType.CARD_PLACED_OWNER, TriggerType.CARD_PLACED_OPPONENT,
        TriggerType.CARD_DISCARDED_THIS, TriggerType.CARD_DISCARDED, TriggerType.CARD_DISCARDED_OWNER,
        TriggerType.DAMAGE_THIS,
        TriggerType.WEALTH_DURABILITY_ZERO, TriggerType.WEALTH_DURABILITY_ZERO_OWNER, TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT, TriggerType.WEALTH_DURABILITY_ZERO_THIS,
        TriggerType.MODIFY_CONSCIOUSNESS, TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OWNER, TriggerType.MODIFY_CONSCIOUSNESS_DECREASE_RESERVE_OPPONENT, TriggerType.MODIFY_CONSCIOUSNESS_INCREASE_RESERVE_OWNER,
        TriggerType.MODIFY_SCALE_DECREASE_RESERVE_OWNER, TriggerType.MODIFY_SCALE_INCREASE_RESERVE_OWNER,
        TriggerType.MODIFY_CARD_DURABILITY_DECREASE_RESERVE_OWNER, TriggerType.MODIFY_CARD_DURABILITY_INCREASE_RESERVE_OWNER,
        TriggerType.SUCCESS_PROCESS, TriggerType.FAILED_PROCESS,
    ];

    if (excludedEffects.includes(effect.effect_type)) {
        return false;
    }
    
    // LogEntryGeneratorがフォーマッタを持つエフェクトはログ対象とする
    const hasFormatter = logEntryGenerator.getAvailableFormatters().includes(effect.effect_type);
    if (hasFormatter) {
        return true;
    }

    // デフォルトでログに含めるべき重要なエフェクトタイプ
    const explicitlyIncludedEffects = [
        'PLAYER_ACTION',
        'ADD_CARD_TO_GAME',
        'REMOVE_CARD_FROM_GAME',
        'PROCESS_CARD_OPERATION',
        'PROCESS_DEAL_DAMAGE_TO_ALL_WEALTH',
        'PROCESS_CHOOSE_AND_DISCARD_IDEOLOGY',
        'PROCESS_DISCARD_ALL_HAND_WEALTH_CARDS_AND_DRAW',
        'PROCESS_MOVE_HAND_WEALTH_TO_DECK_AND_DRAW',
        'PROCESS_EXPOSE_CARD_BY_TYPE',
        'PROCESS_DISCARD_ALL_IDEOLOGY_FROM_HAND_AND_DECK',
        'PROCESS_SET_ALL_SCALE_TO_ZERO_AND_REDUCE_CONSCIOUSNESS',
        'PROCESS_MONEY_CARD_PLACEMENT_EFFECT',
        'PROCESS_MONEY_CARD_TURN_START_EFFECT',
        'PROCESS_DISCARD_ALL_HAND_IDEOLOGY_AND_ADD_MONEY',
        'PROCESS_MODIFY_MONEY_DURABILITY_RANDOM',
        'PROCESS_REDUCE_MONEY_DURABILITY_AND_GAIN_SCALE',
        'PROCESS_ADD_MONEY_TOKEN_BASED_ON_CARDS_PLAYED',
        'PROCESS_MONEY_DURABILITY_BASED_COUNT_MODIFY_CARD_DURABILITY',
        'PROCESS_ADD_CARDS_BASED_ON_DISCARDED_COUNT',
        'PROCESS_ADD_CARD_CONDITIONAL',
        'PROCESS_ADD_CHOICE_CARD_TO_HAND',
        'PROCESS_CHOOSE_AND_MOVE_CARD_FROM_PILE',
        'PROCESS_CHOOSE_AND_MODIFY_DURABILITY_TO_WEALTH',
        'PROCESS_RETURN_LARGEST_REQUIRED_SCALE_CARD_TO_DECK',
        'PROCESS_ALL_WEALTH_BOOST',
        'PROCESS_CHOOSE_AND_BOUNCE_TO_WEALTH',
        'PROCESS_DRAW_RANDOM_CARD_AND_MODIFY_REQUIRED_SCALE',
        'PROCESS_COUNTER_ATTACK',
        'REORDER_FIELD_CARDS',
    ];
    
    if (explicitlyIncludedEffects.includes(effect.effect_type)) {
        return true;
    }
    
    return false;
};

export const processEffects = (gameState) => {
    const stateAfterImmediateEffects = produce(gameState, draftState => {
        if (draftState.game_over) return;
        let safetyBreak = 0;
        
        while (draftState.effect_queue.length > 0 && !draftState.awaiting_input && !draftState.game_over && safetyBreak < 500) {
            const [effect, sourceCard] = draftState.effect_queue.shift();

            if (globalEffectLogger) {
                globalEffectLogger.recordEffect(draftState, effect, sourceCard);
            }
            
            if (draftState.effects_to_skip && draftState.effects_to_skip[effect.effect_type]) {
                const skippablePlayerId = draftState.effects_to_skip[effect.effect_type];
                if (effect.args.player_id === skippablePlayerId) {
                    delete draftState.effects_to_skip[effect.effect_type];
                    if (effect.args.card_id) {
                        draftState.animation_queue.push({
                            effect: {
                                effect_type: 'EFFECT_NULLIFIED',
                                args: {
                                    target_card_id: effect.args.card_id,
                                    reason: 'skip_effect',
                                    message: 'エフェクトがスキップされました'
                                }
                            },
                            sourceCard: sourceCard
                        });
                    }
                    safetyBreak++;
                    continue;
                }
            }

            const handler = effectHandlers[effect.effect_type];
            if (handler) {
                handler(draftState, effect.args, draftState.cardDefs, sourceCard, draftState.effect_queue);
                 if (draftState.awaiting_input) {
                    return;
                }
            }

            const reactionEffects = checkAllReactions(effect, sourceCard, draftState);
            if (reactionEffects.length > 0) {
                draftState.effect_queue.unshift(...reactionEffects);
            }

            // Log the effect AFTER it has been processed and potential reactions have been queued
            if (shouldLogEffectInternal(effect)) {
                const logEntry = logEntryGenerator.generateEntry(
                    effect.effect_type,
                    effect.args || {},
                    sourceCard, // sourceCard can be null for system effects
                    draftState
                );
                if (logEntry) {
                    draftState.game_log.push(logEntry);
                }
            }

            // Check for game over state at the end of each effect processing cycle
            _updateGameOverState(draftState);

            safetyBreak++;
            if (safetyBreak >= 500) {
                draftState.game_over = true;
                draftState.game_over_reason = "セーフティブレーク発動：無限ループの可能性があります。";
            }
        }
            
        if (globalEffectLogger && globalEffectLogger.notifyEffectProcessingComplete) {
            globalEffectLogger.notifyEffectProcessingComplete();
        }
    });

    // After processing immediate effects, check if there are delayed effects to process.
    if (stateAfterImmediateEffects.delayedEffects && stateAfterImmediateEffects.delayedEffects.length > 0) {
        const stateWithDelayedEffectsQueued = produce(stateAfterImmediateEffects, draftState => {
            draftState.effect_queue.push(...draftState.delayedEffects);
            draftState.delayedEffects = [];
        });
        // Recursively call processEffects to handle the newly queued (previously delayed) effects.
        return processEffects(stateWithDelayedEffectsQueued);
    }

    return stateAfterImmediateEffects;
};