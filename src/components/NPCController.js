import React, { useEffect, useRef } from 'react';
import { NPC_PLAYER_ID, GamePhase, HUMAN_PLAYER_ID } from '../gameLogic/constants.js';
import NPCActions from './NPCActions.js';

const NPCController = ({ gameState, onPlayCard, onEndTurn, onProvideInput, onPerformMulligan }) => {
    // Ref to hold the latest gameState
    const gameStateRef = useRef(gameState);

    // Update the ref whenever gameState changes
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Effect for handling regular turn actions and inputs
    useEffect(() => {
        const currentGameState = gameStateRef.current; // Access latest gameState via ref
        if (!currentGameState || currentGameState.game_over || currentGameState.phase === GamePhase.MULLIGAN) return;

        const { current_turn, awaiting_input } = currentGameState;
        
        // NPCのターンかどうかチェック
        const isNPCTurn = current_turn === NPC_PLAYER_ID;
        
        // NPCが選択待ち状態かどうかチェック
        const isNPCAwaitingInput = awaiting_input && awaiting_input.player_id === NPC_PLAYER_ID;
        
        if (isNPCTurn || isNPCAwaitingInput) {
            // 2秒後にNPCの行動を実行
            const timer = setTimeout(() => {
                handleNPCAction();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [onPlayCard, onEndTurn, onProvideInput, gameStateRef.current]);

    // Effect for handling the mulligan phase
    useEffect(() => {
        // Use gameStateRef.current to get the latest gameState
        const currentGameState = gameStateRef.current;
        
        // Condition to initiate mulligan action
        const shouldInitiateMulligan = 
            currentGameState?.phase === GamePhase.MULLIGAN && 
            currentGameState.mulligan_state[NPC_PLAYER_ID].status === 'undecided'; // Access .status

        if (shouldInitiateMulligan) {
            // Execute immediately if condition is met
            const npcPlayer = currentGameState.players[NPC_PLAYER_ID];
            
            // NPCActions.jsでカード選択ロジックを実装
            const cardsToMulligan = NPCActions.decideMulligan(npcPlayer, currentGameState);
            const selectedCardIds = cardsToMulligan.map(card => card.instance_id);

            onPerformMulligan(selectedCardIds);
        }
    }, [onPerformMulligan, gameStateRef.current]); // Added gameStateRef.current to dependencies


    const handleNPCAction = () => {
        if (!gameStateRef.current || gameStateRef.current.game_over) return;

        const { current_turn, awaiting_input, players } = gameStateRef.current;
        const npcPlayer = players[NPC_PLAYER_ID];
        
        // 選択待ち状態の処理
        if (awaiting_input && awaiting_input.player_id === NPC_PLAYER_ID) {
            handleNPCInput(awaiting_input);
            return;
        }
        
        // NPCのターン時の処理
        if (current_turn === NPC_PLAYER_ID) {
            handleNPCTurn(npcPlayer);
            return;
        }
    };

    const handleNPCInput = (awaitingInput) => {
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
        const cardPlayed = NPCActions.executeCardPlay(npcPlayer, gameStateRef.current, onPlayCard); // Use gameStateRef.current here
        
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