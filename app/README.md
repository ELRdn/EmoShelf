# EmoShelf アプリ (`app/`)

EmoShelf 本体の Tauri 2 + React + TypeScript プロジェクト。
製品概要はルートの [`README.md`](../README.md)、
画面仕様は [`DESIGN.md`](../DESIGN.md)、全体計画は [`ROADMAP.md`](../ROADMAP.md) を参照。

## 前提ツール

| ツール | 目安バージョン | 備考                    |
| ------ | -------------- | ----------------------- |
| Node.js | 22 以上       | フロントのビルドに使用  |
| pnpm   | 10 以上        | パッケージ管理          |
| Rust   | stable 最新    | Tauri バックエンド用    |
| WebView2 | Evergreen    | Windows 11 は標準搭載   |

Tauri 公式の前提条件: https://tauri.app/start/prerequisites/

## コマンド

```sh
cd app

pnpm install     # 依存インストール
pnpm dev         # Vite のみ起動（UI 確認用）
pnpm tauri dev   # デスクトップアプリとして起動
pnpm check       # 型チェック + Biome チェック
pnpm build       # 本番フロントビルド
pnpm tauri build # Windows インストーラー（NSIS / MSI）を生成
```

Rust 側の検証:

```sh
cd app/src-tauri
cargo fmt --check                    # 整形チェック
cargo clippy --locked -- -D warnings # lint（警告をエラー扱い）
cargo test --locked                  # 永続化・ショートカット解析の単体テスト
cargo check --locked                 # lockfile 固定でコンパイル確認
```

## 構成

```text
app/
├── src/
│   ├── App.tsx        # 基盤確認用の仮シェル（本格 UI は v0.1 で実装）
│   └── lib/
│       ├── state.ts   # アプリ状態モデル（正本）
│       ├── store.ts   # zustand ストア（操作・永続化・設定反映）
│       ├── emoji.ts   # 絵文字カタログ読み込み・検索
│       └── paste.ts   # ペースト実行＋コピーフォールバック
├── docs/
│   └── persistence.md # 永続化フォーマット定義
├── src-tauri/
│   ├── src/lib.rs       # Rust 基盤（保存/復元・ペースト・ショートカット）
│   ├── tauri.conf.json  # ウィンドウ・バンドル設定
│   ├── capabilities/    # 権限設定
│   └── icons/           # 仮アイコン（本番アイコンは DESIGN.md §41 に従い後日差し替え）
├── biome.json         # 整形 / lint 設定
└── .npmrc             # esbuild の postinstall スキップ設定
```

## 状態モデル・永続化

- 型の正本: `src/lib/state.ts`（`STATE_SCHEMA_VERSION` で版管理）
- 保存形式: `docs/persistence.md` に定義（`state.json`、アトミック書き込み）

## Rust 基盤コマンド（フロントから invoke）

| コマンド | 役割 |
| -------- | ---- |
| `load_state` | `state.json` 読み込み（破損時は `.bak` から復旧、無ければ `null`） |
| `save_state` | アトミック保存（旧ファイルは `.bak` へ退避） |
| `set_global_shortcut` | グローバルショートカット差し替え |
| `paste_payload` | クリップボード書き込み → 非表示 → Ctrl+V |

使用プラグイン: `global-shortcut`（表示切替）・`clipboard-manager`（書き込み）・
`single-instance`（二重起動抑止）・`window-state`（サイズ/位置の自動復元）。
ペーストのキー送出には `enigo` を使用。
