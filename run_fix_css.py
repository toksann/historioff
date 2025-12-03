import re

# Read the content of App.css
with open("src/App.css", "r", encoding="utf-8") as f:
    content = f.read()

# --- Fix garbled characters ---
# This is a heuristic and might need manual fine-tuning if new garbled patterns appear.
# It attempts to replace common garbled sequences with their correct Japanese counterparts.
replacements = {
    'E': 'の', # Common single character garble
    '征E': '待ち',
    '対忁E': '対応',
    'レイアウチE': 'レイアウト',
    'ヒンチE': 'ヒント',
    'スクロールバE': 'スクロールバー',
    '選択征E状態でもカードE詳細表示は可能であることを示ぁE': '選択待ち状態でもカードの詳細表示は可能であることを示す',
    'カードタイプ別の色刁E': 'カードタイプ別の色分け',
    'カードE部レイアウチE': 'カード内部レイアウト',
    'プレイヤースチEEタスのスタイル': 'プレイヤーステータスのスタイル',
    '数字が長ぁE合E対忁E': '数字が長い場合の対応',
    'プレイヤー詳細オーバEレイ': 'プレイヤー詳細オーバーレイ',
    '重要な値のハイライチE': '重要な値のハイライト',
    'カード詳細オーバEレイ': 'カード詳細オーバーレイ',
    'ゲームログオーバEレイ': 'ゲームログオーバーレイ',
    '現在のターンプレイヤーの視覚的識別': '現在のターンプレイヤーの視覚的識別',
    'クリチE可能要素の改喁E': 'クリック可能要素の改善',
    'selectableクラスを完Eに削除 - オーバEレイ選択に変更したため不要E': 'selectableクラスを完全に削除 - オーバーレイ選択に変更したため不要',
    'ボタンの改喁E': 'ボタンの改善',
    'タブレチE用調整': 'タブレット用調整',
    'スマE・小タブレチE用': 'スマホ・小タブレット用',
    'モバイル用ゲーム惁Eエリア調整': 'モバイル用ゲーム情報エリア調整',
    'モバイル用フィールドレイアウト調整 - 横並び維持E': 'モバイル用フィールドレイアウト調整 - 横並び維持',
    '小画面用ゲーム惁Eエリア': '小画面用ゲーム情報エリア',
    '小画面用プレイヤー統訁E': '小画面用プレイヤー統計',
    '小画面用フィールドE手札調整': '小画面用フィールド・手札調整',
    '小画面用カード調整': '小画面用カード調整',
    'ターン終亁EEタンの改喁E': 'ターン終了ボタンの改善',
    '征E状態E視覚的フィードバチE': '待機状態の視覚的フィードバック',
    '選択EロンプトオーバEレイ': '選択プロンプトオーバーレイ',
    '既存EボタンスタイルE他E選択肢用EE': '既存のボタンスタイル（他の選択肢用）',
    'カード選択用のスタイル': 'カード選択用のスタイル',
    '先攻後攻表示': '先攻後攻表示',
    '統合されたカードアクションセクション': '統合されたカードアクションセクション',
    'ゲーム進行演EのCSS keyframes': 'ゲーム進行演出のCSS keyframes',
    'ターン開始演E - 右から左へのスライチE': 'ターン開始演出 - 右から左へのスライド',
    'ターン終亁EE - 中央フェードイン→左スライドアウチE': 'ターン終了演出 - 中央フェードイン→左スライドアウト',
    '勝利演E - 上から中央→上へのスライチE': '勝利演出 - 上から中央→上へのスライド',
    '敗北演E - 上から中央→下へのスライチE': '敗北演出 - 上から中央→下へのスライド',
    '先攻/後攻決定演E - 段階的フェードイン': '先攻/後攻決定演出 - 段階的フェードイン',
    'ゲーム進行演E用のクラス': 'ゲーム進行演出用のクラス',
    'ゲーム進行演E用のオーバEレイ': 'ゲーム進行演出用のオーバーレイ',
    '強化されたゲームログのスタイル': '強化されたゲームログのスタイル',
    'ログヘッダーの制御ボタン': 'ログヘッダーの制御ボタン',
    'フィルターバE': 'フィルターバー',
    'ログエントリーの拡張スタイル': 'ログエントリーの拡張スタイル',
    'フッターの拡張': 'フッターの拡張',
    'レスポンシブ対忁E': 'レスポンシブ対応',
    'アニメーションロチE中のオーバEレイ': 'アニメーションロック中のオーバーレイ',
    '上限到達警告演E': '上限到達警告演出',
    '効果無効化演E': '効果無効化演出',
    '無効化パーチEクル': '無効化パーティクル',
    'ログエントリーのクリチE可能スタイル': 'ログエントリーのクリック可能スタイル',
    'クリチE可能なログエントリー全体Eスタイル': 'クリック可能なログエントリー全体のスタイル',
    'ログエントリーの基本スタイルを確俁E': 'ログエントリーの基本スタイルを確認',
    'ターン終亁Eのプレイログ点滁Eニメーション': 'ターン終了時のプレイログ点滅アニメーション',
    'ターン終亁E- 黁E点滁E': 'ターン終了 - ログ点滅',
    'ホバー時E効果を少し調整': 'ホバー時の効果を少し調整',
    'ゲーム演EシスチE用CSS': 'ゲーム演出システム用CSS',
    '継続演E: 規模不足カーチE': '継続演出: 規模不足カード',
    '継続演Eが解除された時の復帰アニメーション': '継続演出が解除された時の復帰アニメーション',
    'チEト用演E': 'テスト用演出',
    'カードEレイ演EE基本版！E': 'カードプレイ演出（基本版）',
    'カードダメージ演EE基本版！E': 'カードダメージ演出（基本版）',
    'リソース変化演EE基本版！E': 'リソース変化演出（基本版）',
    '演E中の要素が他E要素に影響しなぁEぁEする': '演出中の要素が他の要素に影響しないようにする',
    '演EシスチEが無効化されてぁE場合Eフォールバック': '演出システムが無効化されている場合のフォールバック',
    'アニメーション用クラス': 'アニメーション用クラス',
    'カード演Eの基本クラス': 'カード演出の基本クラス',
    'カード演E用CSSクラス': 'カード演出用CSSクラス',
    'カード破壊E除去演E': 'カード破壊・除去演出',
    'パEチEクル演E': 'パーティクル演出',
    'JavaScriptで制御するためCSSアニメーションは無効匁E': 'JavaScriptで制御するためCSSアニメーションは無効',
    'カード回復演E - 強化版': 'カード回復演出 - 強化版',
    'カードダメージ演E - 趁E化版': 'カードダメージ演出 - 強化版',
    'リソース変化演E': 'リソース変化演出',
    '変化量表示': '変化量表示'
}

for old_str, new_str in replacements.items():
    content = content.replace(old_str, new_str)

# --- Fix colors ---
# Replace all instances of #adff2f and #61dafb with #8bc34a
content = re.sub(r'#(adff2f|61dafb)', '#8bc34a', content, flags=re.IGNORECASE)

# --- Apply specific DeckSelectionScreen UI fixes ---
# Regex to find the .deck-selection-screen .deck-card block and insert/modify properties
deck_card_pattern = r"(\.deck-selection-screen \.deck-card\s*\{[^}]*)"
deck_card_replacement = r"""\1
  display: flex; /* Added */
  flex-direction: column; /* Added */
  justify-content: space-between; /* Adjusted to push actions to bottom */
  position: relative; /* badgeのために必要 */
  overflow: hidden;
  background-color: #2a2a2a; /* 暗めのグレーに統一 */"""
content = re.sub(deck_card_pattern, deck_card_replacement, content, flags=re.DOTALL)

# Regex to find the .deck-selection-screen .deck-card h3 block and modify properties
deck_card_h3_pattern = r"(\.deck-selection-screen \.deck-card h3\s*\{[^}]*)"
deck_card_h3_replacement = r"""\1
  margin: 0 60px 10px 0; /* バッジとの重なり防止のため右マージンを追加 */
  color: #8bc34a; /* 黄緑 */
  font-size: 16px;
  white-space: normal; /* Added */
  word-break: break-word; /* Added */
  flex-grow: 1; /* Added */"""
content = re.sub(deck_card_h3_pattern, deck_card_h3_replacement, content, flags=re.DOTALL)

# Fix the .invalid-tag color
content = re.sub(r'(\.invalid-tag\s*\{[^}]*color:\s*)#e74c3c(\s*;[^}]*\})', r'\1#8bc34a\2', content)


# --- Apply specific CardLibraryScreen UI fixes ---
# Regex to find the .card-library-screen .library-card block and insert/modify properties
library_card_pattern = r"(\.card-library-screen \.library-card\s*\{[^}]*)"
library_card_replacement = r"""\1
  background-color: #2a2a2a; /* 暗めのグレーに統一 */
  border: 1px solid #444;
  color: white; /* テキスト色を白に */"""
content = re.sub(library_card_pattern, library_card_replacement, content, flags=re.DOTALL)


# Write the modified content back to App.css
with open("src/App.css", "w", encoding="utf-8") as f:
    f.write(content)
print("src/App.css has been updated.")
