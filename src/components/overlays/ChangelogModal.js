import React from 'react';
import './InfoModal.css'; // Assuming similar styling

const ChangelogModal = ({ isOpen, onClose, version }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay">
      <div className="info-modal-content">
        <div className="info-modal-header">
          <h2>更新履歴</h2>
          <button className="info-modal-close-button" onClick={onClose}>×</button>
        </div>
        <div className="info-modal-body">
          <p>現在のバージョン: {version}</p>
          <h3>Version 0.0.4 (2026/01/13)</h3>
          <ul>
            <li>画面調整：カードUIの財カードの耐久値表示が見づらかったので調整</li>
          </ul>
          <h3>Version 0.0.3 (2026/01/12)</h3>
          <ul>
            <li>画面調整：カードUIの規模と財カードの耐久値の表示を調整</li>
          </ul>
          <h3>Version 0.0.2 (2026/01/11)</h3>
          <ul>
            <li>画面調整：モバイルUIの縦幅を少し縮め、画面内からややはみ出ていた情報が収まるよう調整</li>
          </ul>
          <h3>Version 0.0.1 (2025/12/25)</h3>
          <ul>
            <li>不具合修正：マリガンで引いたカードの存在箇所が正しくなく、一部のカード効果において正しい挙動をしなかったため修正</li>
            <li>仕様変更：資本主義のターン終了時効果を次のように修正</li>
            <li>修正前「ターン終了時、場のマネーの耐久値と同じ回数ランダムな財の耐久値を+1し、」</li>
            <li>修正後「ターン終了時、場のマネーの耐久値をランダムに場の財に耐久値を割り振ってプラスし、」</li>
            <li>変更経緯：マネーの耐久値が非常に多い場合、耐久値分の回数の処理が働くことでアニメーション負荷が高くなり正常にゲームが進行しなくなる場合があるため</li>
            <li>機能追加：この更新履歴を追加</li>
          </ul>
          <h3>Version 0.0.0 (2025/12/21)</h3>
          <ul>
            <li>公開</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;