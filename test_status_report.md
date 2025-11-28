# テストステータスレポート

## 概要
このレポートは、Historio Web版プロジェクト(js&Reactベース。上位ディレクトリのpy版とは独立している)における各カードのテスト状況をまとめたものです。
※historio-web\implementation_summary.txt の"8項"の二次検証となります。

## 注意事項
*   `implementation_summary.txt` に記載されているテスト状況と、この `test_status_report.md` のテスト状況に齟齬がある場合があります。これは、`implementation_summary.txt` 作成後に発生したファイル破損や文字化け等の問題により、一部の既存テストが失敗状態になったためです。この `test_status_report.md` が最新かつ正確なテスト状況を反映しています。
*   2025/11/09現在、テストファイルの検証は全通過済。本番環境(npm startの実行)での検証を進めているところ。
    *   そのため、本番環境で確認された不具合(バグ)の修正に関しては慎重に対応する必要がある。
        *   具体的には「まずは備考欄の詳細な記述からソースコードの該当箇所を探す」「該当箇所を発見したら現在の実装を確認する」「すぐには修正せず、現在の実装と修正案を挙げ、対応方針を人間に確認すること」を必要とする。
        *   card_definitions.jsonの修正が適切と判断される場合には、これを人間に依頼する。(カード定義ファイルは行数が多く処理負荷が高い、またPython版へも同様の修正を行っても問題なく動作するようにするため)
        *   コンソールログを仕込む際は、調査区分に合わせたプレフィックスを付けること。複数の区分に跨る調査対象である場合は、一つのログに複数のプレフィックスを付けてもよい。また、ログ分析を効率的に行うために、基本的には無条件で通過する処理にはログを仕込まないこと。

## テスト状況
| カード名 | テストファイル | テストステータス | 備考 |
|---|---|---|---|
| 戦士 | test_warrior_effect.js | 成功 | 本番でもOK |
| 山 | test_mountain_effect.js | 成功 | 本番でもOK |
| 砦 | test_fortress_effect.js | 成功 | 本番でもOK |
| 聖なる領域 | test_sacred_domain_effect.js | 成功 | 本番でもOK |
| 交易路 | test_trade_route_effect.js | 成功 | 本番でもOK |
| 果実 | test_fruit_effect.js | 成功 | 本番でもOK |
| 農民 | test_peasant_effect.js | 成功 | 本番でもOK |
| 開拓民 | test_settler_effect.js | 成功 | 本番でもOK |
| 大嵐 | test_tempest_effect.js | 成功 | 本番でもOK |
| 豊作 | test_bountiful_harvest_effect.js | 成功 | 本番でもOK |
| 予感 | test_premonition_effect.js | 成功 | 本番でもOK |
| 覚醒 | test_awakening_effect.js | 成功 | 本番でもOK |
| 内部崩壊 | test_internal_collapse_effect.js | 成功 | 本番でもOK |
| 秩序の瓦解 | test_collapse_of_order_effect.js | 成功 | 本番でもOK |
| 略奪 | test_looting_effect.js | 成功 | 本番でもOK |
| 物々交換 | test_barter_effect.js | 成功 | 本番でもOK |
| 接収 | test_seizure_effect.js | 成功 | 本番でもOK |
| 経済学の興り | test_rise_of_economics_effect.js | 成功 | 本番でもOK |
| 多文化主義 | test_multiculturalism_effect.js | 成功 | 本番でもOK |
| 帝国主義 | test_imperialism_effect.js | 成功 | 本番でもOK |
| 多神教 | test_polytheism_effect.js | 成功 | 本番でもOK |
| 原始共産制 | test_primitive_communism_effect.js | 成功(本番でバグ) | NPCがこれを配置中に止まる場合がある(財を出そうとして失敗している？) |
| 物質主義 | test_materialism_effect.js | 成功 | 本番でもOK |
| 一神教 | test_monotheism_effect.js | 成功 | 本番でもOK |
| 悟りの道 | test_path_to_enlightenment_effect.js | 成功 | 本番でもOK |
| 聖典 | test_sacred_scripture_effect.js | 成功 | 本番でもOK |
| 布教 | test_missionary_effect.js | 成功 | 本番でもOK |
| 受難 | test_suffering_effect.js | 成功 | 本番でもOK |
| 崇拝 | test_worship_effect.js | 成功 | 本番でもOK |
| 救世 | test_salvation_effect.js | 成功 | 本番でもOK |
| 終末 | test_apocalypse_effect.js | 成功 | 本番でもOK |
| 輪廻転生 | test_reincarnation_effect.js | 成功 | 本番でもOK |
| マネー | test_money_effect.js | 成功 | 本番でもOK |
| 重金主義 | test_bullionism_effect.js | 成功 | 本番でもOK |
| 重商主義 | test_mercantilism_effect.js | 成功 | 本番でもOK |
| 重農主義 | test_physiocracy_effect.js | 成功 | 本番でもOK |
| 資本主義 | test_capitalism_effect.js | 成功 | 本番でもOK |
| 開拓 | test_pioneering_effect.js | 成功 | 本番でもOK |
| 焦土 | test_scorched_earth_effect.js | 成功 | 本番でもOK |
| 占領 | test_occupation_effect.js | 成功 | 本番でもOK |
| 植民地 | test_colony_effect.js | 成功 | 本番でもOK |
| 商人 | test_merchant_effect.js | 成功 | 本番でもOK |
| 移民 | test_immigrant_effect.js | 成功 | 本番でもOK |
| ディアスポラ | test_diaspora_effect.js | 成功 | 本番でもOK |
| 内戦 | test_civil_war_effect.js | 成功 | 本番でもOK |
| 技術革新 | test_tech_innovation_effect.js | 成功 | 本番でもOK |
| 技術提供 | test_tech_transfer_effect.js | 成功 | 本番でもOK |
| 理想主義 | test_idealism_effect.js | 成功 | 本番でもOK |
| 職人 | test_artisan_effect.js | 成功 | 本番でもOK |
| 兵器 | test_weapon_effect.js | 成功 | 本番でもOK |
| 民族自決 | test_self_determination_effect.js | 成功 | 本番でもOK |
| 解体 | test_deconstruction_effect.js |成功 | 本番でもOK |
| 啓蒙時代 | test_enlightenment_era_effect.js | 成功 | 本番でもOK |
| 資源 | test_resource_effect.js | 成功 | 本番でもOK |
| 資源の発見 | test_discovery_of_resources_effect.js | 成功 | 本番でもOK |
| 徴兵 | test_conscription_effect.js | 成功 | 本番でもOK |
| 現実主義 | test_realism_effect.js | 成功 | 本番でもOK |
| 共同体主義 | test_communitarianism_effect.js | 成功 | 本番でもOK |
| コスモポリタニズム | test_cosmopolitanism_effect.js | 成功 | 本番でもOK |
| 思想の弾圧 | test_suppression_of_thought_effect.js | 成功 | 本番でもOK |
| 汎民族主義 | test_pan_nationalism_effect.js | 成功 | 本番でもOK |
| 分離主義 | test_separatism_effect.js | 成功 | 本番でもOK |
| 不干渉主義 | test_non_interventionism_effect.js | 成功 | 本番でもOK |
| 隘路 | test_chokepoint_effect.js | 成功 | 本番でもOK |
| 工作員 | test_agent_effect.js | 成功 | 本番でもOK |
| 工作活動 | test_espionage_effect.js | 成功 | 本番でもOK |
| 大地震 | test_earthquake_effect.js | 成功 | 本番でもOK |
| 災害多発地域 | test_disaster_prone_area_effect.js | 成功 | 本番でもOK |
| 官僚主義 | test_bureaucracy_effect.js | 成功 | 本番でもOK |
| 保守主義 | test_conservatism_effect.js | 成功 | 本番でもOK |
| 環境主義 | test_environmentalism_effect.js | 成功 | 本番でもOK |
| リージョナリズム | test_regionalism_effect.js | 成功 | 本番でもOK |
| 社会主義 | test_socialism_effect.js | 成功 | 本番でもOK |
| アナーキズム | test_anarchism_effect.js | 成功 | 本番でもOK |
| 結束主義 | test_solidarism_effect.js | 成功 | 本番でもOK |
| 記憶の浄化 | test_memory_purification_effect.js | 成功 | 本番でもOK |
| 軍国主義 | test_militarism_effect.js | 成功 | 本番でもOK |
| 孤立主義 | test_isolationism_effect.js | 成功 | 本番でもOK |
| グローバリズム | test_globalism_effect.js | 成功 | 本番でもOK |
| リバタリアニズム | test_libertarianism_effect.js | 成功 | 本番でもOK |
| 共産主義 | test_communism_effect.js | 成功 | 本番でもOK |
| 覇権主義 | test_hegemonism_effect.js | 成功 | 本番でもOK |
| 多極主義 | test_multipolarism_effect.js | 成功 | 本番でもOK |
| ニューリベラリズム | test_new_liberalism_effect.js | 成功 | 本番でもOK |
| ネオリベラリズム | test_neoliberalism_effect.js | 成功 | 本番でもOK |
| 自由主義 | test_liberalism_effect.js | 成功 | 本番でもOK |
| ウルトラナショナリズム | test_ultranationalism_effect.js | 成功 | 本番でもOK |
| ポピュリズム | test_populism_effect.js | 成功 | 本番でもOK |
| 確証破壊能力 | test_mutual_assured_destruction_effect.js | 成功 | 本番でもOK |
| 相互確証破壊 | test_mutual_assured_destruction_effect.js | 成功 | 本番でもOK |
| 愛国教育 | test_education_and_culture_effects.js | 成功 | 本番でもOK |
| 嫌国教育 | test_education_and_culture_effects.js | 成功 | 本番でもOK |
| 文化的影響 | test_education_and_culture_effects.js | 成功 | 本番でもOK |
| 文化侵略 | test_education_and_culture_effects.js | 成功 | 本番でもOK |
| 教育機関 | test_educational_institution_effect.js | 成功 | 本番でもOK |
| test_helpers.js | (ヘルパーファイル) | 対象外 | |


## 備考
- その他気になること
    - ターン開始時や終了時のカードの処理順を調査。可能であれば制御したい(「場の財の配置が古い順→場のイデオロギー→手札→デッキ→捨て札」これをターン中のプレイヤー→相手の順)
    - デバッグコマンドを効く/効かないよう制御できるようにしたい →　immerが入ってからは効かないはず
- 特殊テストの成否
    - test_turn_end_flash.js | 対象外 | 手動テスト用スクリプトのため |
    - test_presentation_controller.js | 対象外 | DOM/ブラウザAPI依存のため |
    - test_looting_durability_change_debug.js | 対象外 | デバッグ用スクリプトのため |
    - test_craftsman_turn_end_fix.js | 対象外 | デバッグ用スクリプトのため |
    - test_npc_card_selection_fix.js | 対象外 | 特殊テストのため |

## バグ分析と修正方針

現在、本番環境（`npm start`）で多数のカード効果にバグが確認されています。以下に、テスト状況のテーブルを基にバグを分類し、修正方針を提案します。

 **公開効果をログに乘るようにしたい**


### 横断的な課題

特定のカードに限定されない、システム全体に関わる課題です。

2.  **カード効果の処理順序の制御**
    *   **現象**: ターン開始・終了時に複数のカード効果が発動する場合の順序が不定。
    *   **方針**: 備考欄の希望仕様（場の古い順→イデオロギー→手札…）を参考に、処理対象のカードを一度リストに集め、ルールに基づいてソートしてから順に効果を処理する仕組みを導入します。

3.  **デバッグ機能の制御**
    *   **現象**: デバッグ用のコマンドやログが常に有効になっている。
    *   **方針**: 環境変数や設定ファイル、あるいはゲーム内コンソールなどを用いて、デバッグ機能のON/OFFを切り替えられる仕組みを導入します。


確認された未分析のエラー
*   **確認状況**: 「資本主義」の「マネー」の耐久値と同じ回数だけ他の財の耐久値を+1する効果が重すぎたのか当該エラーが発生。
*    **方針**: 「資本主義」の効果をランダムに割り振った計算後に加算するように変更することで軽減を図るかなどが考えられるが、以後強化回数に依存する効果を加える可能性を考えると仕様を変更したくない！

Uncaught runtime errors:
×
ERROR
Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
    at getRootForUpdatedFiber (http://localhost:3000/static/js/bundle.js:9886:167)
    at enqueueConcurrentHookUpdate (http://localhost:3000/static/js/bundle.js:9872:12)
    at dispatchSetStateInternal (http://localhost:3000/static/js/bundle.js:11843:16)
    at dispatchSetState (http://localhost:3000/static/js/bundle.js:11816:5)
    at processAnimation (http://localhost:3000/static/js/bundle.js:29021:9)

