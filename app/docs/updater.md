# EmoShelf Updater方針

EmoShelfはTauri Updaterの署名検証を必須とし、更新鍵が設定されていない開発ビルドでは
更新機能をfail-closedで無効にする。

## 利用者の同意

1. 起動後の確認はバックグラウンドで静かに行う。
2. 更新が見つかった場合だけ設定画面に通知する。
3. ダウンロード・インストール・再起動は、利用者が「更新を確認」または更新通知から明示的に
   許可した後にだけ行う。
4. 自動ダウンロードや無断再起動は行わない。

## ビルド設定

正式ビルドでは公開鍵を次のコンパイル時環境変数に設定する。

```text
EMOSHELF_UPDATER_PUBLIC_KEY
```

秘密鍵とパスワードはユーザープロファイル内の保護領域とGitHub Secretsで管理し、
リポジトリ、成果物、ログへ含めない。Renderer Pack署名鍵とは必ず分離する。

更新endpointは`tauri.conf.json`に記載したEmoShelf GitHub Releaseの`latest.json`だけを許可する。
CSPもTauri IPC、同梱ローカルアセット、同endpointに限定する。

## リリース条件

- 正式版は署名済みのWindows成果物とTauri Updater署名を検証してから公開する。
- `latest.json`は署名済みUpdater成果物のURL、署名、バージョン、公開日時を持つ。
- SignPath承認前にRCが必要な場合だけ、未署名であることを明示し正式版と分離する。

正式ワークフローは、未バンドルEXE生成、NSIS／MSI種別の事前埋め込み、SignPathでのEXE署名、
署名後EXEを変更しないNSIS／MSI生成、インストーラー署名、Tauri updater署名、
`latest.json`生成の順で実行する。公開前に
Authenticode、Tauri署名、SHA-256、サイレントインストール／起動／アンインストールを
x64とARM64で独立検証する。具体的な手動ゲートは[`release.md`](release.md)を正本とする。
