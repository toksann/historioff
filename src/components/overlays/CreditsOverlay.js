import React from 'react';

const CREDITS_TEXT = `このゲームの作成には以下のツールが関わっています。

■コーディング＆サポート
 ・Google Gemini (https://gemini.google.com/)
 ・Claude (https://www.anthropic.com/claude)
 ・Kiro (https://kiro.dev/)
※AIツールにソースコードの生成・修正の大部分を支援いただいていますが、ゲームロジック全般の構造設計及び細かな修正は手動で行いました。

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