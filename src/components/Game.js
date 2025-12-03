import React, { useState, useEffect, useCallback } from 'react';
import PlayerStats from './PlayerStats.js';
import Field from './Field.js';
import Hand from './Hand.js';
import NumberInput from './NumberInput.js';
import CardDetail from './CardDetail.js';
import CardActionMenu from './CardActionMenu.js';
import GameInfo from './GameInfo.js';
import GameLogOverlay from './GameLogOverlay.js';
import NPCController from './NPCController.js';
import RulesOverlay from './overlays/RulesOverlay.js';
import MulliganModal from './MulliganModal.js'; // マリガンモーダルをインポート
import useAnimationManager from '../hooks/useAnimationManager.js';
import usePresentedCards from '../hooks/usePresentedCards.js'; // 新しいフックをインポート
import '../App.css';
import { HUMAN_PLAYER_ID, NPC_PLAYER_ID, GamePhase } from '../gameLogic/constants.js'; // GamePhaseをインポート
import { produce } from 'immer'; // immerをインポート

const Game = ({ gameState, cardDefs, onPlayCard, onEndTurn, onProvideInput, onSurrender, onGameStateUpdate, effectMonitor, enhancedLog, onConfirmMulligan }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [actionMenuCard, setActionMenuCard] = useState(null);
    const [showGameLog, setShowGameLog] = useState(false);
    const [showRulesOverlay, setShowRulesOverlay] = useState(false);
    const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
    
    const humanPlayer = gameState?.players?.[HUMAN_PLAYER_ID];
    const npcPlayer = gameState?.players?.[NPC_PLAYER_ID];
    
    // 新しい演出システムを初期化
    const {
        controller: presentationController,
        handleEffectForAnimation,
        isReady: animationReady
    } = useAnimationManager(gameState, effectMonitor);

    // プレゼンテーションロジック用のカード状態を管理
    const { presentedCards: humanPresentedCards, handleAnimationEnd: handleHumanAnimationEnd } = usePresentedCards(humanPlayer?.field, humanPlayer?.ideology);
    const { presentedCards: npcPresentedCards, handleAnimationEnd: handleNpcAnimationEnd } = usePresentedCards(npcPlayer?.field, npcPlayer?.ideology);

    // EffectMonitorと演出システムの連携
    React.useEffect(() => {
        const effectMonitor = enhancedLog.getEffectMonitor();
        
        if (effectMonitor && animationReady && handleEffectForAnimation) {
            
            
            effectMonitor.registerAnimationCallback(handleEffectForAnimation);
            
            
            // presentationControllerをgameStateに設定（effectHandlerで使用）
            // gameState.presentationController = presentationController;
            
            // presentationControllerにgameStateへの参照を設定
            if (presentationController && presentationController.setGameState) {
                presentationController.setGameState(gameState);
            } else {
            }
            
            
            return () => {
                
                effectMonitor.removeAnimationCallback(handleEffectForAnimation);
            };
        } else {
            
            
            
            
            
        }
    }, [enhancedLog, animationReady, handleEffectForAnimation, presentationController, gameState]); // gameStateを依存配列に追加


    // 継続演出の更新（規模や手札の変更を監視）
    React.useEffect(() => {
        if (gameState && presentationController && presentationController.animationManager) {
            
            presentationController.animationManager.updatePersistentAnimations(gameState);
        }
    }, [
        gameState, // gameState全体を監視対象とする
        presentationController
    ]);

  useEffect(() => {
    const processAnimation = async () => {
      if (gameState?.animation_queue?.length > 0 && handleEffectForAnimation && !gameState.isAnimationLocked && animationReady) { // Add animationReady to condition
        const nextAnimation = gameState.animation_queue[0];
        const effect = nextAnimation.effect;
        const sourceCard = nextAnimation.sourceCard;

        
        
        // アニメーションをトリガーし、完了を待つ
        await handleEffectForAnimation(effect, sourceCard);
        
        // 完了後にのみ、処理されたアニメーションをキューから削除
        onGameStateUpdate(currentGameState => produce(currentGameState, draft => {
          
          draft.animation_queue.shift();
        }));
      } else {
        
        
        
        
        
      }
    };

    processAnimation();
  }, [gameState, onGameStateUpdate, handleEffectForAnimation, animationReady]); // Add animationReady to dependencies

    if (!gameState) {
        return <div>Loading Game...</div>;
    }

    const { current_turn, awaiting_input } = gameState;
    
    // スクロール対応なのでmaxFieldSizeは不要（Fieldコンポーネント内で動的に管理）

    // カードクリック処理
    const handleCardClick = (card) => {
        // 選択待ち状態では詳細表示のみ許可（選択はオーバーレイから行う）
        if (awaiting_input && (awaiting_input.type === 'CHOICE_CARD_FOR_EFFECT' || awaiting_input.type === 'CHOICE_CARDS_FOR_OPERATION')) {
            // 選択はオーバーレイから行うため、ここでは詳細表示のみ
            setSelectedCard(card);
            return;
        }
        
        // 通常時の処理
        if (humanPlayer.hand.includes(card)) {
            // 手札のカードの場合
            if (!awaiting_input) {
                // 通常時はアクションメニューを表示
                setActionMenuCard(card);
            } else {
                // その他の選択待ち状態では詳細表示のみ
                setSelectedCard(card);
            }
        } else {
            // その他のカードは詳細表示
            setSelectedCard(card);
        }
    };

    const handleSurrenderClick = () => {
        setShowSurrenderConfirm(true);
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

        // NPCのターンの時は選択オーバーレイを表示しない（相手の戦略が見えてしまうため）
        if (awaiting_input.player_id !== HUMAN_PLAYER_ID) {
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
                                <div key={option} className="choice-card-container">
                                    <button onClick={() => onProvideInput(option)}>
                                        {option}
                                    </button>
                                    <button onClick={() => setSelectedCard(cardDefs[option])}>
                                        詳細
                                    </button>
                                </div>
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

        if (awaiting_input.type === 'CHOICE_CARDS_FOR_OPERATION') {
            const sourceCardName = awaiting_input.source_card_name || '不明なカード';
            return (
                <div className="choice-prompt-overlay">
                    <div className="choice-prompt">
                        <h3>{sourceCardName}の効果</h3>
                        <p>手札から財カードを1枚選択してください</p>
                        <div className="choice-options-scrollable">
                            {awaiting_input.options.map(card => (
                                <div key={card.instance_id} className="choice-card-container">
                                    <button className="choice-card-select" onClick={() => onProvideInput([card])}>
                                        <div className="choice-card-info">
                                            <span className="choice-card-name">{card.name}</span>
                                            <span className="choice-card-type">({card.card_type})</span>
                                            {card.durability && (
                                                <span className="choice-card-durability">耐久{card.durability}</span>
                                            )}
                                            {card.required_scale && (
                                                <span className="choice-card-scale">必要規模{card.required_scale}</span>
                                            )}
                                        </div>
                                    </button>
                                    <button 
                                        className="choice-card-detail" 
                                        onClick={() => setSelectedCard(card)}
                                        title="詳細を見る"
                                    >
                                        📋
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (awaiting_input.type === 'CHOICE_CARD_FOR_EFFECT') {
            const sourceCardName = awaiting_input.source_card_name || '不明なカード';
            return (
                <div className="choice-prompt-overlay">
                    <div className="choice-prompt">
                        <h3>{sourceCardName}の効果</h3>
                        <p>{awaiting_input.prompt || 'カードを1枚選択してください'}</p>
                        <div className="choice-options-scrollable">
                            {awaiting_input.options.map(card => (
                                <div key={card.instance_id} className="choice-card-container">
                                    <button className="choice-card-select" onClick={() => onProvideInput(card)}>
                                        <div className="choice-card-info">
                                            <span className="choice-card-name">{card.name}</span>
                                            <span className="choice-card-type">({card.card_type})</span>
                                            {card.durability && (
                                                <span className="choice-card-durability">耐久{card.durability}</span>
                                            )}
                                            {card.required_scale && (
                                                <span className="choice-card-scale">必要規模{card.required_scale}</span>
                                            )}
                                        </div>
                                    </button>
                                    <button 
                                        className="choice-card-detail" 
                                        onClick={() => setSelectedCard(card)}
                                        title="詳細を見る"
                                    >
                                        📋
                                    </button>
                                </div>
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
            {/* マリガンモーダル */}
            {gameState.phase === GamePhase.MULLIGAN && (
                <MulliganModal
                    hand={humanPlayer.hand}
                    onConfirmMulligan={(selectedCardIds) => onConfirmMulligan(HUMAN_PLAYER_ID, selectedCardIds)}
                    cardDefs={cardDefs}
                    mulliganState={gameState.mulligan_state}
                />
            )}

            {/* NPCController - 表示要素なし、バックグラウンドで動作 */}
            <NPCController
                gameState={gameState}
                onPlayCard={onPlayCard}
                onEndTurn={onEndTurn}
                onProvideInput={onProvideInput}
                onPerformMulligan={(selectedCardIds) => onConfirmMulligan(NPC_PLAYER_ID, selectedCardIds)}
            />
            
            {renderChoicePrompt()}

            {showSurrenderConfirm && (
                <div className="choice-prompt-overlay" onClick={() => setShowSurrenderConfirm(false)}>
                    <div className="choice-prompt" onClick={(e) => e.stopPropagation()}>
                        <h3>本当に降伏しますか？</h3>
                        <p>この操作は取り消せません。</p>
                        <div className="choice-options">
                            <button
                                className="surrender-confirm-yes"
                                onClick={() => {
                                    onSurrender();
                                    setShowSurrenderConfirm(false);
                                }}
                            >
                                はい
                            </button>
                            <button onClick={() => setShowSurrenderConfirm(false)}>
                                いいえ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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
                <>
                    {}
                    <GameLogOverlay
                        gameState={gameState}
                        logEntries={enhancedLog.combinedLog} 
                        getFilteredEntries={enhancedLog.getFilteredEntries} 
                        onClose={() => setShowGameLog(false)}
                    />
                </>
            )}
            
            {/* ルールオーバーレイ */}
            {showRulesOverlay && (
                <RulesOverlay
                    isOpen={showRulesOverlay}
                    onClose={() => setShowRulesOverlay(false)}
                />
            )}
            
            {/* カード詳細オーバーレイ */}
            {selectedCard && (
                <CardDetail 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                />
            )}
            
            {/* 右上: ゲーム情報エリア */}
            <div className="game-info-area">
                <GameInfo 
                    gameState={gameState}
                    enhancedLog={enhancedLog}
                    onShowLog={() => setShowGameLog(true)}
                    onShowRules={() => setShowRulesOverlay(true)}
                />
            </div>
            
            {/* 左上: 相手（NPC）ステータス */}
            <div className={`opponent-stats-area ${current_turn === NPC_PLAYER_ID ? 'opponent-turn-indicator' : ''}`}>
                <PlayerStats player={npcPlayer} gameState={gameState} />
            </div>
            
            {/* 中央上: 相手（NPC）の場 */}
            <div className="opponent-field-area">
                <Field 
                    playerName={npcPlayer.name}
                    cards={npcPresentedCards}
                    fieldLimit={npcPlayer.field_limit}
                    onProvideInput={onProvideInput} 
                    awaiting_input={awaiting_input}
                    onCardClick={handleCardClick}
                    onAnimationEnd={handleNpcAnimationEnd}
                />
            </div>
            
            {/* 中央下: 自分（人間）の場 */}
            <div className="player-field-area">
                <Field 
                    playerName={humanPlayer.name}
                    cards={humanPresentedCards}
                    fieldLimit={humanPlayer.field_limit}
                    onProvideInput={onProvideInput} 
                    awaiting_input={awaiting_input}
                    onCardClick={handleCardClick}
                    onAnimationEnd={handleHumanAnimationEnd}
                />
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
                <button className="surrender-button" onClick={handleSurrenderClick}>
                    降伏
                </button>
            </div>
            
            {/* 左下: 自分（人間）ステータス */}
            <div className={`player-stats-area ${current_turn === HUMAN_PLAYER_ID ? 'current-turn-indicator' : ''}`}>
                <PlayerStats 
                    player={humanPlayer} 
                    gameState={gameState} 
                    onEndTurn={onEndTurn}
                />
            </div>

            {/* アニメーションロック中のオーバーレイ */}
            {gameState.isAnimationLocked && (
                <div className="animation-lock-overlay">
                    <div className="animation-lock-message">
                        <div>🎬 演出中...</div>
                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>しばらくお待ちください</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;