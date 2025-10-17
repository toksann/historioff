import { createCardInstance, shuffle } from './gameUtils.js';
import { PlayerId, TriggerType, CardType, EffectType } from './constants.js';
import { checkCardReaction } from './card.js';

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
    const selectionCount = count != null ? count : available_cards.length;

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
                count: selectionCount,
                source_effect: { 
                    effect_type: EffectType.PROCESS_CARD_OPERATION,
                    args: { ...original_args, selection_method: 'pre_selected' },
                }
            };
            return null;
        case 'pre_selected':
            const selectedIds = new Set(original_args.selected_cards || []);
            return available_cards.filter(card => selectedIds.has(card.instance_id));
        default:
            return [];
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
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION, { player_id: player_id, action_type: 'card_played', card_id: card.instance_id, target_card_id: card.instance_id }, card);

            } else { // Wealth & Ideology
                addEffect(EffectType.MOVE_CARD, {
                    card_id: card.instance_id,
                    source_pile: 'hand',
                    destination_pile: card.card_type === CardType.IDEOLOGY ? 'ideology' : 'field',
                    player_id: player_id,
                }, card);
                addEffectToBack(TriggerType.PLAYER_PLAY_CARD_ACTION, { player_id: player_id, action_type: 'card_played', card_id: card.instance_id, target_card_id: card.instance_id }, card);
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

        

                                    .reduce((sum, card) => sum + (card.current_durability || 0), 0);

        

                            }

        

                        }

        

                        for (let i = 0; i < count; i++) {

        

                            const newCard = createCardInstance(cardTemplate, player_id);

        

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

        if (cardRemoved && global.testHooks && global.testHooks.onCardRemoved) {
            global.testHooks.onCardRemoved(card_id);
        }
    },
    [EffectType.MODIFY_CONSCIOUSNESS]: (gameState, args) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            const finalAmount = modifyParameterCorrectionCalculation(gameState, player_id, 'consciousness', amount > 0 ? 'increase' : 'decrease', amount);
            gameState.temp_effect_data.last_consciousness_change = finalAmount;
            gameState.players[player_id].consciousness += finalAmount;
        }
    },
    [EffectType.MODIFY_SCALE]: (gameState, args) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            const finalAmount = modifyParameterCorrectionCalculation(gameState, player_id, 'scale', amount > 0 ? 'increase' : 'decrease', amount);
            gameState.temp_effect_data.last_scale_change = finalAmount; // Add this line
            gameState.players[player_id].scale += finalAmount;
            }
    },
    [EffectType.SET_CONSCIOUSNESS]: (gameState, args) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            gameState.players[player_id].consciousness = Math.max(0, amount);
        }
    },
    [EffectType.SET_SCALE]: (gameState, args) => {
        const { player_id, amount } = args;
        if (gameState.players[player_id]) {
            gameState.players[player_id].scale = Math.max(0, amount);
        }
    },
    [EffectType.MODIFY_CARD_DURABILITY]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const targetCard = gameState.all_card_instances[args.card_id];

        if (targetCard && (targetCard.location === 'field' || targetCard.location === 'ideology')) {
            const finalAmount = modifyParameterCorrectionCalculation(gameState, targetCard.owner, 'wealth', args.amount > 0 ? 'increase' : 'decrease', args.amount);

            if(targetCard.current_durability === undefined) targetCard.current_durability = targetCard.durability;
            targetCard.current_durability += finalAmount;

            if (finalAmount < 0) {
                effectsQueue.unshift([{ 
                    effect_type: TriggerType.DAMAGE_THIS, 
                    args: { 
                        damaged_card_id: targetCard.instance_id, 
                        damage_amount: finalAmount,
                        source_card_id: sourceCard ? sourceCard.instance_id : null,
                        target_card_id: targetCard.instance_id
                    }, 
                    target_card_id: targetCard.instance_id 
                }, sourceCard]);
            }
            if (targetCard.current_durability <= 0) {
                const ownerPlayerId = targetCard.owner;
                const opponentPlayerId = ownerPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
            
                const baseArgs = {
                    player_id: ownerPlayerId,
                    card_id: targetCard.instance_id,
                    target_card_id: targetCard.instance_id,
                };
            
                const ownerArgs = { ...baseArgs, target_player_id: ownerPlayerId };
                const opponentArgs = { ...baseArgs, target_player_id: opponentPlayerId };

                effectsQueue.unshift([{
                    effect_type: EffectType.MOVE_CARD,
                    args: {
                        player_id: targetCard.owner,
                        card_id: targetCard.instance_id,
                        source_pile: 'field',
                        destination_pile: 'discard',
                        source_card_id: sourceCard ? sourceCard.instance_id : null,
                    }
                }, sourceCard]);

                effectsQueue.unshift([{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO, args: ownerArgs }, targetCard]);
                effectsQueue.unshift([{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_OWNER, args: ownerArgs }, targetCard]);
                effectsQueue.unshift([{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_OPPONENT, args: opponentArgs }, targetCard]);
                effectsQueue.unshift([{ effect_type: TriggerType.WEALTH_DURABILITY_ZERO_THIS, args: ownerArgs }, targetCard]);
            }
            if (sourceCard) {
                effectsQueue.unshift([{
                    effect_type: TriggerType.SUCCESS_PROCESS,
                    args: {
                        player_id: sourceCard.owner,
                        card_id: sourceCard.instance_id,
                        target_card_id: sourceCard.instance_id
                    }
                }, sourceCard]);
            }
        } else {
            if (sourceCard) {
                effectsQueue.unshift([{
                    effect_type: TriggerType.FAILED_PROCESS,
                    args: {
                        player_id: sourceCard.owner,
                        card_id: sourceCard.instance_id,
                        target_card_id: sourceCard.instance_id
                    }
                }, sourceCard]);
            }
        }
    },
    [EffectType.MODIFY_CARD_REQUIRED_SCALE]: (gameState, args, cardDefs, sourceCard) => {
        const { card_id, amount, min_value = 0, set_value = false } = args;
        let targetCard = null;

        for (const p of Object.values(gameState.players)) {
            targetCard = p.hand.find(c => c.instance_id === card_id);
            if (targetCard) break;
        }

        if (targetCard) {
            if (set_value) {
                targetCard.required_scale = Math.max(min_value, amount);
            } else {
                targetCard.required_scale = Math.max(min_value, targetCard.required_scale + amount);
            }
        } else {
        }
    },
    [EffectType.MODIFY_FIELD_LIMIT]: (gameState, args, cardDefs, sourceCard, effectsQueue) => {
        const { player_id, amount } = args;
        const player = gameState.players[player_id];
        if (!player) return;

        const new_limit = player.field_limit + amount;
        const current_field_cards = player.field.length;

        if (amount < 0) {
            if (new_limit < current_field_cards) {
                if (sourceCard) {
                    effectsQueue.unshift([{
                        effect_type: TriggerType.FAILED_PROCESS,
                        args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: sourceCard.instance_id }
                    }, sourceCard]);
                }
                return;
            } else {
                if (sourceCard) {
                    effectsQueue.unshift([{
                        effect_type: TriggerType.SUCCESS_PROCESS,
                        args: { player_id: sourceCard.owner, card_id: sourceCard.instance_id, target_card_id: sourceCard.instance_id }
                    }, sourceCard]);
                }
            }
        }

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

        if (source_pile !== 'game_source') {
            originalLocation = cardToMove.location;
        }
        
        cardToMove.location = destination_pile;
        cardToMove.owner = args.target_player_id || player_id; // Update owner before pushing to destination

        if (destination_pile === 'hand' && cardToMove.name === 'マネー') {
            maintain = true;
        }

        if (!maintain && destination_pile !== 'field' && destination_pile !== 'discard') {
            const cardTemplate = gameState.cardDefs[cardToMove.name];
            if (cardTemplate) {
                if (cardToMove.card_type === CardType.WEALTH && cardTemplate.durability !== undefined) {
                    cardToMove.durability = cardTemplate.durability;
                    cardToMove.current_durability = cardTemplate.durability;
                }
                if (cardTemplate.required_scale !== undefined) {
                    cardToMove.required_scale = cardTemplate.required_scale;
                }
            }
        }

        if (destination_pile === 'ideology' || (destination_pile === 'field' && cardToMove.card_type === CardType.IDEOLOGY)) {
            if (destination_player.ideology && destination_player.ideology.instance_id !== cardToMove.instance_id) {
                destination_player.ideology.location = 'discard';
                destination_player.discard.push(destination_player.ideology);
            }
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
             if (destination_pile === 'hand' && destination_player.hand.length >= destination_player.hand_capacity) {
                destination_player.discard.push(cardToMove);
                cardToMove.location = 'discard';
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
            addEffect(TriggerType.CARD_PLACED_THIS, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED_OWNER, ownerEventArgs);
            addEffect(TriggerType.CARD_PLACED_OPPONENT, opponentEventArgs);
        }

        if (destination_pile === 'hand') {
            addEffect(TriggerType.CARD_ADDED_TO_HAND_THIS, ownerEventArgs);
            addEffect(TriggerType.CARD_ADDED_TO_HAND, ownerEventArgs);
            addEffect(TriggerType.CARD_ADDED_TO_HAND_OWNER, ownerEventArgs);

            if (source_pile === 'deck') {
                addEffect(TriggerType.CARD_DRAWN_THIS, ownerEventArgs);
                addEffect(TriggerType.CARD_DRAWN, ownerEventArgs);
                addEffect(TriggerType.CARD_DRAWN_OWNER, ownerEventArgs);
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
            const { player_id } = args;
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
        effectsQueue.unshift([{ effect_type: EffectType.MOVE_CARD, args: { player_id: player_id, card_id: moneyCard.instance_id, source_pile: 'field', destination_pile: 'discard', source_card_id: sourceCard ? sourceCard.instance_id : null } }, sourceCard]);
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
                args: { card_id: targetCard.instance_id, amount: amount } 
            }, sourceCard]);

            if (bonus_effect_if_money && targetCard.name === 'マネー') {
                effectsQueue.unshift([{
                    effect_type: EffectType.MODIFY_SCALE_RESERVE,
                    args: { player_id: player_id, amount: bonus_scale_amount }
                }, sourceCard]);
            }

            effectsQueue.unshift([{ 
                effect_type: TriggerType.SUCCESS_PROCESS, 
                args: { ...args, target_card_id: sourceCard.instance_id } 
            }, sourceCard]);

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
    [EffectType.PROCESS_DRAW_RANDOM_CARD_AND_MODIFY_REQUIRED_SCALE]: (gameState, args) => {
        const { player_id, card_type, amount, scale_reduction, scale_reduction_percentage, round_down } = args;
        const player = gameState.players[player_id];
        if (!player || !player.deck || player.deck.length === 0) return;

        const matchingCards = player.deck.filter(c => c.card_type === card_type);
        if (matchingCards.length === 0) return;

        for (let i = 0; i < amount; i++) {
            if (matchingCards.length === 0) break;
            const randomIndex = Math.floor(Math.random() * matchingCards.length);
            const cardToDraw = matchingCards.splice(randomIndex, 1)[0];
            const deckCardIndex = player.deck.findIndex(c => c.instance_id === cardToDraw.instance_id);
            if (deckCardIndex > -1) player.deck.splice(deckCardIndex, 1);

            if (scale_reduction) cardToDraw.required_scale = Math.max(0, cardToDraw.required_scale - scale_reduction);
            else if (scale_reduction_percentage) {
                let reduction = cardToDraw.required_scale * (scale_reduction_percentage / 100);
                if (round_down) reduction = Math.floor(reduction);
                cardToDraw.required_scale = Math.max(0, cardToDraw.required_scale - reduction);
            }
            player.hand.push(cardToDraw);
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
        let resolved_card_id = args.card_id;
        let resolved_args = { ...args };

        if (args.card_id === 'self_money_on_field' && sourceCard) {
            const owner = gameState.players[sourceCard.owner];
            const moneyCard = owner.field.find(c => c.name === 'マネー');
            if (moneyCard) {
                resolved_card_id = moneyCard.instance_id;
            } else {
                if (sourceCard) {
                    effectsQueue.unshift([{ 
                        effect_type: TriggerType.FAILED_PROCESS,
                        args: {
                            player_id: sourceCard.owner,
                            card_id: sourceCard.instance_id,
                            target_card_id: sourceCard.instance_id
                        }
                    }, sourceCard]);
                }
                return;
            }
        }

        if (args.card_id === 'front' && sourceCard) {
            const owner = gameState.players[sourceCard.owner];
            const opponent = gameState.players[sourceCard.owner === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
            if (owner && opponent) {
                const card_index_on_field = owner.field.findIndex(c => c.instance_id === sourceCard.instance_id);
                if (card_index_on_field !== -1 && opponent.field.length > card_index_on_field) {
                    resolved_card_id = opponent.field[card_index_on_field].instance_id;
                } else {
                    return; 
                }
            } else {
                return;
            }
        }

        if (args.card_id === 'left_opponent' && sourceCard) {
            const opponent = gameState.players[sourceCard.owner === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1];
            if (opponent && opponent.field.length > 0) {
                const targetCard = opponent.field[0];
                if (targetCard) {
                    resolved_card_id = targetCard.instance_id;
                } else {
                    resolved_card_id = null;
                }
            } else {
                resolved_card_id = null;
            }
        }

        if (args.amount_based_on_self_durability && sourceCard) {
            const source_durability = sourceCard.current_durability !== undefined ? sourceCard.current_durability : sourceCard.durability;
            if (args.amount_based_on_self_durability === 'minus') {
                resolved_args.amount = -source_durability;
            }
            delete resolved_args.amount_based_on_self_durability;
        }
        
        const newArgs = { ...resolved_args, card_id: resolved_card_id };

        const effects_to_add = [];
        effects_to_add.push([{ effect_type: EffectType.MODIFY_CARD_DURABILITY, args: newArgs, target_card_id: resolved_card_id }, sourceCard]);

        const targetCard = gameState.all_card_instances[resolved_card_id];
        if (targetCard) {
            const triggerArgs = { ...newArgs, target_player_id: targetCard.owner };
            if (newArgs.amount > 0) {
                effects_to_add.push([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_INCREASE_RESERVE_OWNER, args: triggerArgs }, sourceCard]);
            } else if (newArgs.amount < 0) {
                effects_to_add.push([{ effect_type: TriggerType.MODIFY_CARD_DURABILITY_DECREASE_RESERVE_OWNER, args: triggerArgs }, sourceCard]);
            }
        }

        effectsQueue.unshift(...effects_to_add.reverse());
    },
};

const checkAllReactions = (processedEffect, sourceCard, gameState) => {
    const newEffects = [];
            const allCards = [];
            Object.values(gameState.players).forEach(player => {
                allCards.push(...player.field);
                allCards.push(...player.hand);
                allCards.push(...player.discard);
                if (player.ideology) {
                    allCards.push(player.ideology);
                }
            });
            // Add cards in 'playing_event' to the list of cards checked for reactions
            if (sourceCard && sourceCard.location === 'playing_event') {
                allCards.push(sourceCard);
            }    const filteredCards = allCards.filter(card => card && card.card_type);

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

export const processEffects = (gameState) => {
    let safetyBreak = 0;
    while (gameState.effect_queue.length > 0 && !gameState.awaiting_input && safetyBreak < 200) {
        const [effect, sourceCard] = gameState.effect_queue.shift();
        if (gameState.effects_to_skip && gameState.effects_to_skip[effect.effect_type]) {
            const skippablePlayerId = gameState.effects_to_skip[effect.effect_type];
            if (effect.args.player_id === skippablePlayerId) {
                delete gameState.effects_to_skip[effect.effect_type];
                safetyBreak++;
                continue;
            }
        }

        const handler = effectHandlers[effect.effect_type];
        if (handler) {
            handler(gameState, effect.args, gameState.cardDefs, sourceCard, gameState.effect_queue);
            if (gameState.awaiting_input) {
                return gameState;
            }
        }

        const reactionEffects = checkAllReactions(effect, sourceCard, gameState);
        if (reactionEffects.length > 0) {
            gameState.effect_queue.unshift(...reactionEffects);

        }
        safetyBreak++;
    }

    return gameState;
};