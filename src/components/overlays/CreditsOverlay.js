import React from 'react';

const CREDITS_TEXT = `このゲームの作成には以下のツールが関わっています。

■コーディング＆サポート
 ・Google Gemini (https://gemini.google.com/)
 ・Claude (https://www.anthropic.com/claude)
 ・Kiro (https://kiro.dev/)

■タイトルAA作成
 ・アスキーアート（AA）作成：テキスト、画像からASCII Artを生成 | ラッコツールズ (https://rakko.tools/tools/68/)

ご協力ありがとうございました！`;

const CreditsOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="overlay-modal credits-overlay">
        <div className="overlay-header">
          <h2>【謝辞】</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="overlay-content">
          <pre className="credits-text">{CREDITS_TEXT}</pre>
        </div>
      </div>
    </div>
  );
};

export default CreditsOverlay;