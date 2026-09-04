# EmoShelf 引き継ぎ書

> 最終更新: 2026-09-04（基礎構築: DSH / Scarlet 🦊、Phase 0〜v0.3: Cyan/Codex）
> このファイルは他エージェントへの引き継ぎ用。作業開始前にここから読むこと。

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

## 2. 現状サマリ

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
- **v0.1 データ層**:
  - Rust: `load_state` / `save_state`（アトミック保存・`.bak` 復旧）/
    `set_global_shortcut` / `paste_payload`（クリップボード→非表示→Ctrl+V）
  - プラグイン: `global-shortcut`・`clipboard-manager`・`single-instance`・`window-state`、キー送出に `enigo`
  - フロント: zustandストア（CRUD・並べ替え・使用記録・デバウンス保存）、
    emojibase全1949件＋日英検索、ペーストAPI＋コピーフォールバック
  - schema v2: 判別可能ShelfItem、型付きRecent、v1移行、未知フィールド保持、未来schema上書き防止
- **Rust 基盤検証**: lockfile 固定のコンパイル、Clippy（警告をエラー扱い）、
  永続化・ショートカット・`.emoshelf`・前面実行ファイル名の単体テスト13件
- **Windows 実機検証**: release ビルドの起動、`Alt+E` による表示／非表示、
  二重起動時の既存ウィンドウ前面化を確認。NSIS `.exe` と MSI `.msi` も生成済み
- **フロント検証**: TypeScript、Biome、Vitest/React Testing Library/axe（28件）、production build
- `ROADMAP.md` のPhase 0〜v0.3チェックボックスは受け入れ結果へ同期済み

### 次の作業

- v0.4: カスタム画像、画像Board、画像clipboard/drag、Renderer Pack
- v0.5以降: Accessibility、性能、復旧、Updater、120/144Hz以上の実機確認
- Viteの500kB超チャンク警告は未解消。v1.0検証ゲートまでにデータ・locale・画面単位で分割する

## 3. 主要ファイル

```text
./
├── README.md / DESIGN.md / ROADMAP.md  # 製品・設計・計画（正本）
├── LICENSE                             # Apache-2.0
├── HANDOFF.md                          # このファイル
├── images/                             # デザイン参考画（3枚、触らない）
├── .github/workflows/ci.yml            # CI（フロント検証＋Rust検証＋Win実パッケージ）
└── app/                                # アプリ本体
    ├── package.json                    # scripts: dev/build/check/lint/format/typecheck/tauri
    ├── biome.json                      # 整形・lint（Biome 2.x、推奨プリセット）
    ├── .npmrc                          # esbuild の postinstall スキップ（§5 参照）
    ├── README.md                       # 開発者向け説明
    ├── docs/persistence.md             # state.json 仕様（正本）
    ├── src/
    │   ├── App.tsx / App.css            # Concept 2.5 Shelf UI
    │   ├── components/                  # 仮想化、D&D、Twemoji、Compose、Import/Export
    │   ├── test/                        # Vitest共通設定
    │   └── lib/
    │       ├── state.ts                # 型の正本（STATE_SCHEMA_VERSION = 2）
    │       ├── store.ts                # zustand ストア
    │       ├── emoji.ts                # カタログ・検索
    │       ├── paste.ts                # ペースト実行
    │       ├── transfer.ts             # .emoshelfとID再割当Merge
    │       └── i18n.ts                 # 日本語/英語UI文言
    └── src-tauri/
        ├── Cargo.toml                  # プラグイン・enigo 追加済み
        ├── tauri.conf.json             # 製品名 EmoShelf、880x660、カスタムフレーム
        ├── capabilities/default.json   # core/opener/clipboard/dialog
        ├── src/lib.rs                  # Rust 基盤（コマンド10件）
        └── icons/                      # テンプレ既定の仮アイコン
```

## 4. コマンド（`app/` で実行）

```sh
pnpm install     # 依存インストール
pnpm check       # 型チェック ＋ Biome ＋ Vitest（基本はこれ）
pnpm build       # 本番フロントビルド
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
   永続化・ショートカット・交換形式・前面アプリ境界に Rust 単体テスト 13 件がある。
2. **`Cargo.lock` は同期・コミット必須**: `Cargo.toml` の全直接依存を含む状態で管理し、
   CI でも `--locked` を指定して意図しない依存更新を拒否する。
3. **esbuild の postinstall を無効化している**（`app/.npmrc` の `never-built-dependencies`）:
   サンドボックスで pnpm のライフサイクル実行が EPERM になる回避策。
   バイナリは `@esbuild/win32-x64` から取得済みで Vite の動作に支障なし。
   通常環境・CI では無害な設定だが、気になる場合は削除して `pnpm install` し直すこと。
4. **Codex サンドボックスでは Cargo のネットワーク接続が失敗する場合がある**:
   Windows TLS の `SEC_E_NO_CREDENTIALS` が出た場合はプロジェクトのコンパイルエラーと分け、
   通常ターミナル・CI、または依存取得後の `--offline` で検証する。
5. **`images/` は触らない**: デザイン参考画。v0.1 の UI 実装時に参照する。
6. **npm/pnpm のキャッシュ・ストア**: サンドボックスでは `AppData\Local` 直下への
   書き込みが EPERM になる。回避には `$env:TEMP` 配下へのリダイレクト
   （`XDG_CACHE_HOME`、`--store-dir`）を使うこと。通常環境では不要。
7. **Vite のチャンクサイズ警告**: 日英emojibase全件を含むため500kB超の警告が出る。
   1949件のDOM描画は仮想化済みだが、配信チャンクはv1.0までに分割する。
8. **外部Renderer**: Fluent/Noto/OpenMojiは未同梱。設定には利用不可で表示し、
   v0.4の署名・ハッシュ検証付きRenderer Packで有効化する。

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
| ペースト方式 | クリップボード＋enigo の Ctrl+V | 標準的構成。失敗時は Copy only に自動フォールバック |

## 7. 次の作業の推奨順序（v0.4）

1. PNG/WebP/SVGの制限付きImportとハッシュID保存
2. SVG sanitizeと正規化PNG、画像clipboardとOLE drag
3. 参照中assetを保護する削除と`.emoshelf` asset統合
4. 署名・hash検証付きRenderer Pack管理
5. x64実機とCIでUnicode workflowを回帰確認

## 8. 規約

- ユーザー向け応答・コードコメント・コミットメッセージ・ドキュメントは**日本語**
  （技術用語の英語併記は可）
- 変更ファイルは最終応答で `app/src/lib/store.ts` の形式で明示する
- `ROADMAP.md` のチェックは実装完了と同時に更新する
- エラーは隠さず報告し、代替案を添える
