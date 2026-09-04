# EmoShelf 永続化フォーマット（schema v2）

ローカルファーストが原則。コア利用にアカウント・クラウド同期は不要。

## 保存場所

| 用途 | 場所（Tauri 規約） | ファイル名 |
| --- | --- | --- |
| アプリ状態 | `appLocalData` (`AppData/...`) | `state.json` |
| 自動バックアップ | 同上 | `state.json.bak` |
| カスタム画像 | `appLocalData/custom-assets` | `<sha256>.png` |
| Renderer Pack | `appLocalData/renderer-packs` | Renderer ID別ディレクトリ |

正規の保存先はRust側が管理する上記JSONファイルとする。

## ファイル形式

- UTF-8のJSON、1ファイル = `AppState` 1件
- TypeScriptの正本は`src/lib/state.ts`
- 先頭に必ず`schemaVersion`（現在`2`）を含める
- schema v1は初回読込時にv2へ移行する
- v2より新しいデータは上書きせず、読み取り専用で安全に停止する

```jsonc
{
  "schemaVersion": 2,
  "boards": [
    {
      "id": "b_my_shelf",
      "name": "My Shelf",
      "icon": "⭐",
      "order": 0,
      "items": [
        {
          "id": "i_01",
          "type": "unicode",
          "payload": "😭",
          "display": {
            "name": "Loudly Crying Face",
            "unicode": "U+1F62D",
            "category": "Smileys & Emotion",
            "keywords": ["cry", "tear", "sad"]
          },
          "usage": {
            "addedAt": "2026-09-04T12:00:00.000Z",
            "useCount": 0
          }
        }
      ]
    }
  ],
  "recent": [],
  "settings": {
    "renderer": "twemoji",
    "theme": "system",
    "locale": "system",
    "selectionBehavior": "paste-close",
    "pinned": false,
    "globalShortcut": "Alt+E",
    "windowSize": { "width": 880, "height": 660 },
    "reducedMotion": false,
    "autostart": false,
    "usageTrackingEnabled": true,
    "shelfGlow": false,
    "perAppBoardsEnabled": false,
    "popupPositionBehavior": "active-monitor"
  },
  "onboardingCompleted": false,
  "appBoardMappings": {},
  "customAssets": {},
  "extensions": {}
}
```

## 項目の型

`ShelfItem`は`type`で判別するUnionで、v2では次を予約・検証する。

| type | 本文 | 用途 |
| --- | --- | --- |
| `unicode` | `payload` | 単一Unicode絵文字 |
| `sequence` | `payload` | 複数絵文字シーケンス |
| `symbol` | `payload` | 記号・テキスト |
| `image` | `assetId` | アプリ管理下のカスタム画像 |

`recent`も同じ型付き参照を使い、画像の外部元パスは保持しない。

## カスタム画像

- PNG／WebP／静的SVGだけをバイト内容で判定し、すべてPNGへ正規化する
- 正規化PNGのSHA-256小文字hexを`assetId`、`sha256`、ファイル名に共用する
- 1辺2048px、4,194,304画素、正規化後8MiB、保存256件を上限とする
- SVGの外部参照、script、animation、埋め込みimage、style要素／属性等はfail-closedで拒否する
- 読み出し時もPNG形式とhashを再検証する
- Board参照中の画像は削除しない。Recentだけの参照は状態から除去してから削除する
- 外部の元パス・元ファイル名は`state.json`へ保存しない

## v1 → v2移行

- 既存Board、item ID、並び順、Recent、Settings、オンボーディング状態を保持する
- v1のテキスト項目は`unicode`項目として正規化する
- v2で追加された設定には安全な既定値を補う
- 未知のトップレベルフィールドは`extensions`へ保持する
- 移行後の保存もRustのアトミック保存と`.bak`保護を使う

## ルール

1. **読み書きはアトミックに** — 一時ファイルへ書いてからrenameする。
2. **未知フィールドは保持** — 既知schema内の拡張値を`extensions`へ保持する。
3. **未来schemaは上書き禁止** — 対応版より新しいデータでは永続化を停止する。
4. **破損時は起動を止めない** — `.bak`から復元し、失敗時は初期状態と通知を使う。
5. **マイグレーションは一方向** — `parseAppState`内でv1からv2へ一度だけ変換する。
6. **使用統計は端末外に出さない** — `usage` / `recent`を解析送信しない。

## v0.3のプライバシー境界

- `appBoardMappings`のキーは小文字化した実行ファイル名（例: `code.exe`）だけとする
- フルパス、ウィンドウタイトル、プロセスIDは保存しない
- monitor IDは表示位置決定と現在コンテキスト表示だけに使い、状態ファイルへ保存しない
- アプリ別Boardは初期OFF。OFF時はRust側の直近コンテキストも消去する
- 利用追跡は初期ONだが設定で完全に停止でき、停止中は`usage`と`recent`を更新しない
- 利用統計リセットは`recent`、`useCount`、`lastUsedAt`だけを消し、Boardと追加日は保持する

## バージョン履歴

| schemaVersion | 内容 |
| --- | --- |
| 1 | Phase 0初版 |
| 2 | 判別可能ShelfItem、型付きRecent、追加設定、アプリ別Board・カスタムアセット領域 |

## `.emoshelf`交換形式

`.emoshelf`はZIPコンテナで、次の2ファイルと任意のローカル画像・ライセンスを格納する。

| Entry | 内容 |
| --- | --- |
| `manifest.json` | format/version、state schema、Export日時、アプリ版 |
| `state.json` | 検証済みの`AppState` |
| `assets/<sha256>.png` | `state.json`が参照する正規化済みカスタム画像 |
| `licenses/*` | 任意のライセンス文書（256KiB/件まで） |

- container formatは`1`、state schemaは現時点で`1`または`2`を受理する
- 64MiB超のcontainer、8MiB超のstate、128件超のentryを拒否する
- 絶対パス、親脱出、NUL、シンボリックリンク、未知entryを拒否する
- future schema、manifest/state不一致、不正JSONは適用前に拒否する
- manifest・state・ZIP内asset集合の完全一致、各画像のSHA-256・寸法・容量を適用前に再検証する
- MergeはBoard/item IDを再割り当てし、ローカル設定を維持する
- Replaceは現在の`state.json`を`.bak`へ退避してから即時保存する
- asset導入は全件検証後に行い、途中失敗時は新規作成分をロールバックする
