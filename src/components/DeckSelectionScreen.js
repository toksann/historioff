import React, { useState } from 'react';
import CardDetail from './CardDetail.js';

const DeckSelectionScreen = ({ presetDecks, cardDefs, onDeckSelected, onBack }) => {
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setShowDeckPreview(true);
  };

  const handleConfirmDeck = () => {
    if (!selectedDeck) {
      alert('デッキを選択してください');
      return;
    }
    
    if (!selectedDeck.cards || selectedDeck.cards.length === 0) {
      alert('選択されたデッキにカードが含まれていません');
      return;
    }
    
    onDeckSelected(selectedDeck);
  };

  const handleCardClick = (cardName) => {
    const cardDef = cardDefs[cardName];
    if (cardDef) {
      setSelectedCard(cardDef);
    }
  };

  const renderDeckPreview = () => {
    if (!selectedDeck || !showDeckPreview) return null;

    const deckCards = selectedDeck.cards.reduce((acc, cardName) => {
      acc[cardName] = (acc[cardName] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="deck-preview">
        <h3>{selectedDeck.name}</h3>
        <p className="deck-description">{selectedDeck.description}</p>
        
        <div className="deck-cards">
          <h4>デッキ内容 ({selectedDeck.cards.length}枚)</h4>
          <div className="card-list">
            {Object.entries(deckCards).map(([cardName, count]) => {
              const cardDef = cardDefs[cardName];
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
        
        <div className="deck-actions">
          <button onClick={() => setShowDeckPreview(false)}>戻る</button>
          <button onClick={handleConfirmDeck} className="confirm-button">
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
          <h2>プリセットデッキを選択してください</h2>
          <div className="deck-grid">
            {presetDecks.map((deck) => (
              <div 
                key={deck.name} 
                className="deck-card"
                onClick={() => handleDeckSelect(deck)}
              >
                <h3>{deck.name}</h3>
                <p className="deck-description">{deck.description}</p>
                <div className="deck-info">
                  <span>カード数: {deck.cards.length}枚</span>
                </div>
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