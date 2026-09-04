# EmoShelf アプリ (`app/`)

EmoShelf 本体の Tauri 2 + React + TypeScript プロジェクト。
製品概要はルートの [`README.md`](../README.md)、
画面仕様は [`DESIGN.md`](../DESIGN.md)、全体計画は [`ROADMAP.md`](../ROADMAP.md) を参照。

Concept 2.5準拠のShelf UI、Compose Tray、sequence、キーボード操作、
`.emoshelf` Import/Export、アプリ別Board、Frequent、Tray、Autostart、
カスタム画像、署名付きRenderer Pack管理まで実装済みです。
v0.5では復旧通知、設定バックアップ、明示同意型Updater、アクセシビリティ監査、
性能診断、500KiB JavaScript bundle gateも追加しています。

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
pnpm check       # 型チェック + Biome + Vitest（48件）
pnpm test        # Vitest / React Testing Library / axe のみ実行
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
│   ├── App.tsx        # Shelf UI、オンボーディング、設定、キーボード操作
│   ├── components/    # 仮想化、Shelf D&D、画像、Pack、Compose、Import/Export
│   ├── test/          # Vitest共通セットアップ
│   └── lib/
│       ├── state.ts   # アプリ状態モデル（正本）
│       ├── store.ts   # zustand ストア（操作・永続化・設定反映）
│       ├── emoji.ts   # 分割済み絵文字カタログ読み込み・検索
│       ├── performance.ts # 起動・検索・JS heap計測
│       ├── updates.ts # 確認と明示同意後の更新適用を分離
│       ├── paste.ts   # ペースト実行＋コピーフォールバック
│       ├── transfer.ts # .emoshelf交換と安全なMerge
│       ├── customAssets.ts # カスタム画像IPC
│       ├── rendererPacks.ts # 署名付きPack IPC
│       └── i18n.ts    # 日本語／英語UI文言
├── docs/
│   ├── persistence.md # 永続化フォーマット定義
│   └── updater.md     # 更新同意・署名鍵・公開条件
├── src-tauri/
│   ├── src/lib.rs       # Rust 基盤（保存/ペースト/前面アプリ/monitor/Tray）
│   ├── src/custom_assets.rs # 画像検証・PNG正規化・ローカル保存
│   ├── src/renderer_packs.rs # 署名・hash・互換性検証とPack管理
│   ├── tauri.conf.json  # カスタムフレーム・ウィンドウ・バンドル設定
│   ├── capabilities/    # 権限設定
│   └── icons/           # 仮アイコン（正式アイコンは v1.0 で差し替え）
├── biome.json         # 整形 / lint 設定
└── .npmrc             # esbuild の postinstall スキップ設定
```

## 状態モデル・永続化

- 型の正本: `src/lib/state.ts`（schema v2。v1から一度だけ移行）
- 保存形式: `docs/persistence.md` に定義（`state.json`、アトミック書き込み）

対応済みの状態データより新しいschemaを検出した場合は、既存データを上書きしない
読み取り専用モードへ移行する。

## Rust 基盤コマンド（フロントから invoke）

| コマンド | 役割 |
| -------- | ---- |
| `load_state` | `state.json` 読み込み（破損時は `.bak` から復旧、無ければ `null`） |
| `save_state` | アトミック保存（旧ファイルは `.bak` へ退避） |
| `take_recovery_notice` | `.bak`復旧を一度だけUIへ通知 |
| `create_settings_backup` | 検証済み設定だけの復旧スナップショットを保存 |
| `load_settings_backup` | 設定スナップショットを検証して読み込む |
| `updater_available` | 署名検証鍵を持つ正式Updaterビルドか判定 |
| `get_performance_snapshot` | ホットキー表示要求のsample数とp95を取得 |
| `set_global_shortcut` | グローバルショートカット差し替え |
| `paste_payload` | クリップボード書き込み → 対象へフォーカス復帰 → Ctrl+V |
| `export_emoshelf` | schema v2状態を検証して`.emoshelf` ZIPへ保存 |
| `preview_emoshelf` | ZIPを安全に検証し、適用前プレビューを返す |
| `install_emoshelf_assets` | 検証済み`.emoshelf`内画像をアトミックに導入 |
| `import_custom_asset` | PNG／WebP／静的SVGを検証し、PNGへ正規化して保存 |
| `read_custom_asset` | hashを再検証してローカル画像を読み出す |
| `remove_custom_asset` | Board参照を検査して未参照画像だけを削除 |
| `copy_image_asset` | 画像をWindows clipboardへ書き込む |
| `paste_image_asset` | clipboard書込後、対象アプリへフォーカスを戻してCtrl+V |
| `drag_image_asset` | Windows OLEで画像ファイルを外部へcopy-onlyドラッグ |
| `list_renderer_packs` | 有効な署名付きPackとライセンス情報を列挙 |
| `install_renderer_pack` | Packの署名・hash・互換性・ZIP構造を検証して導入 |
| `set_renderer_pack_enabled` | Packの有効／無効を切り替える |
| `remove_renderer_pack` | Packをローカルから削除 |
| `read_renderer_asset` | 導入済みSVGを再検証して読み出す |
| `get_foreground_context` | 直近の前面実行ファイル名とmonitor IDだけを返す |
| `set_context_preferences` | アプリ別Boardと表示位置の実行時設定を反映 |
| `get_autostart` | Windows Autostartの実状態を取得 |
| `set_autostart` | Windows Autostartを有効化／無効化 |

使用プラグイン: `global-shortcut`（表示切替）・`clipboard-manager`（書き込み）・
`dialog`（Import/Export先の選択）・`single-instance`（二重起動抑止）・
`window-state`（サイズ/位置の自動復元）・`autostart`（Windowsサインイン時起動）。
Autostart時はウィンドウを出さずTrayで待機する。Trayの左クリックまたはメニューから
再表示でき、閉じるボタンは終了せずTrayへ格納する。
ペーストのキー送出には `enigo` を使用。

## 品質・Updater

- 絵文字データは`public/emoji-data/`へ分離し、Vite出力のJavaScript chunkが500KiBを超えると
  `pnpm build`を失敗させる。1949件のDOM描画は仮想化済み。
- 設定画面の診断には起動→操作可能、検索p95、ホットキー表示要求p95、JS heapを表示する。
- `state.json`と`.bak`が両方壊れている場合は読み取り専用へ移行し、空状態で上書きしない。
- Updaterの同意・鍵・公開条件は[`docs/updater.md`](docs/updater.md)を参照。
- 正式Updaterを有効にする場合だけ、公開鍵をコンパイル時に設定する。

```text
EMOSHELF_UPDATER_PUBLIC_KEY
```

## カスタム画像とRenderer Pack

- カスタム画像は内容からPNG／WebP／SVGを判定し、最大2048×2048・総画素数・容量・256件の
  上限をRust側で検証する。SVGは外部参照・script・animation等を拒否し、全形式をPNGへ正規化する。
- 正規化PNGのSHA-256をIDとファイル名に使い、`appLocalData/custom-assets/`へ保存する。
  元ファイル名と外部パスは永続化しない。
- Renderer Pack仕様は[`docs/renderer-packs.md`](docs/renderer-packs.md)を参照。
- 本番Packを受理するビルドでは、公開鍵だけを次の環境変数でコンパイル時に設定する。
  秘密鍵とパスワードはリポジトリへ置かない。

```text
EMOSHELF_RENDERER_KEY_ID
EMOSHELF_RENDERER_PUBLIC_KEY_BASE64
```

Twemojiの帰属とライセンスはルートの
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) を参照。
