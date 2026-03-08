import React, { useState, useMemo } from 'react';
import Card from './Card.js';
import CardDetail from './CardDetail.js';

const CardLibraryScreen = ({ cardDefs, onBack }) => {
  const [sortBy, setSortBy] = useState('implementation');
  const [filterType, setFilterType] = useState('all');
  const [filterScale, setFilterScale] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);

  const filteredAndSortedCards = useMemo(() => {
    let cards = Object.values(cardDefs);

    // フィルタリング
    if (filterType !== 'all') {
      cards = cards.filter(card => card.card_type === filterType);
    }

    if (filterScale !== 'all') {
      cards = cards.filter(card => {
        const scale = card.required_scale;
        switch (filterScale) {
          case '0-2':
            return scale >= 0 && scale <= 2;
          case '3-15':
            return scale >= 3 && scale <= 15;
          case '16+':
            return scale >= 16;
          default:
            return true;
        }
      });
    }

    // ソート
    cards.sort((a, b) => {
      if (sortBy === 'requiredScale') {
        return a.required_scale - b.required_scale;
      }
      return (a.definitionOrder || 0) - (b.definitionOrder || 0);
    });

    return cards;
  }, [cardDefs, sortBy, filterType, filterScale]);

  return (
    <div className="card-library-screen">
      <div className="screen-header">
        <div className="header-left">
          <h1>歴史アーカイブ</h1>
        </div>
        <button className="back-button" onClick={onBack}>
          ← タイトルに戻る
        </button>
      </div>

      <div className="library-controls">
        <div className="control-group">
          <label>ソート基準:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="implementation">実装順</option>
            <option value="requiredScale">必要規模順</option>
          </select>
        </div>

        <div className="control-group">
          <label>カードタイプ:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">すべて</option>
            <option value="財">財</option>
            <option value="事象">事象</option>
            <option value="イデオロギー">イデオロギー</option>
          </select>
        </div>

        <div className="control-group">
          <label>必要規模:</label>
          <select value={filterScale} onChange={(e) => setFilterScale(e.target.value)}>
            <option value="all">すべて</option>
            <option value="0-2">0-2</option>
            <option value="3-15">3-15</option>
            <option value="16+">16+</option>
          </select>
        </div>
        
        <div className="library-stats">
          表示中: {filteredAndSortedCards.length} / {Object.keys(cardDefs).length}
        </div>
      </div>

      <div className="card-grid">
        {filteredAndSortedCards.map((card) => (
          <div key={card.name} className="card-library-wrapper">
            <Card 
              card={card}
              mode="library"
              onClick={() => setSelectedCard(card)}
            />
          </div>
        ))}
      </div>

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          cardDefs={cardDefs}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};

export default CardLibraryScreen;
