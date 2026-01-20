import React, { useState } from 'react';
import TitleScreen from './TitleScreen.js';
import DeckSelectionScreen from './DeckSelectionScreen.js';
import CardLibraryScreen from './CardLibraryScreen.js';
import RulesOverlay from './overlays/RulesOverlay.js';
import CreditsOverlay from './overlays/CreditsOverlay.js';
import ChangelogModal from './overlays/ChangelogModal.js'; // Import ChangelogModal

const MenuSystem = ({
  gameData,
  onStartGame,
  currentScreen,
  onScreenChange,
  version // Receive version prop from App.js
}) => {
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [showCreditsOverlay, setShowCreditsOverlay] = useState(false);
  const [showChangelogOverlay, setShowChangelogOverlay] = useState(false); // State for ChangelogModal
  const [selectedPlayerDeck, setSelectedPlayerDeck] = useState(null);

  const handleMenuSelect = (option) => {
    switch (option) {
      case 'start':
        onScreenChange('deckSelection');
        break;
      case 'deckBuilder':
        onScreenChange('deckBuilder');
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
      case 'changelog': // New case for changelog
        setShowChangelogOverlay(true);
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
        return <TitleScreen onMenuSelect={handleMenuSelect} onShowChangelog={() => setShowChangelogOverlay(true)} version={version} />; // Pass onShowChangelog and version
      
      case 'deckSelection':
        return (
          <DeckSelectionScreen
            presetDecks={gameData.presetDecks}
            cardDefs={gameData.cardDefs}
            onDeckSelected={handleDeckSelected}
            onBack={handleBackToTitle}
            onScreenChange={onScreenChange}
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
        return null;
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

      <ChangelogModal // Render ChangelogModal
        isOpen={showChangelogOverlay}
        onClose={() => setShowChangelogOverlay(false)}
        version={version}
      />
    </div>
  );
};

export default MenuSystem;