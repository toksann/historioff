import { PlayerId, HUMAN_PLAYER_ID } from './constants.js';

/**
 * Updates the game state if game over conditions are met.
 * This function mutates the draftState directly.
 */
export const _updateGameOverState = (draftState) => {
    if (draftState.game_over) return;

    const p1 = draftState.players[PlayerId.PLAYER1];
    const p2 = draftState.players[PlayerId.PLAYER2];

    let winner = null;

    if (p1.consciousness <= 0) {
        winner = PlayerId.PLAYER2;
    } else if (p2.consciousness <= 0) {
        winner = PlayerId.PLAYER1;
    }

    if (p1.deck.length === 0 || p2.deck.length === 0) {
        if (p1.consciousness > p2.consciousness) {
            winner = PlayerId.PLAYER1;
        } else if (p2.consciousness > p1.consciousness) {
            winner = PlayerId.PLAYER2;
        } else {
            winner = draftState.current_turn === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1;
        }
    }

    if (winner) {
        console.log(`[GAME_END_DEBUG] Winner determined: ${winner}. Updating state.`);
        draftState.game_over = true;
        draftState.winner = winner;
        console.log(`[GAME_END_DEBUG] draftState set to:`, { game_over: draftState.game_over, winner: draftState.winner });
        
        const isPlayerVictory = winner === HUMAN_PLAYER_ID;
        const winnerName = draftState.players[winner]?.name || 'Unknown';
        const loserName = draftState.players[winner === PlayerId.PLAYER1 ? PlayerId.PLAYER2 : PlayerId.PLAYER1]?.name || 'Unknown';
        
        let message = '';
        if (p1.consciousness <= 0 || p2.consciousness <= 0) {
            message = `${loserName}の意識が0になりました`;
        } else if (p1.deck.length === 0 || p2.deck.length === 0) {
            message = `デッキ切れによる判定`;
        }
        
        const gameResultEffect = {
            effect: {
                effect_type: 'GAME_RESULT',
                args: {
                    is_victory: isPlayerVictory,
                    message: message,
                    winner_name: winnerName
                }
            },
            sourceCard: null
        };
        draftState.animation_queue.push(gameResultEffect);
        console.log(`[GAME_END_DEBUG] Pushed GAME_RESULT to animation_queue.`, gameResultEffect);
        console.log(`[GAME_END_DEBUG] Animation queue length: ${draftState.animation_queue.length}`);
    }
};
