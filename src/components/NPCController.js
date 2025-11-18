import React, { useEffect } from 'react';
import { NPC_PLAYER_ID } from '../gameLogic/constants.js';
import NPCActions from './NPCActions.js';

const NPCController = ({ gameState, onPlayCard, onEndTurn, onProvideInput }) => {
    useEffect(() => {
        if (!gameState || gameState.game_over) return;

        const { current_turn, awaiting_input, players } = gameState;
        const npcPlayer = players[NPC_PLAYER_ID];
        
        // NPCのターンかどうかチェック
        const isNPCTurn = current_turn === NPC_PLAYER_ID;
        
        // NPCが選択待ち状態かどうかチェック
        const isNPCAwaitingInput = awaiting_input && awaiting_input.player_id === NPC_PLAYER_ID;
        
        // デバッグ情報の出力
        if (awaiting_input) {
            console.log('[NPCController] Awaiting input detected:', {
                type: awaiting_input.type,
                player_id: awaiting_input.player_id,
                current_turn,
                isNPCAwaitingInput,
                isNPCTurn
            });
        }

        if (isNPCTurn || isNPCAwaitingInput) {
            console.log('[NPCController] NPC action needed:', {
                isNPCTurn,
                isNPCAwaitingInput,
                awaiting_input_type: awaiting_input?.type
            });
            
            // 2秒後にNPCの行動を実行
            const timer = setTimeout(() => {
                handleNPCAction();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [gameState, onPlayCard, onEndTurn, onProvideInput]);

    const handleNPCAction = () => {
        if (!gameState || gameState.game_over) return;

        const { current_turn, awaiting_input, players } = gameState;
        const npcPlayer = players[NPC_PLAYER_ID];
        
        // 選択待ち状態の処理
        if (awaiting_input && awaiting_input.player_id === NPC_PLAYER_ID) {
            console.log('[NPCController] Handling NPC input selection');
            handleNPCInput(awaiting_input);
            return;
        }
        
        // NPCのターン時の処理
        if (current_turn === NPC_PLAYER_ID) {
            console.log('[NPCController] Handling NPC turn');
            handleNPCTurn(npcPlayer);
            return;
        }
    };

    const handleNPCInput = (awaitingInput) => {
        console.log('[NPCController] NPC making choice for:', awaitingInput.type);
        
        let choice = null;
        
        switch (awaitingInput.type) {
            case 'CHOICE_CARD_TO_ADD':
                choice = NPCActions.makeRandomChoice(awaitingInput.options, 'card_to_add');
                break;
                
            case 'CHOICE_CARD_FROM_PILE':
                choice = NPCActions.makeRandomChoice(awaitingInput.options, 'card_from_pile');
                break;
                
            case 'CHOICE_CARD_FOR_EFFECT':
                choice = NPCActions.makeRandomChoice(awaitingInput.options, 'card_for_effect');
                break;
                
            case 'CHOICE_NUMBER':
                choice = NPCActions.makeRandomNumber(awaitingInput.min, awaitingInput.max);
                break;
                
            case 'CHOICE_CARDS_FOR_OPERATION':
                choice = NPCActions.makeRandomCardSelection(awaitingInput.options, awaitingInput.count);
                break;
                
            default:
                console.warn('[NPCController] Unknown input type:', awaitingInput.type);
                choice = awaitingInput.options?.[0] || null;
                break;
        }
        
        if (choice !== null) {
            onProvideInput(choice);
        }
    };

    const handleNPCTurn = (npcPlayer) => {
        // カードプレイを試行
        const cardPlayed = NPCActions.executeCardPlay(npcPlayer, gameState, onPlayCard);
        
        if (!cardPlayed) {
            // プレイ可能なカードがない場合はターン終了
            NPCActions.executeEndTurn(onEndTurn);
        }
        // カードをプレイした場合は、次の行動判定は次のuseEffectサイクルで行われる
    };

    // このコンポーネントは表示要素を持たない
    return null;
};

export default NPCController;