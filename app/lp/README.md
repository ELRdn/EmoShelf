# EmoShelf LP mockup

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

X / GitHubのURLは `src/config.ts` に設定する。nullの間は準備中の案内を表示する。
開発プレビューはnoindex。公開用のSEO・OG画像・正式ダウンロード導線の条件はLPDESIGN.mdを参照。

## GitHub Pagesでの仮公開

公開URL: https://elrdn.github.io/EmoShelf/

リポジトリの Settings → Pages → Source は GitHub Actions を選ぶ。
`.github/workflows/lp-pages.yml` がLP関連ファイルのmainへのpush時にビルドし、
`app/lp/dist` だけを公開する。PRではビルド確認のみ行う。
手動で再公開する場合は Actions → LP Pages → Run workflow からmainを選ぶ。

仮公開中はnoindexと「公開準備中」の表示、X / GitHubへの導線を維持する。
noindexはアクセス制限ではなく、公開URLは誰でも閲覧できる。
現在は未署名RC 1の配布ページ・インストール手順へ案内する。正式版も未署名とする方針。新しい版の実物の検証と公開後、バージョン・コピー・noindexを合わせて切り替える。

Twemojiはインストール済みパッケージから必要な17素材だけをビルドに含める。
帰属とCC BY 4.0リンクをフッターに表示する。アプリアイコンは既存素材を利用する。
スクリーンショットは2026-09-22のローカル開発版を原寸で撮影した1762×1322のPNG。
表示言語に合わせて`images/screenshots/emoshelf-en.png`と`emoshelf-ja.png`を切り替える。
Allタブ、Native配置修正、英語UIの横はみ出し修正を含む。
撮影条件は[`images/screenshots/README.md`](../../images/screenshots/README.md)を参照。
公開済みRC 1とは異なるため、開発版・公開準備中の表示を維持する。
配布候補の検証完了後に、その実物に合わせて画像と説明を再確認する。
