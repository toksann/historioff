import React, { useState, useEffect, useMemo } from 'react';
import CardDetail from './CardDetail.js';
import { getFromStorage, saveToStorage } from '../utils/localStorage.js';
import CostCurveChart from './CostCurveChart.js';
import './CostCurveChart.css';

const DeckSelectionScreen = ({ presetDecks, cardDefs, onDeckSelected, onBack, onScreenChange }) => {
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [customDecks, setCustomDecks] = useState({});
  const [costCurveMode, setCostCurveMode] = useState('single'); // 'single' or 'grouped'

  useEffect(() => {
    setCustomDecks(getFromStorage('customDecks') || {});
  }, []);

  const allDecks = useMemo(() => {
    const combined = [
      ...presetDecks.map(deck => ({ ...deck, type: 'プリセット', isValid: deck.cards.length >= 30 })),
      ...Object.values(customDecks).map(deck => ({ ...deck, type: 'カスタム', isValid: deck.cards.length >= 30 }))
    ];
    return combined;
  }, [presetDecks, customDecks]);

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setShowDeckPreview(true);
  };

  const handleConfirmDeck = () => {
    if (!selectedDeck) {
      alert('デッキを選択してください。');
      return;
    }
    if (!selectedDeck.isValid) {
      alert('このデッキは使用できません（30枚以上のカードが必要です）。');
      return;
    }
    if (!selectedDeck.cards || selectedDeck.cards.length === 0) {
      alert('選択されたデッキにカードがありません。');
      return;
    }
    onDeckSelected(selectedDeck);
  };

  const handleCardClick = (cardName) => {
    const cardDef = Object.values(cardDefs).find(def => def.name === cardName);
    if (cardDef) {
      setSelectedCard(cardDef);
    }
  };

  const handleDeleteDeck = (deckName, event) => {
    event.stopPropagation(); // Prevent card selection when clicking delete
    if (window.confirm(`デッキ「${deckName}」を本当に削除しますか？`)) {
      const newCustomDecks = { ...customDecks };
      delete newCustomDecks[deckName];
      saveToStorage('customDecks', newCustomDecks);
      setCustomDecks(newCustomDecks);
    }
  };

  const handleEditDeck = (deck, event) => {
    event.stopPropagation();
    // This part is not fully implemented yet, as it requires passing the deck to the builder
    alert(`「${deck.name}」の編集機能はまだ実装されていません。`);
    // onScreenChange('deckBuilder', { deckToEdit: deck });
  };

  const renderDeckPreview = () => {
    if (!selectedDeck || !showDeckPreview) return null;

    const deckCards = selectedDeck.cards.reduce((acc, cardName) => {
      acc[cardName] = (acc[cardName] || 0) + 1;
      return acc;
    }, {});

    const costCurveData = (() => {
      if (costCurveMode === 'single') {
        const counts = {};
        selectedDeck.cards.forEach(cardName => {
          const cardDef = Object.values(cardDefs).find(def => def.name === cardName);
          if (cardDef) {
            const cost = cardDef.required_scale;
            counts[cost] = (counts[cost] || 0) + 1;
          }
        });
        const maxCost = Math.max(...Object.keys(counts).map(Number), 0);
        const data = [];
        for (let i = 0; i <= maxCost; i++) {
          if (counts[i] > 0) {
            data.push({ label: `${i}`, count: counts[i] });
          }
        }
        return data;
      } else { // grouped
        const groups = { '0-4': 0, '5-9': 0, '10-14': 0, '15-19': 0, '20+': 0 };
        selectedDeck.cards.forEach(cardName => {
          const cardDef = Object.values(cardDefs).find(def => def.name === cardName);
          if (cardDef) {
            const cost = cardDef.required_scale;
            if (cost <= 4) groups['0-4']++;
            else if (cost <= 9) groups['5-9']++;
            else if (cost <= 14) groups['10-14']++;
            else if (cost <= 19) groups['15-19']++;
            else groups['20+']++;
          }
        });
        return Object.entries(groups).map(([label, count]) => ({ label, count }));
      }
    })();

    return (
      <div className="deck-preview">
        <h3>{selectedDeck.name} {!selectedDeck.isValid && '(枚数不足)'}</h3>
        <p className="deck-description">{selectedDeck.description || `${selectedDeck.type}デッキ`}</p>
        
        <div className="deck-cards">
          <h4>デッキ内容 ({selectedDeck.cards.length}枚)</h4>
          <div className="card-list">
            {Object.entries(deckCards).map(([cardName, count]) => {
              const cardDef = Object.values(cardDefs).find(def => def.name === cardName);
              if (!cardDef) return null;
              
              return (
                <div 
                  key={cardName} 
                  className="deck-card-item"
                  onClick={() => handleCardClick(cardName)}
                >
                  <span className="card-count">×{count}</span>
                  <span className="card-name">{cardName}</span>
                  <span className="card-type">({cardDef.card_type})</span>
                  <span className="card-scale">規模:{cardDef.required_scale}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cost-curve-wrapper">
          <div className="cost-curve-header">
            <h3>コストカーブ</h3>
            <button onClick={() => setCostCurveMode(costCurveMode === 'single' ? 'grouped' : 'single')}>
              表示切替 ({costCurveMode === 'single' ? '1区切り' : '5区切り'})
            </button>
          </div>
          <CostCurveChart data={costCurveData} />
        </div>
        
        <div className="deck-actions">
          <button onClick={() => setShowDeckPreview(false)}>戻る</button>
          <button onClick={handleConfirmDeck} className="confirm-button" disabled={!selectedDeck.isValid}>
            このデッキでゲーム開始
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="deck-selection-screen">
      <div className="screen-header">
        <h1>デッキ選択</h1>
        <button className="back-button" onClick={onBack}>← タイトルに戻る</button>
      </div>

      {!showDeckPreview ? (
        <div className="deck-list">
          <h2>デッキを選択</h2>
          <div className="deck-grid">
            {allDecks.map((deck) => (
              <div 
                key={deck.name} 
                className={`deck-card ${!deck.isValid ? 'invalid' : ''}`}
                onClick={() => handleDeckSelect(deck)}
              >
                <span className={`deck-type-badge ${deck.type.toLowerCase()}`}>{deck.type}</span>
                <h3>{deck.name}</h3>
                <p className="deck-description">{deck.description}</p>
                <div className="deck-info">
                  <span>カード数: {deck.cards.length}</span>
                  {!deck.isValid && <span className="invalid-tag">無効（30枚以上必要）</span>}
                </div>
                {deck.type === 'カスタム' && (
                  <div className="custom-deck-actions">
                    <button className="edit-button" onClick={(e) => handleEditDeck(deck, e)}>編集</button>
                    <button className="delete-button" onClick={(e) => handleDeleteDeck(deck.name, e)}>削除</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        renderDeckPreview()
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};

export default DeckSelectionScreen;