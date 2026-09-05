# EmoShelf Privacy Statement

Last updated: 2026-09-05

EmoShelf is a local-first desktop application. It does not require an account and does not include analytics, advertising, remote profiles, or cloud synchronization.

## Data kept on your device

EmoShelf stores Boards, Shelf items, recent and frequent usage, settings, imported custom assets, installed renderer packs, and recovery backups in the application data directory on the current Windows account.

Custom images are copied into application storage under a content hash. Their original external paths are not retained.

## Optional app-aware Boards

App-aware Boards are off by default. When enabled, EmoShelf reads only:

- the foreground application's executable basename, such as `notepad.exe`;
- the monitor identifier used to position the popup.

EmoShelf does not save the executable's full path or the foreground window title. This information stays on the device.

## Network access

Core features work offline. A release build may contact the EmoShelf GitHub Releases endpoint to check for an update. The check runs quietly; downloading, installing, and restarting require an explicit user action. Tauri verifies the update signature before installation.

EmoShelf does not send Board contents, searches, clipboard contents, custom assets, app mappings, usage counts, or diagnostic values to the project maintainers.

## Removing data

Use the reset action in Settings to clear local usage statistics. Uninstalling EmoShelf may leave Boards and other application data so an accidental uninstall does not destroy a Shelf; remove the EmoShelf application-data directory manually if you no longer need it.

## Contact

Privacy questions are handled through [GitHub Issues](https://github.com/ELRdn/EmoShelf/issues).

---

# EmoShelf プライバシー方針

EmoShelfはローカルファーストのデスクトップアプリです。アカウント、アクセス解析、広告、クラウド同期はありません。Board、履歴、設定、カスタム画像、Renderer Packは利用中のWindowsアカウント内へ保存されます。

初期OFFのアプリ別Boardを有効にした場合も、前面アプリの実行ファイル名とモニター識別子だけを端末内で利用します。フルパスとウィンドウタイトルは保存・送信しません。

正式ビルドはGitHub Releasesへ更新確認を行う場合があります。ダウンロード、署名検証、インストール、再起動はユーザーが明示的に許可した場合だけ実行します。
