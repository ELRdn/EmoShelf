# EmoShelf LP

React + TypeScript + Vite。設計正本はルートの `LPDESIGN.md`。
既存の `app/node_modules` とロック済み依存を利用し、Tauriアプリとは別の入口で動作する。

リポジトリの `app/` から:

```powershell
pnpm lp:dev
pnpm lp:build
pnpm lp:audit
pnpm lp:preview
```

開発: http://127.0.0.1:5174/ 。preview: http://127.0.0.1:5174/EmoShelf/ 。英語はそれぞれ `en/` を付ける。ビルド出力: `lp/dist/`。
devとpreviewは同じポートなので、切り替える際は先に起動中の方を停止する。

デモで動くもの: 日英切り替え、3つのサンプル棚、絵文字選択と結果表示、リセット、FAQ。
ブラウザのクリップボード、OSのショートカット、ファイル保存、外部送信は使わない。

X / GitHubのURLと配布中のバージョン・Releaseリンクは `src/config.ts` に設定する。
v1.0.0の公開に合わせてnoindexを解除した。`lp:audit` はnoindexが残っていると失敗する。

## GitHub Pagesでの公開

公開URL: https://elrdn.github.io/EmoShelf/

リポジトリの Settings → Pages → Source は GitHub Actions を選ぶ。
`.github/workflows/lp-pages.yml` がLP関連ファイルのmainへのpush時にビルドし、
`app/lp/dist` だけを公開する。PRではビルド確認のみ行う。
手動で再公開する場合は Actions → LP Pages → Run workflow からmainを選ぶ。

未署名の最新版v1.1.0の配布ページとインストール手順へ案内する。
新しい版を出すときは、Releaseの公開後に `src/config.ts` のバージョンとリンクを切り替える。

Twemojiはインストール済みパッケージから必要な17素材だけをビルドに含める。
帰属とCC BY 4.0リンクをフッターに表示する。アプリアイコンは既存素材を利用する。
スクリーンショットは2026-09-22のローカル開発版を原寸で撮影した1762×1322のPNG。
表示言語に合わせて`images/screenshots/emoshelf-en.png`と`emoshelf-ja.png`を切り替える。
Allタブ、Native配置修正、英語UIの横はみ出し修正を含む。
撮影条件は[`images/screenshots/README.md`](../../images/screenshots/README.md)を参照。
v1.0.0で撮影。v1.1.0とは版表示だけが異なる。見た目が変わる版を出すときは撮り直す。
