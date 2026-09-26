# EmoShelf 公開前レビュー — 2026-09-26

**実装・目視・実操作を行い、未署名のx64配布候補を作成した。正式公開・広告開始の判定は未完了。**
コード署名なし・手動更新という今回の方針を反映した。SignPathの承認を公開条件から外し、署名提供を受けているとの記載も削除した。

## 変更したこと

| 対象 | 改善 |
| --- | --- |
| LP | 日英のダウンロード案内、Windows要件、初回操作、インストール手順、サポート・プライバシーへの導線 |
| 表示・共有 | 日英それぞれのURL、canonical/hreflang、静的OG/Twitter情報、1200×630共有画像、ファビコン、スマホの文字・タップ領域・コントラスト |
| 本体 | レンダリング失敗時の復旧画面、カタログ読込の再試行、ブラウザーで開いた場合の案内 |
| 操作・アクセシビリティ | ライト／ダークの弱い文字色、検索ラベル、モーダル属性、言語変更後の棚の読み上げラベルを修正。独自につけた名前は維持 |
| 設定 | Escで設定を閉じると本体まで隠れる不具合を実操作で再現・修正。手動更新から公式配布ページを開くボタンを追加 |
| テスト | ビルド失敗時に古い実行ファイルでE2Eが続く問題を修正。配布版に存在しないテスト用プラグイン／IPCを必要としない検査経路を追加 |
| 配布 | 同一コミットの成功したCI成果物を再利用し、x64/ARM64・NSIS/MSIを検証してチェックサム付き未公開ドラフトを作るworkflowを追加 |

追加依存・ロックファイル変更なし。自動更新・追加Renderer Packの暗号署名検証は維持している。
検証ログ内のHTMLを監視して開発サーバーが停止する問題も確認し、アプリの監視・依存探索から検証ログと別LPを除外した。
公開済みのRC 1は今回の改良より古いため、LPは両者の違いを明示し、開発プレビューのnoindexを維持した。

## 実施した検証

| 検証 | 結果 |
| --- | --- |
| 型検査・フロントエンド | 92件成功（LPの導線テストを含む） |
| 補助ツール | 9件成功。ビルド失敗時の停止、未署名配布・チェックサム・更新署名の条件を確認 |
| インストールした検証版のE2E | **12件成功**。通常のWebDriverを使用し、テスト用プラグインを含まない実行ファイルで検証 |
| 本体の実画面 | 最小480×320、日英、ライト／ダーク、Native配置、保存と再読込、最小化・非表示からの復帰、二重起動による再表示、設定Escを確認 |
| アクセシビリティ | 描画済みの棚・設定とLPをaxeで検査。対象WCAG A/AA違反0件。Narratorの全面的な受け入れとは別 |
| LPの目視・操作 | PC幅1280／スマホ幅390、320幅の横はみ出し、日英URL切替・再読込、棚・絵文字・リセット・FAQ・キーボード操作、配布案内を確認 |
| LPの本番ビルド | `/EmoShelf/` と `/EmoShelf/en/` の実表示、アセット・共有メタ情報・画像サイズの監査に成功 |
| JavaScript本番依存 | npm公式レジストリで監査。24依存について既知の脆弱性0件。Rust依存全体の監査を意味しない |
| 配布候補 | 最終ソースからx64 NSIS EXEとMSIのビルド成功。両方NotSigned、SHA-256を記録 |
| インストール／アンインストール | 別名・別識別子のx64 NSIS検証版で成功。インストールした実行ファイルのE2E後、公式アンインストーラーで削除を確認 |
| 公開監査 | 追跡済みファイルに加え、未追跡・非ignoreの新規ソースも監査するよう改善。workflow YAMLとPowerShell構文も検査 |
| 公開判定 | `release:readiness` は未完了の証跡に対して失敗することを確認。公開承認にはしていない |

実ウィンドウ操作はWindowsのComputer Use、LPはアプリ内ブラウザーで実施。スマートフォンはブラウザー幅の確認であり、スマホ実機の確認ではない。
Rustソースは変更しておらず、過去のRust 71件を今回の実行結果に数えていない。

### メモ帳への外部挿入

専用の `launch-paste.txt` を使い、最終検証版でAlt+E→クリック／Enter／Ctrl+Enterの挿入を目視した。
最終版では合計9回の挿入を確認した。最初の検査では5回、追加の再現確認では4回成功した。Ctrl+Enterでは棚を残し、入力先への挿入も確認した。

**未解決の観測が1件ある。** ログを有効にする前のEnter操作1回で、棚は閉じたがメモ帳の文字数が増えなかった。
その後、同じ最終バイナリで再起動して診断を有効にし、Enter、Ctrl+Enter、クリック、クリック後の再表示→Enterを試したところ、すべて実際に入力された。
最初の事象の原因は確定できておらず、修正済みとは扱わない。操作ツールの影響か本体の問題かを、継続ログと30回ずつの受け入れ試験で切り分ける必要がある。
ネイティブの `input-sent` ログだけで外部入力成功とは判定していない。

追加の再現確認では専用文書 `insertion-recheck.txt` を開き、🔥と🚀それぞれで「クリック→Alt+E→Enter」を実行した。
4回とも目視で追加を確認し、保存したファイルにも `🔥🔥🚀🚀` が残った。診断ログも4回の `input-sent` と一致した。
この追加検査でも事象は再現しなかったが、当初の未確認1回を解消した証拠にはしていない。
操作ツールが入力を拒否した2回（利用者入力の検知、クリック位置情報の不足）は再観測後に再開し、アプリへの入力試行に数えていない。

## ローカル成果物と証跡

ソースは `f346bb044be5c66e0573c11dde73481ad0713017` を基点とする未コミットの作業ツリー。
実機環境はWindows 11 x64（OS build `10.0.26200.0`）、WebView2 `153.0.4234.48`。レビュー時の155ソースファイルのハッシュを `source-manifest.json` に保存した。
以下は**未公開のローカル候補**で、公開リリースではない。ユーザーの既存インストール先へ本体を置き換えていない。

配布候補は `app/logs/launch-20260926/release/` に保存：

| ファイル | SHA-256 |
| --- | --- |
| `EmoShelf_1.0.0_windows-x86_64_UNSIGNED-setup.exe` | `8ac479312f6ab655c70c47a53f790a6ec3bc8837d8e6bbd2d96778248dcdfc1c` |
| `EmoShelf_1.0.0_windows-x86_64_UNSIGNED.msi` | `aa16e110a5c27965b9beb3efbdb10e45e98a2d81c9b43e25c2d54a55420ae7e1` |

同フォルダーに `SHA256SUMS.txt`。実機検証用は `com.emoshelf.acceptance` / `EmoShelf Acceptance` の別ビルド：

- 検証インストーラー：`246799b8ed0f643e7a475c4144ae77e2325b5033f0c849634809760d3c9a5f70`
- インストールされた本体・同一内容の検証コピー：`69c66cde6b62781ee49ffa6f94f6b7db685e5256ecc10895c3427d4266ed2966`
- 本体はテスト用 `wdio` 機能なし、Authenticodeは `NotSigned`。
- 実際の製品識別子 `com.emoshelf.app` のEXE/MSIは作成・ハッシュ確認まで。既存版からの更新・MSIインストール受け入れとは区別する。

ログ・画像はGit除外のローカル証跡として保存：

- `app/logs/launch-check-final-20260926.log`
- `app/logs/launch-installed-e2e-final-20260926.log`
- `app/logs/launch-lp-build-unsigned-20260926.log`
- `app/logs/launch-production-build-20260926.log`
- `app/logs/launch-dependency-audit-20260926.json`
- `app/logs/launch-20260926/artifact-evidence.json`
- `app/logs/launch-20260926/source-manifest.json`
- `app/logs/launch-20260926/readiness-pending.json`
- `app/logs/launch-readiness-20260926.log`
- `app/logs/launch-20260926/native-paste.stderr.log`
- `app/logs/launch-20260926/native-recheck.stderr.log`
- `app/logs/launch-20260926/insertion-recheck.json`
- `app/logs/launch-20260926/insertion-recheck.txt`
- `app/logs/launch-20260926/app-escape-fixed.png`
- `app/logs/launch-20260926/notepad-insertion-final.png`
- `app/logs/launch-20260926/notepad-insertion-recheck.png`
- `app/logs/launch-20260926/lp-desktop-ja-final.png`
- `app/logs/launch-20260926/lp-mobile-en-final.png`
- `app/logs/launch-20260926/lp-download-en-final.png`

## 広告投入前に残ること

1. 上記のEnter挿入未確認1回を切り分け、対象アプリ別30クリック＋30Enterの条件を満たす。
2. Edge/Chrome/Claude未送信欄、Photoshop/Paint画像、Explorerドラッグ、RC更新・復旧の全マトリクスを最終候補で完了する。
3. ARM64、製品インストーラー全種、Narrator・IME・各DPI・複数モニター、30標本以上の性能計測、同一候補の5営業日利用を完了する。
4. ソースをレビューして固定し、同じコミットのCIと新しい未署名workflowを実行する。ローカル構文検査はGitHub Actions上での成功を代替しない。
5. 最終配布物を公開した後、その実物にLPのURL・説明・画像を合わせ、noindexを解除して配信する。

Biomeには主にCSS詳細度・importantの警告29件が残る（エラー0）。WiXの詳細出力には既定テンプレート由来のICE警告があり、MSIのインストール検証は未完了。
追加スタイルの公開配布・導入フローも今回導入していない。現在使えるTwemojiとNativeの説明に合わせている。

コミット・push・リリース公開・LPデプロイ・広告出稿は実行していない。
配布手順は [release.md](release.md)、品質ゲートは [release-qualification.md](release-qualification.md) を参照。
