import React from 'react';

const HELP_TEXT = `
■ 基本ルール
* デッキは必ず30~100枚で構築してください。
* 同じカードの枚数制限はありません。

■ デッキ構築の方法
1. 「カード」一覧:
   カードはクリックでデッキへ追加できます。
   画面左の一覧からカードを左へフリックすると、詳細を確認できます。

2. 「現在のデッキ」エリア:
   画面右側があなたのデッキです。ここにあるカードをクリックすると、そのカードを1枚デッキから削除します。
   デッキ内のカード枚数と、同じカードの枚数が表示されます。

3. 「規模分布」:
   デッキ内のカードの「必要規模」の分布をグラフで確認できます。
   「表示切替」ボタンで、コストごとの表示と、範囲をまとめた表示を切り替えられます。

4. 「デッキの保存」:
   デッキに名前を付けて「保存」ボタンを押すと、作成したデッキが保存されます。
   「エクスポート」でデッキデータをファイルとして保存でき、「インポート」でファイルを読み込めます。
`;

const DeckBuilderHelpOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="overlay-modal rules-overlay">
        <div className="overlay-header">
          <h2>【ありうべき運命の選定】</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="overlay-content">
          <pre className="rules-text">{HELP_TEXT}</pre>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilderHelpOverlay;
