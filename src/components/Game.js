import React, { useState } from 'react';
import PlayerStats from './PlayerStats.js';
import Field from './Field.js';
import Hand from './Hand.js';
import NumberInput from './NumberInput.js';
import CardDetail from './CardDetail.js';
import CardActionMenu from './CardActionMenu.js';
import GameInfo from './GameInfo.js';
import GameLogOverlay from './GameLogOverlay.js';
import '../App.css';
import { PlayerId, HUMAN_PLAYER_ID, NPC_PLAYER_ID } from '../gameLogic/constants.js';

const Game = ({ gameState, onPlayCard, onEndTurn, onProvideInput }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [actionMenuCard, setActionMenuCard] = useState(null);
    const [showGameLog, setShowGameLog] = useState(false);
    if (!gameState) {
        return <div>Loading Game...</div>;
    }

    const { players, current_turn, awaiting_input } = gameState;
    // 常に人間プレイヤーを「自分」、NPCを「相手」として表示
    const humanPlayer = players[HUMAN_PLAYER_ID];
    const npcPlayer = players[NPC_PLAYER_ID];

    // カードクリック処理
    const handleCardClick = (card) => {
        // 選択待ち状態の場合は既存の処理を優先
        if (awaiting_input && awaiting_input.type === 'CHOICE_CARD_FOR_EFFECT') {
            // optionsに含まれているカードかチェック
            const isValidTarget = awaiting_input.options && 
                awaiting_input.options.some(option => option.instance_id === card.instance_id);
            if (isValidTarget) {
                console.log('[Game] Selecting card for effect:', card.name);
                onProvideInput(card);
                return;
            }
        }
        
        if (!awaiting_input) {
            // 通常時の処理
            if (humanPlayer.hand.includes(card)) {
                // 手札のカードの場合はアクションメニューを表示
                setActionMenuCard(card);
            } else {
                // その他のカードは詳細表示
                setSelectedCard(card);
            }
        }
    };

    // アクションメニューからのプレイ処理
    const handlePlayFromMenu = () => {
        if (actionMenuCard) {
            onPlayCard(actionMenuCard);
            setActionMenuCard(null);
        }
    };

    // アクションメニューからの詳細表示処理は不要（統合されたため）

    const renderChoicePrompt = () => {
        if (!awaiting_input || awaiting_input.player_id !== current_turn) {
            return null;
        }

        if (awaiting_input.type === 'CHOICE_NUMBER') {
            return (
                <NumberInput 
                    prompt={awaiting_input.prompt}
                    min={awaiting_input.min}
                    max={awaiting_input.max}
                    onConfirm={onProvideInput}
                />
            );
        }

        if (awaiting_input.type === 'CHOICE_CARD_TO_ADD') {
            return (
                <div className="choice-prompt-overlay">
                    <div className="choice-prompt">
                        <h3>カードを選択してください</h3>
                        <div className="choice-options">
                            {awaiting_input.options.map(option => (
                                <button key={option} onClick={() => onProvideInput(option)}>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (awaiting_input.type === 'CHOICE_CARD_FROM_PILE') {
            return (
                <div className="choice-prompt-overlay">
                    <div className="choice-prompt">
                        <h3>カードを1枚選択してください</h3>
                        <div className="choice-options-scrollable">
                            {awaiting_input.options.map(card => (
                                <button key={card.instance_id} onClick={() => onProvideInput(card)}>
                                    {card.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // For other types of choices, like selecting a card from hand/field
        if (awaiting_input.prompt) {
             return <div className="prompt-overlay"><div className="prompt">{awaiting_input.prompt}</div></div>;
        }

        return null;
    };

    return (
        <div className="game-board">
            {renderChoicePrompt()}
            
            {/* カードアクションメニュー */}
            {actionMenuCard && (
                <CardActionMenu
                    card={actionMenuCard}
                    player={humanPlayer}
                    gameState={gameState}
                    onPlay={handlePlayFromMenu}
                    onClose={() => setActionMenuCard(null)}
                />
            )}
            
            {/* ゲームログオーバーレイ */}
            {showGameLog && (
                <GameLogOverlay
                    gameState={gameState}
                    onClose={() => setShowGameLog(false)}
                />
            )}
            
            {/* カード詳細オーバーレイ */}
            {selectedCard && (
                <CardDetail 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                />
            )}
            
            {/* 左上: 相手（NPC）ステータス */}
            <div className={`opponent-stats-area ${current_turn === NPC_PLAYER_ID ? 'opponent-turn-indicator' : ''}`}>
                <PlayerStats player={npcPlayer} gameState={gameState} />
            </div>
            
            {/* 右上: ゲーム情報エリア */}
            <div className="game-info-area">
                <GameInfo 
                    gameState={gameState}
                    onShowLog={() => setShowGameLog(true)}
                />
            </div>
            
            {/* 中央上: 相手（NPC）の場 */}
            <div className="opponent-field-area">
                <Field 
                    player={npcPlayer} 
                    onProvideInput={onProvideInput} 
                    awaiting_input={awaiting_input}
                    onCardClick={handleCardClick}
                />
            </div>
            
            {/* 中央下: 自分（人間）の場 */}
            <div className="player-field-area">
                <Field 
                    player={humanPlayer} 
                    onProvideInput={onProvideInput} 
                    awaiting_input={awaiting_input}
                    onCardClick={handleCardClick}
                />
            </div>
            
            {/* 左下: 自分（人間）ステータス */}
            <div className={`player-stats-area ${current_turn === HUMAN_PLAYER_ID ? 'current-turn-indicator' : ''}`}>
                <PlayerStats player={humanPlayer} gameState={gameState} />
                <button 
                    onClick={onEndTurn} 
                    disabled={!!awaiting_input || current_turn !== HUMAN_PLAYER_ID}
                    className="end-turn-button"
                >
                    ターン終了
                </button>
            </div>
            
            {/* 右下: 自分（人間）の手札 */}
            <div className="player-hand-area">
                <Hand 
                    player={humanPlayer} 
                    onPlayCard={onPlayCard} 
                    onProvideInput={onProvideInput} 
                    awaiting_input={awaiting_input}
                    onCardClick={handleCardClick}
                />
            </div>
        </div>
    );
};

export default Game;
