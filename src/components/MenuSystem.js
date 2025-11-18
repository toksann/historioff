import React, { useState } from 'react';
import TitleScreen from './TitleScreen.js';
import DeckSelectionScreen from './DeckSelectionScreen.js';
import CardLibraryScreen from './CardLibraryScreen.js';
import RulesOverlay from './overlays/RulesOverlay.js';
import CreditsOverlay from './overlays/CreditsOverlay.js';

const MenuSystem = ({
  gameData,
  onStartGame,
  currentScreen,
  onScreenChange
}) => {
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [showCreditsOverlay, setShowCreditsOverlay] = useState(false);
  const [selectedPlayerDeck, setSelectedPlayerDeck] = useState(null);

  const handleMenuSelect = (option) => {
    switch (option) {
      case 'start':
        onScreenChange('deckSelection');
        break;
      case 'rules':
        setShowRulesOverlay(true);
        break;
      case 'cardLibrary':
        onScreenChange('cardLibrary');
        break;
      case 'credits':
        setShowCreditsOverlay(true);
        break;
      default:
        break;
    }
  };

  const handleDeckSelected = (playerDeck) => {
    // バリデーション
    if (!playerDeck || !playerDeck.name) {
      console.error('Invalid deck selected:', playerDeck);
      return;
    }

    if (!gameData.presetDecks || gameData.presetDecks.length === 0) {
      console.error('No preset decks available');
      return;
    }

    setSelectedPlayerDeck(playerDeck);
    
    // NPC用デッキをランダム選択
    const availableDecks = gameData.presetDecks.filter(deck => deck.name !== playerDeck.name);
    
    if (availableDecks.length === 0) {
      console.error('No available decks for NPC');
      return;
    }
    
    const npcDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
    
    // ゲーム開始
    try {
      onStartGame(playerDeck.name, npcDeck.name);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleBackToTitle = () => {
    onScreenChange('title');
    setSelectedPlayerDeck(null);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'title':
        return <TitleScreen onMenuSelect={handleMenuSelect} />;
      
      case 'deckSelection':
        return (
          <DeckSelectionScreen
            presetDecks={gameData.presetDecks}
            cardDefs={gameData.cardDefs}
            onDeckSelected={handleDeckSelected}
            onBack={handleBackToTitle}
          />
        );
      
      case 'cardLibrary':
        return (
          <CardLibraryScreen
            cardDefs={gameData.cardDefs}
            onBack={handleBackToTitle}
          />
        );
      
      default:
        return <TitleScreen onMenuSelect={handleMenuSelect} />;
    }
  };

  return (
    <div className="menu-system">
      {renderCurrentScreen()}
      
      {/* オーバーレイ */}
      <RulesOverlay
        isOpen={showRulesOverlay}
        onClose={() => setShowRulesOverlay(false)}
      />
      
      <CreditsOverlay
        isOpen={showCreditsOverlay}
        onClose={() => setShowCreditsOverlay(false)}
      />
    </div>
  );
};

export default MenuSystem;