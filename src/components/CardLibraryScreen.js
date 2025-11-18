import React, { useState, useMemo } from 'react';
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
          case '3-5':
            return scale >= 3 && scale <= 5;
          case '6+':
            return scale >= 6;
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
      // デフォルトは実装順（card_definitions.jsonの順序）
      return (a.definitionOrder || 0) - (b.definitionOrder || 0);
    });

    return cards;
  }, [cardDefs, sortBy, filterType, filterScale]);

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  return (
    <div className="card-library-screen">
      <div className="screen-header">
        <h1>カード一覧</h1>
        <button className="back-button" onClick={onBack}>← タイトルに戻る</button>
      </div>

      <div className="library-controls">
        <div className="sort-controls">
          <label>ソート:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="implementation">実装順</option>
            <option value="requiredScale">必要規模順</option>
          </select>
        </div>

        <div className="filter-controls">
          <label>カードタイプ:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">すべて</option>
            <option value="財">財</option>
            <option value="事象">事象</option>
            <option value="イデオロギー">イデオロギー</option>
          </select>

          <label>必要規模:</label>
          <select value={filterScale} onChange={(e) => setFilterScale(e.target.value)}>
            <option value="all">すべて</option>
            <option value="0-2">0-2</option>
            <option value="3-5">3-5</option>
            <option value="6+">6+</option>
          </select>
        </div>
      </div>

      <div className="card-grid">
        {filteredAndSortedCards.map((card) => (
          <div 
            key={card.name} 
            className="library-card"
            onClick={() => handleCardClick(card)}
          >
            <div className="card-header">
              <h3>{card.name}</h3>
              <span className="card-type">{card.card_type}</span>
            </div>
            <div className="card-info">
              <div>必要規模: {card.required_scale}</div>
              {card.card_type === '財' && (
                <div>耐久値: {card.durability}</div>
              )}
            </div>
            <div className="card-description">
              {card.description}
            </div>
          </div>
        ))}
      </div>

      <div className="library-stats">
        表示中: {filteredAndSortedCards.length} / {Object.keys(cardDefs).length} カード
      </div>

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};

export default CardLibraryScreen;