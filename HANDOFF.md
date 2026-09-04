# EmoShelf 引き継ぎ書

> 最終更新: 2026-09-04（基礎構築: DSH / Scarlet 🦊、Phase 0 完了検証: Cyan/Codex）
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
- **UI 以外の基礎（v0.1 のデータ層）**:
  - Rust: `load_state` / `save_state`（アトミック保存・`.bak` 復旧）/
    `set_global_shortcut` / `paste_payload`（クリップボード→非表示→Ctrl+V）
  - プラグイン: `global-shortcut`・`clipboard-manager`・`single-instance`・`window-state`、キー送出に `enigo`
  - フロント: zustand ストア（CRUD・並べ替え・使用記録・デバウンス保存）、
    emojibase 全1949件＋検索ロジック、ペースト API＋コピーフォールバック
- **Rust 基盤検証**: lockfile 固定のコンパイル、Clippy（警告をエラー扱い）、
  永続化・ショートカット解析の単体テスト 9 件
- **Windows 実機検証**: release ビルドの起動、`Alt+E` による表示／非表示、
  二重起動時の既存ウィンドウ前面化を確認。NSIS `.exe` と MSI `.msi` も生成済み
- `ROADMAP.md` の該当チェックボックスは反映済み（Phase 0 全10＋v0.1 データ層20項目）

### 未着手（＝次の作業）

- v0.1 の **UI 全部**: オンボーディング、Shelf グリッド、Board タブ、詳細パネル、
  検索 UI、Board 編集 UI、設定画面、Toast、ダーク/ライト見た目、モーション
- v0.1 ロジック側の残り: 競合検出（ショートカット）、カテゴリ分類表示、
  「選択後に閉じる」挙動（UI と一体）、Twemoji レンダラー

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
    │   ├── App.tsx / main.tsx          # 基盤確認用の仮シェルのみ
    │   └── lib/
    │       ├── state.ts                # 型の正本（STATE_SCHEMA_VERSION = 1）
    │       ├── store.ts                # zustand ストア
    │       ├── emoji.ts                # カタログ・検索
    │       └── paste.ts                # ペースト実行
    └── src-tauri/
        ├── Cargo.toml                  # プラグイン・enigo 追加済み
        ├── tauri.conf.json             # 製品名 EmoShelf、800x600、bundle targets: all
        ├── capabilities/default.json   # core/opener/clipboard-manager
        ├── src/lib.rs                  # Rust 基盤（コマンド4件）
        └── icons/                      # テンプレ既定の仮アイコン
```

## 4. コマンド（`app/` で実行）

```sh
pnpm install     # 依存インストール
pnpm check       # 型チェック ＋ Biome（基本はこれ）
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
   単体テスト、`cargo check --locked` を Phase 0 の完了条件とする。
   永続化とショートカット解析には Rust 単体テスト 9 件がある。
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
7. **Vite のチャンクサイズ警告**: emojibase 全件を含むため、基盤シェルでも 500 kB 超の
   警告が出る。Phase 0 のブロッカーではなく、v0.1 の性能計測と分割方針で扱う。

## 6. 決定事項（覆す場合は記録を残すこと）

| 項目 | 決定 | 理由 |
| ---- | ---- | ---- |
| 配置 | アプリは `app/` 配下 | ルート README 保護 |
| ライセンス | Apache-2.0 | ご主人選択（特許条項あり） |
| 状態管理 | zustand | 軽量、Tauri との相性 |
| 絵文字データ | emojibase-data v17（英語） | CLDR 由来、タグ付き。日本語検索は v0.5 で対応 |
| 保存方式 | 自前 `state.json`（Rust コマンド） | アトミック保存・`.bak` 復旧を明示的に制御するため。`tauri-plugin-store` は不採用 |
| 整形・lint | Biome（ESLint/Prettier 不使用） | 高速・単一ツール |
| ショートカット登録 | Rust が所有、フロントは設定値の通知のみ | 二重登録・競合の単一管理点化 |
| ペースト方式 | クリップボード＋enigo の Ctrl+V | 標準的構成。失敗時は Copy only に自動フォールバック |

## 7. 次の作業の推奨順序（v0.1 UI）

1. オンボーディング（初回カタログ選択 → My Shelf 生成）— 製品の顔
2. Shelf Home（Board タブ＋絵文字グリッド＋クリックペースト配線）
3. 詳細パネル＋フッター（Concept 2.5 の右側・下部）
4. Board 編集モード（D&D 並べ替え・移動・削除＋Undo 配慮）
5. 検索 UI（`searchCatalog` に接続、キーボード操作）
6. 設定画面（ショートカット・動作・テーマ・データ Export/Import/Reset）
7. Twemoji レンダラー＋見た目仕上げ（トークンは `DESIGN.md` §25・§26）

## 8. 規約

- ユーザー向け応答・コードコメント・コミットメッセージ・ドキュメントは**日本語**
  （技術用語の英語併記は可）
- 変更ファイルは最終応答で `app/src/lib/store.ts` の形式で明示する
- `ROADMAP.md` のチェックは実装完了と同時に更新する
- エラーは隠さず報告し、代替案を添える
