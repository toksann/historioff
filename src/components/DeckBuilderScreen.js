import React, { useState, useMemo, useEffect, useRef } from 'react';
import CardDetail from './CardDetail.js';
import CostCurveChart from './CostCurveChart.js';
import { saveToStorage, getFromStorage } from '../utils/localStorage.js';
import InfoModal from './overlays/InfoModal.js';
import DeckBuilderHelpOverlay from './overlays/DeckBuilderHelpOverlay.js'; // Import the new component
import { MIN_DECK_SIZE, MAX_DECK_SIZE } from '../gameLogic/constants.js';
import './DeckBuilderScreen.css';
import './CostCurveChart.css';
import './overlays/InfoModal.css';

const DeckBuilderScreen = ({ gameData, onExit, deckToEdit }) => { // deckToEdit prop added
  const { cardDefs } = gameData;
  const [deck, setDeck] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [allDecks, setAllDecks] = useState({});
  const [sortBy, setSortBy] = useState('implementation');
  const [filterType, setFilterType] = useState('all');
  const [filterScale, setFilterScale] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [costCurveMode, setCostCurveMode] = useState('single'); // 'single' or 'grouped'
  const fileInputRef = useRef(null);
  const [modalInfo, setModalInfo] = useState({ isOpen: false, message: '' });
  const [isHelpVisible, setHelpVisible] = useState(false); // State for the help overlay

  useEffect(() => {
    const customDecks = getFromStorage('customDecks') || {};
    setAllDecks(customDecks);
  }, []);

  // This new useEffect handles loading the deck for editing
  useEffect(() => {
    if (deckToEdit && cardDefs) {
      const newDeckCards = deckToEdit.cards.map(cardName => {
        return Object.values(cardDefs).find(def => def.name === cardName);
      }).filter(Boolean); // Filter out any cards that might not be found

      setDeckName(deckToEdit.name);
      setDeck(newDeckCards.sort((a, b) => a.required_scale - b.required_scale));
    }
  }, []);

  const filteredAndSortedCards = useMemo(() => {
    if (!cardDefs) return [];
    let cards = Object.values(cardDefs);

    // トークンカードを除外
    cards = cards.filter(card => !card.is_token);

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

    cards.sort((a, b) => {
      if (sortBy === 'requiredScale') {
        return a.required_scale - b.required_scale;
      }
      return (a.definitionOrder || 0) - (b.definitionOrder || 0);
    });

    return cards;
  }, [cardDefs, sortBy, filterType, filterScale]);
  
  const costCurveData = useMemo(() => {
    const counts = {};
    if (costCurveMode === 'single') {
      deck.forEach(card => {
        const cost = card.required_scale;
        counts[cost] = (counts[cost] || 0) + 1;
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
      deck.forEach(card => {
        const cost = card.required_scale;
        if (cost <= 4) groups['0-4']++;
        else if (cost <= 9) groups['5-9']++;
        else if (cost <= 14) groups['10-14']++;
        else if (cost <= 19) groups['15-19']++;
        else groups['20+']++;
      });
      return Object.entries(groups).map(([label, count]) => ({ label, count }));
    }
  }, [deck, costCurveMode]);

  const addCardToDeck = (card) => {
    if (deck.length >= MAX_DECK_SIZE) {
      setModalInfo({ isOpen: true, message: `デッキは${MAX_DECK_SIZE}枚までです。` });
      return;
    }
    const newDeck = [...deck, card].sort((a, b) => a.required_scale - b.required_scale);
    setDeck(newDeck);
  };

  const removeCardFromDeck = (cardToRemove, index) => {
    const newDeck = deck.filter((_, i) => i !== index);
    setDeck(newDeck);
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleSaveDeck = () => {
    if (!deckName) {
      setModalInfo({ isOpen: true, message: 'デッキ名を入力してください。' });
      return;
    }
    if (deck.length === 0) {
      setModalInfo({ isOpen: true, message: 'デッキが空です。' });
      return;
    }
    const newDecks = {
      ...allDecks,
      [deckName]: {
        name: deckName,
        cards: deck.map(c => c.name),
      }
    };
    saveToStorage('customDecks', newDecks);
    setAllDecks(newDecks);
    setModalInfo({ isOpen: true, message: `デッキ「${deckName}」を保存しました！` });
  };

  const handleExportDeck = () => {
    if (!deckName || deck.length === 0) {
      setModalInfo({ isOpen: true, message: 'エクスポートする前に、デッキに名前を付けてカードを追加してください。' });
      return;
    }
    const deckData = {
      name: deckName,
      cards: deck.map(c => c.name),
    };
    const jsonString = JSON.stringify(deckData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportDeck = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedDeckData = JSON.parse(e.target.result);
        if (importedDeckData && importedDeckData.name && Array.isArray(importedDeckData.cards)) {
          // Check for duplicates and ask for confirmation
          if (allDecks[importedDeckData.name]) {
            if (!window.confirm(`デッキ「${importedDeckData.name}」は既に存在します。上書きしますか？`)) {
              event.target.value = ''; // Reset file input
              return;
            }
          }

          const newDeckCards = importedDeckData.cards.map(cardName => {
            return Object.values(cardDefs).find(def => def.name === cardName);
          }).filter(Boolean); // Filter out any undefined cards

          setDeckName(importedDeckData.name);
          setDeck(newDeckCards.sort((a, b) => a.required_scale - b.required_scale));

          // Also save the imported deck to localStorage
          const newCustomDecks = {
            ...allDecks,
            [importedDeckData.name]: {
              name: importedDeckData.name,
              cards: importedDeckData.cards,
            }
          };
          saveToStorage('customDecks', newCustomDecks);
          setAllDecks(newCustomDecks); // Update the state for the deck list

          setModalInfo({ isOpen: true, message: `デッキ「${importedDeckData.name}」をインポートして保存しました！` });
        } else {
          throw new Error('無効なデッキファイル形式です。');
        }
      } catch (error) {
        setModalInfo({ isOpen: true, message: `インポートエラー: ${error.message}` });
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };
  
  const onDragStart = (e, card) => {
    e.dataTransfer.setData("card", JSON.stringify(card));
  };
  
  const onDragOver = (e) => {
    e.preventDefault();
  };
  
  const onDrop = (e) => {
    e.preventDefault();
    const card = JSON.parse(e.dataTransfer.getData("card"));
    addCardToDeck(card);
  };

  if (!cardDefs) {
    return (
      <div className="deck-builder-screen">
        <div className="deck-builder-container">
          <h1>デッキ構築</h1>
          <p>カード定義を読み込めませんでした...</p>
          <button onClick={onExit} className="exit-button">メニューに戻る</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="deck-builder-screen">
      <InfoModal 
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        onClose={() => setModalInfo({ isOpen: false, message: '' })}
      />
      <DeckBuilderHelpOverlay 
        isOpen={isHelpVisible}
        onClose={() => setHelpVisible(false)}
      />
      <div className="deck-builder-container">
        <div className="screen-header">
          <div className="header-left">
            <h1>デッキ構築</h1>
            <button onClick={() => setHelpVisible(true)} className="help-button">?</button>
          </div>
          <button onClick={onExit} className="back-button">← タイトルに戻る</button>
        </div>
        <div className="deck-builder-layout">
          {/* Card Library Section */}
          <div className="card-library-section">
            <div className="library-header">
              <h2>カード</h2>
              <div className="library-controls">
                <div className="sort-controls">
                  <label>ソート:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="implementation">実装順</option>
                    <option value="requiredScale">必要規模順</option>
                  </select>
                </div>
                <div className="filter-controls">
                  <label>タイプ:</label>
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
                    <option value="3-15">3-15</option>
                    <option value="16+">16+</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="deck-builder-card-grid">
              {filteredAndSortedCards.map((card) => (
                <div 
                  key={card.name} 
                  className={`deck-builder-library-card card-type-${card.card_type}`}
                  onClick={() => handleCardClick(card)}
                  draggable
                  onDragStart={(e) => onDragStart(e, card)}
                  title="クリックで詳細表示、ドラッグでデッキに追加"
                >
                  {card.name} ({card.required_scale})
                </div>
              ))}
            </div>
          </div>

          {/* Deck Building Section */}
          <div className="deck-building-section" onDragOver={onDragOver} onDrop={onDrop}>
            <h2>現在のデッキ ({deck.length}/{deck.length <= MIN_DECK_SIZE ? MIN_DECK_SIZE : MAX_DECK_SIZE})</h2>
            <div className="deck-list">
              {deck.length === 0 ? (
                <div className="empty-deck-placeholder">
                  <p>ドラッグ＆ドロップで<br/>カードを追加</p>
                </div>
              ) : (
                Object.values(deck.reduce((acc, card) => {
                  if (!acc[card.name]) {
                  acc[card.name] = { card: card, count: 0 };
                }
                acc[card.name].count++;
                return acc;
              }, {})).map(({ card, count }) => (
                <div 
                  key={card.name} 
                  className="deck-card"
                  onClick={() => removeCardFromDeck(card, deck.findIndex(c => c.name === card.name))}
                  title="クリックでデッキから1枚削除"
                >
                {count > 1 && <div className="deck-card-count">x{count}</div>}
                <span>{card.name} ({card.required_scale})</span>
                </div>
              ))
              )}
            </div>
            <div className="cost-curve-wrapper">
              <div className="cost-curve-header">
                <h3>規模分布</h3>
                <button onClick={() => setCostCurveMode(costCurveMode === 'single' ? 'grouped' : 'single')}>
                  表示切替 ({costCurveMode === 'single' ? '1区切り' : '5区切り'})
                </button>
              </div>
              <CostCurveChart data={costCurveData} />
            </div>
            <div className="deck-actions">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="デッキ名を入力"
                className="deck-name-input"
              />
              <button onClick={handleSaveDeck} className="primary-action">保存</button>
              <button onClick={handleExportDeck} className="secondary-action">エクスポート</button>
              <button onClick={handleImportClick} className="secondary-action">インポート</button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".json" 
                onChange={handleImportDeck} 
              />
            </div>
          </div>
        </div>
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

export default DeckBuilderScreen;
