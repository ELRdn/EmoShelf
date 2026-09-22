# EmoShelf 引き継ぎ書

> **2026-09-22 現段階の実装と配布方針を更新**：この下の旧完了記録を正式公開の承認に使わないこと。
> 呼び出しの前面化、ウィンドウ操作権限、選択フォーカス、Pinnedの重なり順を修正。メモ帳6回の確認はAll追加前のAlt+E修正版の証跡。
> 左端のAllに加え、Native絵文字の中央配置と追加スタイルの未導入表示、英語UIの横はみ出しを修正。最新のフロント84・E2E11件、および直前のネイティブ変更で実施したRust71件の検証範囲と、未確認の公開条件は
> [`app/docs/release-qualification.md`](app/docs/release-qualification.md)を参照。
> 署名、全互換性マトリクス、5営業日の実利用は未完了。

> 最終更新: 2026-09-22（基礎構築: DSH / Scarlet 🦊、Release Candidateと品質改善: Cyan/Codex）
> このファイルは他エージェントへの引き継ぎ用。作業開始前にここから読むこと。

## 現在の正本（2026-09-22）

- Alt+Eは常に前面へ表示する。非表示・背面・最小化から共通処理で復帰し、
  前面化を確認してから選択フォーカスを戻す。閉じる操作はEscape／閉じるボタン。
- `activation.rs`が表示・復元・topmost解除、`desktop.rs`が入力先・フォーカス・
  clipboard競合の検査とWindows `SendInput`を担当。Pinnedでも入力先を覆わない。
- 左端のAllは保存されるBoardではなく、全1949件を開く入口。再クリックで検索・
  カテゴリをリセットし、元のBoardとCtrl+1〜9の割り当てを保つ。
- Native文字の中央配置を4サイズで検証。未導入・無効な絵文字スタイルを明記した。
- 保存は直列化し、Quit／更新前に完了を待つ。入力結果は`input-sent`／`copied`／`failed`。
- インストール済みローカルEXEは未署名x64、WebDriverなし。SHA-256は
  `9cacd0a66be16d1d2e978ed42cc4b00c68c9b381838541c7489d631b49039921`。
  これはコミット前の作業ツリーから作成した検証物で、正式な配布候補の固定とは別。
- README・LP画像は日英それぞれ1762×1322の実画面PNG。英語Allの横はみ出しを修正し、
  撮影専用の別プロファイルで確認した。このCSS修正はインストール済みEXEには未反映。
- フロント84、補助ツール7、デスクトップE2E11、直前のネイティブ変更でRust71が通過。
  実機のメモ帳6回は**以前のAlt+E修正版**の証跡。最新EXE全体の外部入力合格と扱わない。
  Ctrl+1の実機操作はヘルパーで確認できず、手動検証が残る。
- ローカルEXE・バックアップ・ログは`app/logs/`で保持し、Gitへ追加しない。
  公開用のコード・テスト・記録はコミットするが、公開済みRC 1の内容は変わらない。

### 次の実装：追加の絵文字スタイル

ユーザー合意済みの方針は**Twemoji同梱＋OS標準、Fluent・Noto・OpenMojiはGitHub Releases配布**。
設定内で見本を選び、ダウンロードから導入まで完結し、導入後はオフラインで使える形にする。
現在あるのは署名検証とローカルファイル読込で、パックの製品配布・製品用の鍵設定・
アプリ内ダウンロードは未完了。詳細と受け入れ条件は[`app/docs/renderer-packs.md`](app/docs/renderer-packs.md)。
このコミット作業では方針を記録し、ダウンロード機能や公開リリースを実装・実行しない。

## 0. 読み順（5分コース）

1. `README.md` — 製品概要（Personal Emoji Shelf とは何か）
2. `ROADMAP.md` — 全体計画と進捗（チェック済み＝実装済み）
3. `DESIGN.md` — 画面仕様（Concept 2.5、Purple × Yellow）
4. このファイル — 現状・注意点・次の作業
5. `app/README.md` — 開発コマンド詳細
6. `app/docs/persistence.md` — 永続化フォーマット

## 1. プロジェクト概要

- **EmoShelf**: 自分が使う絵文字を棚（Board）に置いておく Windows 常駐ユーティリティ
- コア動線: `Alt + E → Shelf → Click → Paste → Close`
- 技術: **Tauri 2 + React 19 + TypeScript + Rust**、パッケージ管理は **pnpm**
- ライセンス: **Apache-2.0**（`LICENSE` 設置済み、package.json / Cargo.toml にも記載）
- リポジトリ構成: ドキュメント類はルート直下、アプリ本体は **`app/` サブディレクトリ**
  （ルートの製品 README を Tauri テンプレに上書きさせないための意図的配置。変更しないこと）

## 2. 基礎構築〜旧RCの実装記録（2026-09-05）

以下の版・件数・計測値は当時の記録。現在の挙動・件数・公開判断は冒頭と検証記録を優先する。

### 完了済み

- **Phase 0（基盤）全10項目**: Tauri 雛形、状態モデル、永続化形式、Biome、ビルドコマンド、
  Windows パッケージ設定（NSIS/MSI）、CI、仮アイコン、ライセンス決定
- **v0.1 Shelf UI**:
  - Concept 2.5を基準にした完全カスタムフレーム、Boardタブ、Shelf、検索、詳細ペイン、フッター
  - オンボーディング、Board作成・名称/アイコン変更・並べ替え・削除Undo、明示的なShelf編集モード
  - 1949件のカタログ仮想化、カテゴリ、日本語/英語検索、OS言語初期値と設定上書き
  - Twemoji/Native切替とフォールバック、Dark/Light/System、Reduced Motion、Quick/Pinned
  - Windows 11 Snap Layout用`HTMAXBUTTON`ヒットテスト、対象アプリへのフォーカス復帰
- **v0.2 Compose & Personalization**:
  - Compose Tray、複数絵文字のUndo/Clear/Copy/Paste、最大32要素
  - sequence項目の保存・再利用・編集、最大64 Unicode code points
  - 矢印移動、Enter、Ctrl+Enter、Ctrl+F、Ctrl+K、Ctrl+1..9、段階的Esc
  - `.emoshelf` ZIPのExport/Importプレビュー、ID再割当Merge、バックアップ付きReplace
  - ZIP件数/容量/UTF-8/パス/シンボリックリンク/future schema検証
  - Twemoji/Native selectorと全rendererの帰属表示。外部3種はPack導入まで選択不可
- **v0.3 Context-aware Shelf**:
  - 前面アプリは実行ファイル名とmonitor IDだけをRustで取得し、パス・タイトルは保持しない
  - 初期OFFのアプリ別Board mapping、最後／既定Boardへのfallback、ローカル完結のopt-out
  - 利用回数、Frequent、初期OFFのShelf Glow、利用追跡停止、統計リセット
  - Autostart、Tray左クリック／メニュー、閉じる→Tray、二重起動前面化
  - 操作中アプリのmonitorへ物理座標で表示、最後の位置を維持する選択肢
- **v0.4 Custom Emoji & Packs**:
  - PNG／WebP／静的SVGをバイト判定し、最大寸法・容量・件数を制限してPNGへ正規化
  - 正規化PNGのSHA-256をID／ファイル名に使うローカル画像ライブラリ。元パスは保存しない
  - 画像Board、画像clipboard、Windows OLE外部ドラッグ、失敗時の画像コピーフォールバック
  - Board参照中アセットの削除防止、Recentのみの参照を安全に掃除する削除、`.emoshelf` asset統合
  - Ed25519署名・hash・互換性・ZIP構造・静的SVGを検証するRenderer Pack管理と帰属UI
  - 本番信頼鍵が無いビルドはPackを一切受理しないfail-closed設計
- **v0.5 Polish & Accessibility**:
  - modal focus trap／復帰、skip link、セマンティック要素、axe、forced-colors、
    prefers-contrast、Reduced Motionを含むアクセシビリティ基盤
  - `state.json`と`.bak`が両方壊れた場合の読み取り専用停止、復旧通知、明示的な設定バックアップ
  - 署名鍵が無い開発ビルドでは無効になるTauri Updater。確認とダウンロード／再起動同意を分離
  - 絵文字データを静的JSONへ分離し、全JavaScript chunkを500KiB以下にするbuild gate
  - 起動→操作可能、検索p95、ホットキー表示要求p95、JavaScript heapのローカル診断
  - Windows表示は`ShowWindowAsync`へ切り替え、WebView2 UI thread待ちをショートカット経路から除外
- **v1.0 Release Candidate**:
  - サングラス顔＋紫の棚を正式アイコンへ再構成し、Tauri／Windowsアイコン一式とfaviconを生成
  - README、Privacy、Attributions、Contributing、Security／署名方針、Issue導線、Release Notesを整備
  - 実Tauri/WebView2 E2Eをx64／ARM64 CIへ追加し、ローカルでは3シナリオ通過と製品スクリーンショットを確認
  - Fluent 1,285件、Noto 1,687件、OpenMoji 1,949件を公式固定commitから安全にPack化し、
    Ed25519署名の自己検証まで実データで確認
  - SignPathによるEXE→NSIS/MSIの段階署名、Tauri updater署名、`latest.json`、checksums、
    x64／ARM64サイレント導入試験をfail-closedの手動Release workflowへ実装
- **v0.1 データ層**:
  - Rust: `load_state` / `save_state`（アトミック保存・`.bak` 復旧）/
    `set_global_shortcut` / `paste_payload`（クリップボード→非表示→Ctrl+V）
  - プラグイン: `global-shortcut`・`clipboard-manager`・`single-instance`・`window-state`、キー送出に `enigo`
  - フロント: zustandストア（CRUD・並べ替え・使用記録・デバウンス保存）、
    emojibase全1949件＋日英検索、ペーストAPI＋コピーフォールバック
  - schema v2: 判別可能ShelfItem、型付きRecent、v1移行、未知フィールド保持、未来schema上書き防止
- **Rust 基盤検証**: lockfile 固定のコンパイル、Clippy（警告をエラー扱い）、
  永続化・ショートカット・`.emoshelf`・カスタム画像・Renderer Pack等の単体テスト64件
- **Windows 実機検証**: release ビルドの起動、`Alt+E` による表示／非表示、
  二重起動時の既存ウィンドウ前面化を確認。NSIS `.exe` と MSI `.msi` も生成済み
- **フロント検証**: TypeScript、Biome、Vitest/React Testing Library/axe（48件）、production build
- **v0.4実機確認**: PNG取込・表示・Board追加・削除、128×128画像clipboard、画像Paste、
  `Alt+E`、単一起動を確認。ExplorerへのOLE実ドロップはComputer Useのウィンドウ境界制約で未受入
- **v0.5実機計測**: 起動→操作可能77.5ms、JS heap 6.4MiB、非同期ホットキー表示要求0.1ms。
  再起動後のホットキーsampleは1件のため、10件以上のp95証跡はv1.0手動ゲートへ継続
- `ROADMAP.md` のPhase 0〜v1.0チェックボックスは受け入れ結果へ同期済み

### 現在の残作業

- 追加の絵文字スタイルの作成・署名・配布と、アプリ内導入フロー
- 外部アプリごとのクリック30回／Enter30回、画像貼り付け・ExplorerへのOLE実ドロップ
- Narrator、キーボード／IME、100/125/150/200%、複数モニター、性能の実機受け入れ
- 同一の配布候補で5営業日の実利用、x64／ARM64の署名済みinstaller/update/uninstallと復旧確認
- SignPathの承認状況と鍵設定を実施時に確認し、workflowで**未公開ドラフト**を作成。
  検証完了と公開承認を経て同じ配布物を公開する。コードのpushは正式公開の承認ではない。

## 3. 主要ファイル

```text
./
├── README.md / DESIGN.md / ROADMAP.md  # 製品・設計・計画（正本）
├── LICENSE                             # Apache-2.0
├── HANDOFF.md                          # このファイル
├── images/                             # 参照画、正式ブランドmaster、実アプリスクリーンショット
├── .github/workflows/                  # CIと署名済みRelease workflow
├── .signpath/                          # SignPathポリシー（秘密情報なし）
└── app/                                # アプリ本体
    ├── package.json                    # scripts: dev/build/check/lint/format/typecheck/tauri
    ├── biome.json                      # 整形・lint（Biome 2.x、推奨プリセット）
    ├── .npmrc                          # esbuild の postinstall スキップ（§5 参照）
    ├── README.md                       # 開発者向け説明
    ├── docs/persistence.md             # state.json / .emoshelf仕様（正本）
    ├── docs/updater.md                 # 明示同意・署名鍵・公開条件
    ├── docs/renderer-packs.md          # 署名付きRenderer Pack仕様
    ├── src/
    │   ├── App.tsx / App.css            # Concept 2.5 Shelf UI
    │   ├── components/                  # 仮想化、D&D、Twemoji、Compose、Import/Export
    │   ├── test/                        # Vitest共通設定
    │   └── lib/
    │       ├── state.ts                # 型の正本（STATE_SCHEMA_VERSION = 2）
    │       ├── store.ts                # zustand ストア
    │       ├── emoji.ts                # 分割カタログ・検索
    │       ├── performance.ts          # 起動・検索・メモリ計測
    │       ├── updates.ts              # 更新確認・明示同意後の適用
    │       ├── paste.ts                # ペースト実行
    │       ├── transfer.ts             # .emoshelfとID再割当Merge
    │       └── i18n.ts                 # 日本語/英語UI文言
    └── src-tauri/
        ├── Cargo.toml                  # プラグイン・enigo 追加済み
        ├── tauri.conf.json             # 製品名 EmoShelf、880x660、カスタムフレーム
        ├── capabilities/default.json   # core/opener/clipboard/dialog
        ├── src/lib.rs                  # Rust 基盤（コマンド登録・Windows統合）
        ├── src/custom_assets.rs        # 画像検証・正規化・content-addressed保存
        ├── src/renderer_packs.rs       # 署名付きPack検証・管理
        └── icons/                      # 正式Tauri／Windowsアイコン一式
```

## 4. コマンド（`app/` で実行）

```sh
pnpm install --frozen-lockfile
pnpm check       # 型チェック ＋ Biome ＋ Vitest/RTL/axe ＋ Node release tests
pnpm build       # 本番フロントビルド
pnpm test:e2e    # 実Tauri/WebView2（tauri-driver + matching EdgeDriver）
pnpm release:audit
pnpm tauri dev   # アプリ起動
pnpm tauri build # NSIS / MSI 生成
```

Rust 側（`app/src-tauri/`）:

```sh
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo check --locked
```

## 5. 既知の注意点（必読）

1. **Rust はローカル検証済み**: `cargo fmt --check`、警告をエラー扱いした Clippy、
   単体テスト、`cargo check --locked` を各PRの完了条件とする。
   永続化・ショートカット・交換形式・前面アプリ・画像・Pack境界に Rust 単体テスト 71 件がある。
2. **`Cargo.lock` は同期・コミット必須**: `Cargo.toml` の全直接依存を含む状態で管理し、
   CI でも `--locked` を指定して意図しない依存更新を拒否する。
3. **esbuild の postinstall を無効化している**（`app/.npmrc` の `never-built-dependencies`）:
   サンドボックスで pnpm のライフサイクル実行が EPERM になる回避策。
   バイナリは `@esbuild/win32-x64` から取得済みで Vite の動作に支障なし。
   通常環境・CI では無害な設定だが、気になる場合は削除して `pnpm install` し直すこと。
4. **Codex サンドボックスでは Cargo のネットワーク接続が失敗する場合がある**:
   Windows TLS の `SEC_E_NO_CREDENTIALS` が出た場合はプロジェクトのコンパイルエラーと分け、
   通常ターミナル・CI、または依存取得後の `--offline` で検証する。
5. **`images/`の参照画は保全**: 元のデザイン参考画は変更しない。正式生成物は`images/brand/`、
   実アプリ証跡は`images/screenshots/`へ分離する。
6. **npm/pnpm のキャッシュ・ストア**: サンドボックスでは `AppData\Local` 直下への
   書き込みが EPERM になる。回避には `$env:TEMP` 配下へのリダイレクト
   （`XDG_CACHE_HOME`、`--store-dir`）を使うこと。通常環境では不要。
7. **JavaScript bundle gate**: 日英emojibaseは静的JSONへ分離済み。`pnpm build`は
   500KiBを超えるJavaScript chunkがあれば失敗する。最新の大きさはビルド結果で確認する。
8. **外部Renderer**: Fluent/Noto/OpenMojiは未同梱。v0.4で署名・ハッシュ検証付き
   Renderer Pack管理を実装済みだが、`EMOSHELF_RENDERER_KEY_ID`と
   `EMOSHELF_RENDERER_PUBLIC_KEY_BASE64`をビルド時に設定しない限りfail-closedで無効になる。
   秘密鍵はリポジトリへ置かない。Pack詳細は`app/docs/renderer-packs.md`を参照。
9. **v0.4 OLE実ドロップ**: 実装・Windowsコンパイル・キャンセル経路までは確認済み。
   現行Computer Useは対象ウィンドウ外座標へドラッグできないため、Explorer等への成功証跡だけ残件。
10. **Updaterは開発ビルドで無効**: `EMOSHELF_UPDATER_PUBLIC_KEY`をビルド時に設定した場合だけ
    pluginを登録する。秘密鍵はリポジトリへ置かず、Renderer Pack鍵とも分離する。
11. **v0.5手動アクセシビリティ残件**: axeとキーボード自動テストは通過済みだが、Narrator、
    125%／150%／200%、大文字、120/144Hz以上は端末設定の復元証跡を伴うため未受入。
12. **GUI実機ゲート**: Codexサンドボックスから起動したGUIはComputer Useのユーザーデスクトップと
    分離される場合がある。実Tauri E2Eの成功を手動操作の代用にせず、署名済みインストール版を
    ユーザー側デスクトップで起動して`app/docs/release.md`の手順を完了する。

## 6. 決定事項（覆す場合は記録を残すこと）

| 項目 | 決定 | 理由 |
| ---- | ---- | ---- |
| 配置 | アプリは `app/` 配下 | ルート README 保護 |
| ライセンス | Apache-2.0 | ご主人選択（特許条項あり） |
| 状態管理 | zustand | 軽量、Tauri との相性 |
| 絵文字データ | emojibase-data v17（日本語＋英語） | CLDR由来、1949件。表示言語と別に両言語で検索可能 |
| 保存方式 | 自前 `state.json`（Rust コマンド） | アトミック保存・`.bak` 復旧を明示的に制御するため。`tauri-plugin-store` は不採用 |
| 整形・lint | Biome（ESLint/Prettier 不使用） | 高速・単一ツール |
| ショートカット登録 | Rust が所有、フロントは設定値の通知のみ | 二重登録・競合の単一管理点化 |
| ペースト方式 | clipboard＋Windows `SendInput` | 入力先・フォーカス・clipboard競合を検査し、失敗時はコピーとCtrl+V案内を保持 |

## 7. 次の作業の推奨順序（v1.0、2026-09-22更新）

1. 追加パックの製品用署名・配布準備と、アプリ内スタイル導入フローを実装する
2. 残っている外部入力・キーボード・画像・DPI・アクセシビリティの再現不具合を解消する
3. SignPath・鍵・CIを確認し、同一コミットから署名済みドラフトを作る
4. ドラフトの実配布物で全マトリクス、更新／復旧と5営業日の実利用を完了する
5. 実物に一致する最終説明・スクリーンショットと公開承認を揃え、同じ配布物を公開する

## 8. 規約

- ユーザー向け応答・コードコメント・コミットメッセージ・ドキュメントは**日本語**
  （技術用語の英語併記は可）
- 変更ファイルは最終応答で `app/src/lib/store.ts` の形式で明示する
- `ROADMAP.md` のチェックは実装完了と同時に更新する
- エラーは隠さず報告し、代替案を添える
