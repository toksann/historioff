import { shuffle, createCardInstance, getEffectiveScale } from './gameUtils.js';
import { processEffects } from './effectHandler.js';
import { produce } from "immer";
import { _updateGameOverState } from './gameOver.js';
import {
    INITIAL_HAND_SIZE,
    INITIAL_CONSCIOUSNESS,
    INITIAL_SCALE,
    INITIAL_FIELD_LIMIT,
    MAX_HAND_SIZE,
    PlayerId,
    GamePhase,
    CardType,
    TriggerType,
    EffectType,
    HUMAN_PLAYER_ID,
    NPC_PLAYER_ID
} from './constants.js';

/**
 * Checks if the game is over and sets the winner.
 */
export const checkGameOver = (gameState) => produce(gameState, _updateGameOverState);

/**
 * Initializes the entire game state for a new game.
 */
export const initializeGame = (cardDefs, presetDecks, player1DeckName, player2DeckName) => {
    const p1DeckObject = presetDecks.find(deck => deck.name === player1DeckName);
    const p2DeckObject = presetDecks.find(deck => deck.name === player2DeckName);

    if (!p1DeckObject) {
        throw new Error(`Preset deck named "${player1DeckName}" not found.`);
    }
    if (!p2DeckObject) {
        throw new Error(`Preset deck named "${player2DeckName}" not found.`);
    }

    const p1DeckTemplates = p1DeckObject.cards.map(name => cardDefs[name]);
    const p2DeckTemplates = p2DeckObject.cards.map(name => cardDefs[name]);

    let p1Deck = p1DeckTemplates.map(t => createCardInstance(t, PlayerId.PLAYER1));
    let p2Deck = p2DeckTemplates.map(t => createCardInstance(t, PlayerId.PLAYER2));

    p1Deck = shuffle(p1Deck);
    p2Deck = shuffle(p2Deck);

    const p1Hand = p1Deck.splice(0, INITIAL_HAND_SIZE);
    const p2Hand = p2Deck.splice(0, INITIAL_HAND_SIZE);

    let gameState = {
        players: {
            [HUMAN_PLAYER_ID]: {
                id: HUMAN_PLAYER_ID,
                name: 'あなた',
                isNPC: false,
                consciousness: INITIAL_CONSCIOUSNESS,
                scale: INITIAL_SCALE,
                field_limit: INITIAL_FIELD_LIMIT,
                deck: p1Deck,
                hand: p1Hand,
                field: [],
                discard: [],
                ideology: null,
                hand_capacity: MAX_HAND_SIZE,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            },
            [NPC_PLAYER_ID]: {
                id: NPC_PLAYER_ID,
                name: 'NPC',
                isNPC: true,
                consciousness: INITIAL_CONSCIOUSNESS,
                scale: INITIAL_SCALE,
                field_limit: INITIAL_FIELD_LIMIT,
                deck: p2Deck,
                hand: p2Hand,
                field: [],
                discard: [],
                ideology: null,
                hand_capacity: MAX_HAND_SIZE,
                modify_parameter_corrections: [],
                cards_played_this_turn: 0,
            }
        },
        current_turn: null,
        phase: GamePhase.MULLIGAN,
        mulligan_state: {
            [HUMAN_PLAYER_ID]: { status: 'undecided', count: 0 },
            [NPC_PLAYER_ID]: { status: 'undecided', count: 0 },
        },
        effect_queue: [],
        awaiting_input: null,
        effects_to_skip: {},
        game_over: false,
        winner: null,
        temp_effect_data: {},
        displaced_ideology: null,
        all_card_instances: {},
        cardDefs: cardDefs,
        turn_number: 1,
        round_number: 1,
        turn_in_round: 1,
        game_log: [],
        turn_end_state: 'ready_for_next_turn',
        processing_status: {
            is_processing_turn_end: false,
            effects_remaining: 0,
            awaiting_input_for: null,
            pending_turn_transition: false
        },
        firstTurnStarted: false,
        lastUpdate: null,
        isAnimationLocked: false,
        animation_queue: [],
        turnHistory: [],
    };

    Object.values(gameState.players).forEach(player => {
        player.deck.forEach(card => {
            card.location = 'deck'; // SET LOCATION
            gameState.all_card_instances[card.instance_id] = card;
        });
        player.hand.forEach(card => {
            card.location = 'hand'; // SET LOCATION
            gameState.all_card_instances[card.instance_id] = card;
        });
    });

    const playerIds = [PlayerId.PLAYER1, PlayerId.PLAYER2];
    const firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    const secondPlayerId = firstPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
    gameState.current_turn = firstPlayerId;
    gameState.first_player = firstPlayerId;

    const firstPlayerName = gameState.players[firstPlayerId].name;
    const secondPlayerName = gameState.players[secondPlayerId].name;
    
    gameState.animation_queue.push({
        effect: {
            effect_type: 'TURN_ORDER_DECISION',
            args: {
                first_player: firstPlayerName,
                second_player: secondPlayerName,
                first_player_id: firstPlayerId,
                second_player_id: secondPlayerId
            }
        },
        sourceCard: null
    });
    
    const firstPlayerDebuff = -3;
    gameState.players[firstPlayerId].consciousness += firstPlayerDebuff;
    
    gameState.game_log.push({
        id: `game_start_${Date.now()}`,
        timestamp: Date.now(),
        type: "game_start",
        message: `ゲーム開始 - ${gameState.players[firstPlayerId].name}が先攻`,
        details: {
            first_player_id: firstPlayerId,
            first_player_name: gameState.players[firstPlayerId].name,
            debuff_applied: firstPlayerDebuff
        }
    });

    return gameState;
};

export const performMulligan = (gameState, playerId, selectedCardIds) => {
    return produce(gameState, draftState => {
        const player = draftState.players[playerId];
        if (!player) return;

        draftState.mulligan_state[playerId].status = 'decided'; // Update status regardless
        draftState.mulligan_state[playerId].count = selectedCardIds.length; // Store count

        // If no cards to mulligan, just update status and return
        if (!selectedCardIds || selectedCardIds.length === 0) {
            return;
        }

        // 1. 手札からマリガン対象のカードを隔離
        const cardsToReturn = [];
        const remainingHand = [];
        player.hand.forEach(card => {
            if (selectedCardIds.includes(card.instance_id)) {
                cardsToReturn.push(card);
            } else {
                remainingHand.push(card);
            }
        });

        // 2. 新しいカードをデッキからドロー
        const numToDraw = cardsToReturn.length;
        const newCards = player.deck.splice(0, numToDraw);
        
        // Add a flag to the new cards
        newCards.forEach(card => {
            card.isNew = true;
        });
        
        // 新しい手札をセット
        player.hand = [...remainingHand, ...newCards];

        // 3. 隔離したカードをデッキに戻してシャッフル
        player.deck.push(...cardsToReturn);
        player.deck = shuffle(player.deck);

        // 4. マリガン状態を更新 (status and count already updated)
    });
};

export const resolveMulliganPhase = (gameState) => {
    const { mulligan_state } = gameState;
    if (mulligan_state[HUMAN_PLAYER_ID].status === 'decided' && mulligan_state[NPC_PLAYER_ID].status === 'decided') {
        // startTurn will produce the new state, including setting the phase to START_TURN
        return startTurn(gameState);
    }
    return gameState;
};


export const playCard = (gameState, playerId, cardInstanceId, options = {}) => {
    return produce(gameState, draftState => {
        const player = draftState.players[playerId];
        
        if (draftState.current_turn !== playerId) {
            return;
        }

        const cardIndex = player.hand.findIndex(c => c.instance_id === cardInstanceId);
        if (cardIndex === -1) {
            return;
        }
        
        const card = player.hand[cardIndex];

        if (getEffectiveScale(player, draftState) < card.required_scale) {
            return;
        }

        if (player.ideology && player.ideology.name === '原始共産制' && card.card_type === CardType.WEALTH) {
            return;
        }

        const playerActionEffect = {
            effect_type: EffectType.PLAYER_ACTION,
            args: {
                player_id: playerId,
                action_type: 'play_card',
                card_id: cardInstanceId,
                ...options
            }
        };
        draftState.effect_queue.push([playerActionEffect, card]);
    });
};

export const endTurn = (gameState) => {
    return produce(gameState, draftState => {
        const currentPlayerId = draftState.current_turn;
        const currentPlayer = draftState.players[currentPlayerId];

        // presentationControllerへの直接参照を削除し、animation_queueにデータを追加
        draftState.animation_queue.push({
            effect: {
                effect_type: 'TURN_END',
                args: {
                    player_name: currentPlayer.name,
                    player_id: currentPlayerId
                }
            },
            sourceCard: null // 特定のカードに紐づかないためnull
        });

        draftState.turn_end_state = 'processing_effects';
        draftState.processing_status.is_processing_turn_end = true;
        draftState.processing_status.pending_turn_transition = true;

        const opponentPlayerId = (currentPlayerId === PlayerId.PLAYER1) ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
        const ownerEventArgs = { player_id: currentPlayerId, target_player_id: currentPlayerId };
        const opponentEventArgs = { player_id: currentPlayerId, target_player_id: opponentPlayerId };
        draftState.effect_queue.push([{ effect_type: TriggerType.END_TURN_OWNER, args: ownerEventArgs }, null]);
        draftState.effect_queue.push([{ effect_type: TriggerType.END_TURN_OPPONENT, args: opponentEventArgs }, null]);
    });
};

export const _proceedToNextTurn = (gameState) => {
    let currentGameState = gameState;

    const nextState = produce(currentGameState, draftState => {
        // Record history for the turn that just ended
        const playerIdeology = draftState.players[HUMAN_PLAYER_ID].ideology;
        const npcIdeology = draftState.players[NPC_PLAYER_ID].ideology;

        draftState.turnHistory.push({
            turnNumber: draftState.turn_number,
            playerConsciousness: draftState.players[HUMAN_PLAYER_ID].consciousness,
            npcConsciousness: draftState.players[NPC_PLAYER_ID].consciousness,
            playerIdeologies: playerIdeology ? [playerIdeology.name] : [],
            npcIdeologies: npcIdeology ? [npcIdeology.name] : [],
        });

        const currentPlayerId = draftState.current_turn;
        const nextPlayerId = (currentPlayerId === PlayerId.PLAYER1) ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
        
        const currentPlayer = draftState.players[currentPlayerId];
        currentPlayer.cards_played_this_turn = 0;
        
        draftState.turn_end_state = 'ready_for_next_turn';
        draftState.processing_status.is_processing_turn_end = false;
        draftState.processing_status.pending_turn_transition = false;
        draftState.processing_status.awaiting_input_for = null;
        
        draftState.current_turn = nextPlayerId;
        
        if (currentPlayerId === draftState.first_player) {
            draftState.turn_in_round = 2;
        } else {
            draftState.round_number += 1;
            draftState.turn_in_round = 1;
        }
        
        draftState.turn_number = (draftState.turn_number || 1) + 1;
    });

    return startTurn(nextState);
};

export const startTurn = (gameState) => {
    return produce(gameState, draftState => {
        // Clean up isNew flag from all cards from previous mulligan phase
        Object.values(draftState.players).forEach(player => {
            player.hand.forEach(card => {
                if (card.isNew) {
                    delete card.isNew;
                }
            });
        });

        draftState.phase = GamePhase.START_TURN;
        const currentPlayerId = draftState.current_turn;
        const opponentPlayerId = (currentPlayerId === PlayerId.PLAYER1) ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
        const currentPlayer = draftState.players[currentPlayerId];

        const isFirstPlayer = currentPlayerId === draftState.first_player;
        const turnOrder = isFirstPlayer ? '先攻' : '後攻';
        const roundNum = draftState.round_number || 1;
        
        const turnStartMessage = `${turnOrder} ターン${roundNum} 開始 (${currentPlayer.name})`;
        
        // presentationControllerへの直接参照を削除し、animation_queueにデータを追加
        draftState.animation_queue.push({
            effect: {
                effect_type: 'TURN_START',
                args: {
                    player_name: currentPlayer.name,
                    player_id: currentPlayerId,
                    turn_number: roundNum
                }
            },
            sourceCard: null // 特定のカードに紐づかないためnull
        });
        
        if (!draftState.game_log) {
            draftState.game_log = [];
        }
        draftState.game_log.push({
            id: `turn_start_${Date.now()}`,
            timestamp: Date.now(),
            type: "turn_start",
            message: turnStartMessage,
            details: {
                player_id: currentPlayerId,
                player_name: currentPlayer.name,
                turn_order: turnOrder,
                round_number: roundNum,
                is_first_player: isFirstPlayer
            }
        });

        console.log(`🎮GAME_ANIM [main.js] Pushing DRAW_CARD effect for player ${currentPlayerId}, Turn: ${draftState.turn_number}`);
        draftState.effect_queue.push([{
            effect_type: EffectType.DRAW_CARD,
            args: { player_id: currentPlayerId }
        }, null]);

        const ownerEventArgs = { player_id: currentPlayerId, target_player_id: currentPlayerId };
        const opponentEventArgs = { player_id: currentPlayerId, target_player_id: opponentPlayerId };
        draftState.effect_queue.push([{ effect_type: TriggerType.START_TURN_OWNER, args: ownerEventArgs }, null]);
        draftState.effect_queue.push([{ effect_type: TriggerType.START_TURN_OPPONENT, args: opponentEventArgs }, null]);
    });
};

export const resolveInput = (gameState, chosenItems) => {
    const nextState = produce(gameState, draftState => {
        const { type, player_id, source_card_instance_id, destination_pile, source_piles, source_effect, position } = draftState.awaiting_input;

        draftState.awaiting_input = null;

        let sourceCard = null;
        
        sourceCard = draftState.all_card_instances[source_card_instance_id];
        
        if (!sourceCard) {
            for (const p of Object.values(draftState.players)) {
                sourceCard = [...p.field, p.ideology, ...p.hand, ...p.discard].find(c => c && c.instance_id === source_card_instance_id);
                if (sourceCard) break;
            }
        }

        if (!sourceCard) {
            return;
        }
        
        switch (type) {
            case 'CHOICE_CARD_TO_ADD': {
                const card_template_name = chosenItems;
                const addEffect = {
                    effect_type: EffectType.ADD_CARD_TO_GAME,
                    args: {
                        player_id: player_id,
                        card_template_name: card_template_name,
                        destination_pile: 'hand',
                    }
                };
                draftState.effect_queue.push([addEffect, sourceCard]);
                break;
            }
            case 'CHOICE_CARD_FROM_PILE': {
                const chosenCard = chosenItems;
                let original_pile = null;

                for (const pileName of source_piles) {
                    const pile = draftState.players[player_id][pileName];
                    if (pile && pile.find(c => c.instance_id === chosenCard.instance_id)) {
                        original_pile = pileName;
                        break;
                    }
                }

                if (original_pile) {
                    const moveEffect = {
                        effect_type: EffectType.MOVE_CARD,
                        args: {
                            player_id: player_id,
                            card_id: chosenCard.instance_id,
                            source_pile: original_pile,
                            destination_pile: destination_pile,
                            position: position,
                        }
                    };
                    draftState.effect_queue.push([moveEffect, sourceCard]);
                }
                break;
            }
            case 'CHOICE_CARDS_FOR_OPERATION': {
                const newEffect = {
                    effect_type: source_effect.effect_type,
                    args: {
                        ...source_effect.args,
                        selected_cards: chosenItems,
                    }
                };
                draftState.effect_queue.push([newEffect, sourceCard]);
                break;
            }
            case 'CHOICE_NUMBER': {
                const amount = chosenItems;
                const newEffect = {
                    effect_type: source_effect.effect_type,
                    args: {
                        ...source_effect.args,
                        amount: amount,
                    }
                };
                draftState.effect_queue.push([newEffect, sourceCard]);
                break;
            }
            case 'CHOICE_CARD_FOR_EFFECT':
            default: {
                const chosenCard = Array.isArray(chosenItems) ? chosenItems[0] : chosenItems;
                const newEffect = {
                    effect_type: source_effect.effect_type,
                    args: {
                        ...source_effect.args,
                        card_id: chosenCard.instance_id,
                    }
                };
                draftState.effect_queue.push([newEffect, sourceCard]);
                break;
            }
        }
    });
    
    let finalState = processEffects(nextState);
    
    if (finalState.awaiting_input) {
        return finalState;
    }
    
    if (finalState.processing_status.pending_turn_transition) {
        finalState = produce(finalState, draftState => {
            draftState.turn_end_state = 'processing_effects';
            draftState.processing_status.awaiting_input_for = null;
        });
        
        // Removed while loop here
        // The App.js useEffect will handle further processing
        //if (!finalState.awaiting_input && finalState.effect_queue.length === 0) {
        //    return _proceedToNextTurn(finalState);
        //}
    }
    
    return finalState;
};