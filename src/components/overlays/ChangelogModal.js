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
          <h3>Version 0.2.0 (2026/03/xx)</h3>
          <ul>
            <li><font color="yellow">画面調整</font>：新UIの適用により全体のグラフィックを調整</li>
            <li><font color="yellow">仕様変更</font>：一部カード効果の修正。</li>
            <li>　「資本主義」：ターン開始時効果に「自分の手札、デッキのすべてのカードの必要規模+6」と、場の財にダメージを与える前に「自分の場の財の数と同じだけ意識をプラスすることを2回行う」を追加。自分の財カードに与えるダメージを場の財のうち最も低い耐久値の値に変更。また、ダメージ後に「場に残っている財カード」の耐久値+3する効果を追加。</li>
            <li>変更経緯：モチーフらしさをより強調しつつ、使用感を向上させるため。</li>
            <li>　「一神教」：捨て札時効果に「手札が上限に達していない」条件を追加し、規模減少効果を削除。</li>
            <li>　「受難」：規模減少効果を-5→-3に変更。</li>
            <li>　「崇拝」：意識上昇効果を+3→+1に変更。</li>
            <li>　「救世」：規模-10する効果を追加。</li>
            <li>変更経緯：「一神教」軸でのデッキ回しに於いて、進行状況による意識と規模のコントロール体験によりメリハリを与えるため。</li>
            <li>　「多文化主義」：効果の内容は変更されないが、内部的な処理を変更し、意識や規模の増減効果の軽減及び増幅効果の影響を受けないように変更。</li>
            <li>変更経緯：効果は外部との組み合わせによる柔軟性を失うが、内部効果同士の均衡を維持することで、使用に一定の緊張感を保つため。</li>
            <li>　「多極主義」：必要規模を60→40に変更。獲得するマネーの耐久値と減少する規模を「現在規模の75%」に変更。</li>
            <li>変更経緯：ターン終了時効果の発動条件を満たしやすくしつつ、加える「マネー」の耐久値の実質的な維持と必要規模の低下による使いやすさ向上のため。</li>
          </ul>
          <h3>Version 0.1.4 (2026/03/01)</h3>
          <ul>
            <li><font color="yellow">機能追加</font>：チュートリアルの追加(ゲーム開始 ＞ チュートリアル)</li>
            <li><font color="yellow">不具合修正</font>：「終末」「大地震」の効果が発動しない場合がある不具合を修正</li>
            <li><font color="yellow">仕様変更</font>：事象カードプレイ時のカード表示を、効果発動<font color="yellow">後</font>から効果発動<font color="yellow">前</font>へ変更</li>
            <li><font color="yellow">仕様変更</font>：一部カード効果の上方修正</li>
            <li>　「官僚主義」：ターン終了時に自分の手札(当カード除く)の必要規模-1する効果を追加</li>
            <li>　「多極主義」：手札に加わったイデオロギーを捨てるたび意識+2の効果を追加</li>
            <li>　「果実」：耐久値が0になったとき、正面の財カードをデッキに戻す効果を追加</li>
            <li>変更経緯：カード用途の拡張による、より幅のあるデッキ構築実現のため</li>
            <li><font color="yellow">表記変更</font>：「一神教」の一部性能を仕様に合わせて訂正。</li>
            <li>　※性能自体の変更はありません。</li>
            <li>修正前「配置時、手札とデッキのすべてのイデオロギーカードを捨て札にし、」</li>
            <li>修正後「配置時、手札とデッキのすべてのイデオロギーカードを除外し、」</li>
          </ul>
          <h3>Version 0.0.4 (2026/01/13)</h3>
          <ul>
            <li><font color="yellow">画面調整</font>：カードUIの財カードの耐久値表示が見づらかったので調整</li>
          </ul>
          <h3>Version 0.0.3 (2026/01/12)</h3>
          <ul>
            <li><font color="yellow">画面調整</font>：カードUIの規模と財カードの耐久値の表示を調整</li>
          </ul>
          <h3>Version 0.0.2 (2026/01/11)</h3>
          <ul>
            <li><font color="yellow">画面調整</font>：モバイルUIの縦幅を少し縮め、画面内からややはみ出ていた情報が収まるよう調整</li>
          </ul>
          <h3>Version 0.0.1 (2025/12/25)</h3>
          <ul>
            <li><font color="yellow">不具合修正</font>：マリガンで引いたカードの存在箇所が正しくなく、一部のカード効果において正しい挙動をしなかったため修正</li>
            <li><font color="yellow">仕様変更</font>：「資本主義」のターン終了時効果を次のように修正</li>
            <li>修正前「ターン終了時、場のマネーの耐久値と同じ回数ランダムな財の耐久値を+1し、」</li>
            <li>修正後「ターン終了時、場のマネーの耐久値をランダムに場の財に耐久値を割り振ってプラスし、」</li>
            <li>変更経緯：「マネー」の耐久値が非常に多い場合、耐久値分の回数の処理が働くことでアニメーション負荷が高くなり正常にゲームが進行しなくなる場合があるため</li>
            <li><font color="yellow">機能追加</font>：この更新履歴を追加</li>
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