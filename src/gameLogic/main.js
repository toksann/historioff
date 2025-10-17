import { shuffle, createCardInstance, getEffectiveScale } from './gameUtils.js';
import { processEffects } from './effectHandler.js';
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
const checkGameOver = (gameState) => {
    if (gameState.game_over) return gameState; // Don't check if already over

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    let winner = null;

    // 1. Consciousness check
    if (p1.consciousness <= 0) {
        winner = PlayerId.PLAYER2;
    } else if (p2.consciousness <= 0) {
        winner = PlayerId.PLAYER1;
    }

    // 2. Deck out check
    if (p1.deck.length === 0 || p2.deck.length === 0) {
        if (p1.consciousness > p2.consciousness) {
            winner = PlayerId.PLAYER1;
        } else if (p2.consciousness > p1.consciousness) {
            winner = PlayerId.PLAYER2;
        } else {
            // If consciousness is equal, the current turn player loses
            winner = gameState.current_turn === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
        }
    }

    if (winner) {
        gameState.game_over = true;
        gameState.winner = winner;
    }

    return gameState;
};

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
        current_turn: null, // Initially null, will be set randomly
        phase: GamePhase.START_TURN,
        log: ["Game initialized."],
        effect_queue: [],
        awaiting_input: null,
        effects_to_skip: {},
        game_over: false,
        winner: null,
        temp_effect_data: {},
        all_card_instances: {},
        cardDefs: cardDefs,
        // 新しいターン管理システム
        turn_number: 1, // 従来の互換性のため
        round_number: 1, // ラウンド数（先攻後攻が一巡で+1）
        turn_in_round: 1, // ラウンド内でのターン数（1=先攻, 2=後攻）
        game_log: [], // プレイログ（ゲーム全体を通して保持）
    };

    // Populate all_card_instances after initial setup
    Object.values(gameState.players).forEach(player => {
        player.deck.forEach(card => {
            gameState.all_card_instances[card.instance_id] = card;
        });
        player.hand.forEach(card => {
            gameState.all_card_instances[card.instance_id] = card;
        });
        // Field, discard, and ideology will be populated during gameplay
    });

    // --- First turn setup ---
    // 1. Randomly determine the first player
    const playerIds = [PlayerId.PLAYER1, PlayerId.PLAYER2];
    const firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    gameState.current_turn = firstPlayerId;
    gameState.first_player = firstPlayerId; // 先攻プレイヤーを記録

    // 2. Apply debuff to the first player
    const firstPlayerDebuff = -3;
    gameState.players[firstPlayerId].consciousness += firstPlayerDebuff;
    gameState.log.push(`[${gameState.players[firstPlayerId].name}] が先攻です。意識に ${firstPlayerDebuff} の影響を受けます。`);
    
    // プレイログにゲーム開始情報を記録
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
/**
 * Handles the logic for a player playing a card.
 */
export const playCard = (gameState, playerId, cardInstanceId, options = {}) => {
    let newState = gameState;
    const player = newState.players[playerId];
    
    if (newState.current_turn !== playerId) {
        return gameState;
    }

    const cardIndex = player.hand.findIndex(c => c.instance_id === cardInstanceId);
    if (cardIndex === -1) {
        return gameState;
    }
    
    const card = player.hand[cardIndex];

    if (getEffectiveScale(player) < card.required_scale) {
        console.log('Scale not high enough!');
        return gameState;
    }

    // Restriction for "Primitive Communism" to not play wealth cards
    if (player.ideology && player.ideology.name === '原始共産制' && card.card_type === CardType.WEALTH) {
        return gameState;
    }

    if (card.card_type === CardType.WEALTH && player.field.length >= player.field_limit) {
        console.log('Field is full!');
        return gameState;
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
    newState.effect_queue.push([playerActionEffect, card]);

    return newState;
};

/**
 * Handles the logic for ending a turn.
 */
export const endTurn = (gameState) => {
    let currentGameState = gameState;
    const currentPlayerId = currentGameState.current_turn;

    const endTurnEventArgs = { player_id: currentPlayerId, target_player_id: currentPlayerId };
    currentGameState.effect_queue.push([{ effect_type: TriggerType.END_TURN_OWNER, args: endTurnEventArgs }, null]);

    // Process all effects queued for the end of the turn until none are left.
    let safetyBreak = 0;
    while (currentGameState.effect_queue.length > 0 && safetyBreak < 100) { // Increased safety break
        if (currentGameState.awaiting_input) {
            break; 
        }
        currentGameState = processEffects(currentGameState);
        safetyBreak++;
    }

    // If we broke the loop due to awaiting_input or the queue is still not empty,
    // return the current state without starting the next turn.
    if (currentGameState.awaiting_input || currentGameState.effect_queue.length > 0) {
        return currentGameState;
    }

    // Only if the queue is empty and no input is awaited, proceed to the next turn.
    const nextPlayerId = (currentPlayerId === PlayerId.PLAYER1) ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
    currentGameState.current_turn = nextPlayerId;
    
    // 新しいターン管理システム
    if (currentPlayerId === currentGameState.first_player) {
        // 先攻プレイヤーのターン終了 → 後攻プレイヤーのターンへ
        currentGameState.turn_in_round = 2;
    } else {
        // 後攻プレイヤーのターン終了 → 次のラウンドの先攻プレイヤーへ
        currentGameState.round_number += 1;
        currentGameState.turn_in_round = 1;
    }
    
    // 従来の互換性のためのturn_number更新
    currentGameState.turn_number = (currentGameState.turn_number || 1) + 1;

    return startTurn(currentGameState);
  };

/**
 * Handles the logic for starting a turn.
 */
export const startTurn = (gameState) => {
    let currentGameState = gameState;
    const currentPlayerId = currentGameState.current_turn;
    const opponentPlayerId = currentPlayerId === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
    const currentPlayer = currentGameState.players[currentPlayerId];

    // 先攻後攻の判定とターン表示
    const isFirstPlayer = currentPlayerId === currentGameState.first_player;
    const turnOrder = isFirstPlayer ? '先攻' : '後攻';
    const roundNum = currentGameState.round_number || 1;
    
    const turnStartMessage = `${turnOrder} ターン${roundNum} 開始 (${currentPlayer.name})`;
    
    // 従来のログに記録
    currentGameState.log.push(`--- ${currentPlayer.name}のターン開始 (${turnOrder} ターン${roundNum}) ---`);
    
    // プレイログにも記録
    if (!currentGameState.game_log) {
        currentGameState.game_log = [];
    }
    currentGameState.game_log.push({
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

    // 1. Draw a card
    currentGameState.effect_queue.push([{
        effect_type: EffectType.DRAW_CARD,
        args: { player_id: currentPlayerId }
    }, null]);

    // 2. Issue START_TURN triggers
    const ownerEventArgs = { player_id: currentPlayerId, target_player_id: currentPlayerId };
    const opponentEventArgs = { player_id: currentPlayerId, target_player_id: opponentPlayerId };
    currentGameState.effect_queue.push([{ effect_type: TriggerType.START_TURN_OWNER, args: ownerEventArgs }, null]);
    currentGameState.effect_queue.push([{ effect_type: TriggerType.START_TURN_OPPONENT, args: opponentEventArgs }, null]);

    // Process all effects queued for the start of the turn until none are left.
    let safetyBreak = 0;
    while (currentGameState.effect_queue.length > 0 && !currentGameState.awaiting_input && safetyBreak < 100) {
        currentGameState = processEffects(currentGameState);
        safetyBreak++;
    }

    // If we broke the loop due to awaiting_input or the queue is still not empty,
    // return the current state. The caller (App.js) will continue processing.
    if (currentGameState.awaiting_input || currentGameState.effect_queue.length > 0) {
        return currentGameState;
    }

    return checkGameOver(currentGameState);
};
/**
 * Resolves a pending user input and continues the effect chain.
 */
export const resolveInput = (gameState, chosenItems) => {
    let newState = gameState;
    const { type, player_id, source_card_instance_id, destination_pile, source_piles, source_effect } = newState.awaiting_input;

    newState.awaiting_input = null;

    let sourceCard = null;
    
    // まずall_card_instancesから検索
    sourceCard = newState.all_card_instances[source_card_instance_id];
    
    // 見つからない場合は各プレイヤーの領域から検索
    if (!sourceCard) {
        for (const p of Object.values(newState.players)) {
            sourceCard = [...p.field, p.ideology, ...p.hand, ...p.discard].find(c => c && c.instance_id === source_card_instance_id);
            if (sourceCard) break;
        }
    }

    if (!sourceCard) {
        console.error("Could not find the source card for the pending effect. Source ID:", source_card_instance_id);
        console.error("Available card instances:", Object.keys(newState.all_card_instances));
        return newState;
    }
    
    console.log('[resolveInput] Found source card:', sourceCard.name);

    switch (type) {
        case 'CHOICE_CARD_TO_ADD': {
            const card_template_name = chosenItems; // chosenItem is a string (card name)
            const addEffect = {
                effect_type: EffectType.ADD_CARD_TO_GAME,
                args: {
                    player_id: player_id,
                    card_template_name: card_template_name,
                    destination_pile: 'hand',
                }
            };
            newState.effect_queue.push([addEffect, sourceCard]);
            break;
        }
        case 'CHOICE_CARD_FROM_PILE': {
            const chosenCard = chosenItems; // chosenItem is a card instance
            let original_pile = null;

            for (const pileName of source_piles) {
                const pile = newState.players[player_id][pileName];
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
                    }
                };
                newState.effect_queue.push([moveEffect, sourceCard]);
            }
            break;
        }
        case 'CHOICE_CARDS_FOR_OPERATION': {
            const newEffect = {
                effect_type: source_effect.effect_type,
                args: {
                    ...source_effect.args,
                    selected_cards: chosenItems, // Pass the array of chosen cards
                }
            };
            newState.effect_queue.push([newEffect, sourceCard]);
            break;
        }
        case 'CHOICE_NUMBER': {
            const amount = chosenItems; // chosenItems is a number
            const newEffect = {
                effect_type: source_effect.effect_type,
                args: {
                    ...source_effect.args,
                    amount: amount,
                }
            };
            newState.effect_queue.push([newEffect, sourceCard]);
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
            newState.effect_queue.push([newEffect, sourceCard]);
            break;
        }
    }

    const finalState = processEffects(newState);
    if (finalState.awaiting_input) return finalState;
    
    return checkGameOver(finalState);
};