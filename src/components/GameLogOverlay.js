import React, { useState, useEffect, useRef } from 'react';
import CardDetail from './CardDetail.js';
import '../App.css';

const GameLogOverlay = ({ gameState, logEntries, getFilteredEntries, onClose }) => { // Modified props
    const [filterType, setFilterType] = useState('all');
    const [selectedCard, setSelectedCard] = useState(null);
    const logContentRef = useRef(null);
    
    // スマートスクロール: ユーザーが最下部付近にいる場合のみ自動スクロール
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [userScrolledUp, setUserScrolledUp] = useState(false);
    
    // スクロールイベントリスナー
    useEffect(() => {
        const element = logContentRef.current;
        if (!element) return;
        
        const handleScroll = () => {
            const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
            setUserScrolledUp(!isNearBottom);
        };
        
        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
    }, []);
    
    useEffect(() => {
        if (logContentRef.current && logEntries && gameState) { // Use logEntries directly
            const filteredEntries = getFilteredEntries(filterType); // Use getFilteredEntries directly
            if (filteredEntries) {
                const element = logContentRef.current;
                
                // 初回ロード時は必ず最下部にスクロール
                if (isInitialLoad) {
                    element.scrollTop = element.scrollHeight;
                    setIsInitialLoad(false);
                    return;
                }
                
                // ユーザーが上にスクロールしていない場合のみ自動スクロール
                if (!userScrolledUp) {
                    element.scrollTop = element.scrollHeight;
                }
            }
        }
    }, [logEntries, gameState, filterType, isInitialLoad, userScrolledUp, getFilteredEntries]); // Add getFilteredEntries to dependencies
    
    // DEBUG: Log logEntries when it changes
    useEffect(() => {
        console.log('DEBUG: GameLogOverlay - logEntries changed:', logEntries);
    }, [logEntries]);

    // logEntriesは必須のpropsとして扱う
    if (!logEntries) {
        return null;
    }
    
    if (!gameState) return null;

    // フィルタリングされたログエントリーを取得
    const filteredEntries = getFilteredEntries(filterType); // Use getFilteredEntries directly
    
    // logStatsはenhancedLogから取得していたが、enhancedLogがなくなったので再計算
    const logStats = {
        total: logEntries.length,
        effect: logEntries.filter(entry => entry.source === 'effect_queue').length,
        progress: logEntries.filter(entry => entry.source === 'game_log').length,
        isEnabled: true // Assuming log is always enabled when overlay is open
    };

    const handleOverlayClick = (e) => {
        // オーバーレイの背景をクリックした場合のみ閉じる
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // ログエントリーからカード情報を取得
    const getCardFromLogEntry = (entry) => {
        if (!entry || !gameState) {
            console.log('No entry or gameState');
            return null;
        }
        
        // 1. details.cardIdから検索（最も確実）
        if (entry.details && entry.details.cardId && gameState.all_card_instances) {
            const card = gameState.all_card_instances[entry.details.cardId];
            if (card) return card;
        }
        
        // 2. sourceCardIdから検索
        if (entry.sourceCardId && gameState.all_card_instances) {
            const card = gameState.all_card_instances[entry.sourceCardId];
            if (card) return card;
        }
        
        // 3. sourceCardから実際のカード名を抽出して検索
        if (entry.sourceCard) {
            // "あなた>農民" から "農民" を抽出
            const cardName = entry.sourceCard.includes('>') 
                ? entry.sourceCard.split('>')[1] 
                : entry.sourceCard;
            
            // cardDefsから検索
            if (gameState.cardDefs && gameState.cardDefs[cardName]) {
                const card = gameState.cardDefs[cardName];
                return card;
            }
            
            // all_card_instancesから名前で検索
            if (gameState.all_card_instances) {
                const cardInstance = Object.values(gameState.all_card_instances)
                    .find(card => card && card.name === cardName);
                if (cardInstance) return cardInstance;
            }
            
            // プレイヤーの手札・フィールドから検索
            if (gameState.players) {
                for (const player of Object.values(gameState.players)) {
                    // 手札から検索
                    const handCard = player.hand?.find(card => card.name === cardName);
                    if (handCard) {
                        // console.log('Found card in player hand:', handCard);
                        return handCard;
                    }
                    
                    // フィールドから検索
                    const fieldCard = player.field?.find(card => card.name === cardName);
                    if (fieldCard) {
                        // console.log('Found card in player field:', fieldCard);
                        return fieldCard;
                    }
                    
                    // イデオロギーから検索
                    if (player.ideology && player.ideology.name === cardName) {
                        // console.log('Found card as ideology:', player.ideology);
                        return player.ideology;
                    }
                }
            }
        }
        
        // console.log('No card found anywhere');
        return null;
    };

    // ログエントリーのクリック処理
    const handleLogEntryClick = (entry, e) => {
        // console.log('Log entry clicked:', entry);
        e.stopPropagation();
        const card = getCardFromLogEntry(entry);
        // console.log('Card to show:', card);
        
        if (card) {
            setSelectedCard(card);
        }
        else {
            // console.log('No card found, cannot show detail');
            // 実際のカード情報が見つからない場合の処理
            // デバッグ情報を確認してから適切な修正を行います
        }
    };

    // ログエントリーのフォーマット
    const formatLogEntry = (entry, index) => {
        
        // 強化されたログエントリーの場合（より柔軟な条件）
        if ((entry.type === 'effect' || entry.source === 'effect_queue') && 
            (entry.playerName || entry.sourceCard || entry.sourceCardId)) {
            const playerName = entry.playerName || 'プレイヤー';
            const sourceName = entry.sourceCard || 'カード';
            const description = entry.description || entry.message || '効果';
            
            return (
                <div className="enhanced-log-entry">
                    <span className="log-player">[{playerName}]</span>
                    <span className="log-source">[{sourceName}]</span>
                    <span className="log-description">{description}</span>
                </div>
            );
        }
        
        // 既存のログエントリーの場合
        if (typeof entry === 'string') {
            return entry;
        }
        
        if (entry.message) {
            return entry.message;
        }
        
        if (entry.description) {
            return entry.description;
        }
        
        // フォールバック
        return `効果 ${index + 1}`;
    };

    // フィルターオプション
    const filterOptions = [
        { value: 'all', label: 'すべて' },
        { value: 'card_play', label: 'カードプレイ' },
        { value: 'damage', label: 'ダメージ' },
        { value: 'resource', label: 'リソース変更' },
        { value: 'card_move', label: 'カード移動' }
    ];

    return (
        <>
            {/* カード詳細オーバーレイ */}
            {selectedCard && (
                <CardDetail 
                    card={selectedCard} 
                    onClose={() => setSelectedCard(null)} 
                />
            )}
            
            <div className="game-log-overlay" onClick={handleOverlayClick}>
                <div className="game-log-modal">
                <div className="game-log-header">
                    <h2>プレイログ</h2>
                    <div className="log-controls">
                        {userScrolledUp && (
                            <button 
                                className="scroll-to-bottom-button"
                                onClick={() => {
                                    if (logContentRef.current) {
                                        logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
                                        setUserScrolledUp(false);
                                    }
                                }}
                                title="最新のログに戻る"
                            >
                                ↓ 最新
                            </button>
                        )}
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                </div>
                
                <div className="log-filter-bar">
                    {filterOptions.map(option => (
                        <button
                            key={option.value}
                            className={`filter-button ${filterType === option.value ? 'active' : ''}`}
                            onClick={() => setFilterType(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                
                <div className="game-log-content" ref={logContentRef}>
                    {filteredEntries.length === 0 ? (
                        <div className="no-log">
                            {filterType === 'all' ? 'まだログがありません' : 'フィルター条件に一致するログがありません'}
                        </div>
                    ) : (
                        <div className="log-entries">
                            {console.log('DEBUG: GameLogOverlay - filteredEntries before map:', filteredEntries)}
                            {filteredEntries.map((entry, index) => {
                                const card = getCardFromLogEntry(entry);
                                const isClickable = !!card;
                                
                                return (
                                    <div 
                                        key={entry.id || index} 
                                        className={`log-entry ${entry.type === 'effect' ? 'enhanced-entry' : 'original-entry'} ${isClickable ? 'clickable-log-entry' : ''}`}
                                        onClick={isClickable ? (e) => handleLogEntryClick(entry, e) : undefined}
                                        title={isClickable ? `カード詳細を見る` : undefined}
                                    >
                                        <div className="log-index">{index + 1}</div>
                                        <div className="log-message">
                                            {formatLogEntry(entry, index)}
                                        </div>
                                        {entry.type === 'effect' && entry.details && (
                                            <div className="log-timestamp">
                                                {new Date(entry.timestamp).toLocaleTimeString()}
                                            </div>
                                        )}
                                        {isClickable && <div className="log-click-hint">📋 クリックで詳細</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="game-log-footer">
                    <div className="log-stats">
                        総ログ数: {logStats.total}件 
                        (効果: {logStats.effect}件, 進行: {logStats.progress}件)
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default GameLogOverlay;