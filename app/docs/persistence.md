# EmoShelf 永続化フォーマット（Phase 0 基準）

ローカルファーストが原則。コア利用にアカウント・クラウド同期は不要。

## 保存場所

| 用途         | 場所（Tauri 規約）              | ファイル名    |
| ------------ | ------------------------------- | ------------- |
| アプリ状態   | `appLocalData` (`AppData/...`)  | `state.json`  |
| 設定バックアップ | ユーザー指定（Export 時のみ） | `emoshelf-*.json` |

開発時（`pnpm tauri dev`）は WebView の `localStorage` に同一スキーマで
保持してもよいが、正規の保存先は上記の JSON ファイルとする。

## ファイル形式

- UTF-8 の JSON、1 ファイル = `AppState` 1 件
- TypeScript の正本は `src/lib/state.ts`
- 先頭に必ず `schemaVersion`（現在 `1`）を含める

```jsonc
{
  "schemaVersion": 1,
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
            "addedAt": "2026-09-03T12:00:00.000Z",
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
    "selectionBehavior": "paste-close",
    "pinned": false,
    "globalShortcut": "Alt+E",
    "windowSize": { "width": 800, "height": 600 }
  },
  "onboardingCompleted": false
}
```

## ルール

1. **読み書きはアトミックに** — 一時ファイルへ書いてから rename する。
2. **未知フィールドは保持** — 将来バージョンのデータを開いても落とさない。
3. **破損時は起動を止めない** — バックアップ（`state.json.bak`）から復元を試み、
   駄目なら初期状態で起動して Toast で通知する。
4. **マイグレーションは `schemaVersion` で分岐** — 関数 `migrateState(raw)` に集約し、
   バージョンごとに小さな変換関数を足していく。
5. **使用統計は端末外に出さない** — `usage` / `recent` は解析送信の対象外。

## バージョン履歴

| schemaVersion | 内容                |
| ------------- | ------------------- |
| 1             | Phase 0 初版（v0.1 前提） |
