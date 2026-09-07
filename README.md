# EmoShelf

<p align="center">
  <img src="./images/brand/emoshelf-icon-master.png" width="160" height="160" alt="EmoShelf — sunglasses face behind a purple shelf">
</p>

<p align="center"><strong>Your personal emoji shelf.</strong></p>

EmoShelf is a fast, local-first Windows app for keeping the emojis, sequences, symbols, and custom images you actually use within instant reach.

Press <kbd>Alt</kbd> + <kbd>E</kbd>, choose from your Board, and paste. No account, cloud sync, telemetry, or remote profile is required.

![EmoShelf v1.0 Shelf](./images/screenshots/emoshelf-v1-shelf.png)

## What it does

- Personal Boards with drag-and-drop ordering, safe delete/undo, and app-specific mapping
- Search across 1,949 emoji with English and Japanese names and tags
- Twemoji and native rendering, plus separately signed Fluent, Noto, and OpenMoji packs
- Single emoji paste, multi-emoji Compose Tray, reusable sequences, and copy-only fallback
- PNG, WebP, and sanitized SVG import with content-addressed local storage
- `.emoshelf` backup, preview, merge, and replace workflows
- Global shortcut, Quick/Pinned modes, system tray, autostart, monitor-aware placement, and single instance
- Dark, light, and system themes with keyboard navigation, visible focus, high-contrast support, and Reduced Motion
- User-approved, signature-verified updates

## Fast path

```text
Alt + E → Board → emoji → target application
```

Keyboard controls:

| Key | Action |
| --- | --- |
| `Ctrl+F` | Focus search |
| Arrow keys | Move through items |
| `Enter` | Paste |
| `Ctrl+Enter` | Keep open when pasting, or add a search result to the active Board |
| `Ctrl+K` | Open item actions |
| `Ctrl+1..9` | Switch Board |
| `Esc` | Close dialog, clear search, then hide EmoShelf |

## Install

Official builds target Windows 11 on x64 and ARM64. Signed installers and checksums are published on [GitHub Releases](https://github.com/ELRdn/EmoShelf/releases) after the external signing gates are complete.

To establish the public release history required for a SignPath Foundation application, EmoShelf may publish a clearly labelled **unsigned prerelease**. The current [v1.0.0 RC 1](https://github.com/ELRdn/EmoShelf/releases/tag/v1.0.0-rc.1) is such an application build: it is not the formal release, and Windows may show an unknown-publisher or SmartScreen warning.

Formal `v1.0.0` artifacts are released only after SignPath Foundation approval, Authenticode verification, updater-signature verification, and installer smoke tests. Do not redistribute an unsigned prerelease or CI artifact as an official release.

### Unsigned RC installation / 未署名RCのインストール

**SignPath申請済み・承認待ちです。現在のRCは未署名のテスト版であり、正式な署名済みリリースではありません。** 未署名のため、Windowsは証明書で発行元を確認できません。以下の確認でリスクを減らせますが、安全性を保証するものではありません。不安がある場合や業務用・学校管理のPCでは、署名済み正式版を待つか管理者に相談してください。

English summary: use only the linked GitHub Release, choose the matching architecture, and compare the complete SHA-256 before opening the installer. A matching hash is not proof of publisher identity or safety. Scan the file, keep Windows protections enabled, and stop on a threat detection or policy block. Only consider the per-file SmartScreen **More info → Run anyway** option if the warning is solely about an unrecognized app and you trust the source. This RC has no production updater configured; back up and update manually.

#### 1. 公式Releaseから、自分のPC用のEXEを入手する

Windowsの **設定 → システム → バージョン情報 → システムの種類** で、プロセッサが「x64ベース」か「ARMベース」かを確認してください。「64ビット」という表示だけでは区別できません。

[公式 v1.0.0-rc.1 Release](https://github.com/ELRdn/EmoShelf/releases/tag/v1.0.0-rc.1) の **Assets** から、次のどちらか1つと `SHA256SUMS.txt` を同じフォルダーへダウンロードします。

| PCの種類 | ダウンロードするインストーラー |
| --- | --- |
| x64（Intel / AMD） | `EmoShelf_1.0.0-rc.1_windows-x86_64_UNSIGNED-setup.exe` |
| ARM64（Snapdragonなど） | `EmoShelf_1.0.0-rc.1_windows-aarch64_UNSIGNED-setup.exe` |

これはインストーラーであり、ポータブル版ではありません。通常はEXEだけでよく、MSIも重ねてインストールする必要はありません。`Source code (zip)` / `Source code (tar.gz)` は実行用ではありません。

入手元が **`github.com/ELRdn/EmoShelf`** であることを確認してください。検索広告、非公式ミラー、DM・メール添付からは入手しないでください。ブラウザーが脅威を検出した場合はダウンロードを中止します。「一般的にダウンロードされていない」という評判の警告だけでも、安全と決めつけず、入手元とRCであることを確認してください。

#### 2. 実行する前にSHA-256を照合する

エクスプローラーでダウンロード先のフォルダーを開き、アドレスバーに `powershell` と入力してEnterを押します。管理者として開く必要はありません。選んだファイルに対応するコマンドを**どちらか1つ**実行してください。これはハッシュの表示だけを行い、EXEを起動しません。

x64:

```powershell
Get-FileHash -LiteralPath '.\EmoShelf_1.0.0-rc.1_windows-x86_64_UNSIGNED-setup.exe' -Algorithm SHA256 | Format-List
```

ARM64:

```powershell
Get-FileHash -LiteralPath '.\EmoShelf_1.0.0-rc.1_windows-aarch64_UNSIGNED-setup.exe' -Algorithm SHA256 | Format-List
```

同じReleaseから取得した `SHA256SUMS.txt` をメモ帳で開き、**同じファイル名の行**と出力の `Hash` を比較します。64桁すべての一致が必要です（英字の大文字・小文字は無視できます）。先頭や末尾だけで判断しないでください。ファイル名に `(1)` などが付いている場合は、コマンドの名前を実際の名前に合わせ、照合先には元の配布ファイル名の行を使います。

不一致、ファイルが見つからない、該当するハッシュがない場合は、**インストールしないでください**。公式Releaseから取り直しても一致しなければ、[GitHub Issues](https://github.com/ELRdn/EmoShelf/issues)へ報告してください。

ハッシュ一致は「公開されたチェックサムと同じ内容」という確認です。チェックサムも同じ配布元にあるため、配布元自体の侵害やアプリの無害性を保証せず、コード署名の代わりにはなりません。コマンドの仕様は[MicrosoftのGet-FileHash解説](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash?view=powershell-5.1)を参照してください。

#### 3. スキャンし、警告の内容を確認してインストールする

1. Windowsとウイルス対策を最新にし、EXEを右クリック → **その他のオプションを確認 → Microsoft Defenderでスキャンする** を選びます。他社製ウイルス対策を利用中なら、その製品でスキャンしてください。検出がなくても安全の保証ではありません。[Microsoftのスキャン手順](https://support.microsoft.com/en-us/windows/scan-an-item-with-windows-security-d1c8c01d-12ed-e768-cbb8-830ea8ccf8e6)
2. 脅威が検出されず、入手元・ハッシュ・未署名RCであることを確認し、リスクを了承できた場合だけEXEをダブルクリックします。
3. SmartScreenの **「WindowsによってPCが保護されました」** が、認識されていないアプリについての警告だけである場合は、**「詳細情報」** でアプリ名を確認します。このRCでは発行元が **「不明な発行元」** になることがあります。これは認証済みという意味ではありません。確認したファイルを信頼し、自分の判断で進める場合に限り **「実行」** を選べます。不安なら **「実行しない」** で中止してください。[MicrosoftのSmartScreen案内](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/publish-first-app#step-6-handle-smartscreen-for-new-apps)
4. インストーラーの案内に従います。UAC（デバイスへの変更の許可）が表示された場合も、自分で起動したインストーラーか確認し、不明な別プログラムや想定外の要求ならキャンセルしてください。警告回避のために「管理者として実行」を使わないでください。

**次の場合は実行せず、署名済み版を待つか管理者へ相談してください。**

- ウイルス・マルウェア・望ましくないアプリとして検出された、または隔離された。
- Smart App Control、組織のポリシー、Sモードなどで実行が禁止されている。
- 「実行」ボタンがない、または警告内容を判断できない。

Defenderのリアルタイム保護、SmartScreen、Smart App Controlを無効にしたり、除外設定を追加したり、隔離されたファイルを復元して強行したりしないでください。別形式のMSIに切り替えて制限を回避することも勧めません。Smart App Controlにはアプリ単位の例外許可がありません。[MicrosoftのSmart App Control FAQ](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions)

#### 4. 起動して、まずメモ帳で試す

1. スタートメニューから **EmoShelf** を起動し、初回案内で使いたい絵文字を選びます。言語や動作は設定で変更できます。
2. 通常権限で起動したメモ帳の入力欄をクリックし、**Alt+E** でEmoShelfを表示します。
3. 通常のBoard表示（編集・Composeモードではない状態）で絵文字をクリックして貼り付けます。キーボードなら矢印キーで選んで **Enter** です。クリックした時点で貼り付けるため、続けてEnterを押す必要はありません。コピーのみの設定や貼り付けがうまくいかない場合は、EmoShelfでコピーしてからメモ帳へ戻り **Ctrl+V** で貼り付けてください。クリップボードの内容は置き換わります。
4. **Alt+E** が反応しない場合は、タスクトレイのアイコンから開き、設定で他アプリと競合しないショートカットに変更します。アイコンが隠れている場合はタスクバーの **∧** を開きます。

ウィンドウの閉じるボタンは終了ではなくトレイへの格納です。完全に終了するには、トレイアイコンを右クリック → **Quit** を選びます。貼り付け先が管理者権限で動いているなどの理由で貼り付けできない場合も、EmoShelfを昇格させず手動コピーを利用してください。

#### 5. バックアップ・更新・アンインストール

このRCには本番用Updater公開鍵が設定されていないため、アプリ内更新は利用できません。更新時は設定のExportから **`.emoshelf` バックアップ** を保存し、アプリを終了して、公式Releasesの新しい版を確認してください。新しい配布物はそのReleaseのチェックサム・署名方針で確認し、RCのチェックサムを流用しないでください。

アンインストールはバックアップ後にトレイの **Quit** で終了し、Windowsの **設定 → アプリ → インストールされているアプリ → EmoShelf → アンインストール** から行います。保存データが必ず残るとは考えず、バックアップをアプリ外へ保管してください。

問題の報告先は[GitHub Issues](https://github.com/ELRdn/EmoShelf/issues)です。RCタグ、ファイル名、Windowsのバージョンとx64/ARM64、警告文を添えてください。スクリーンショットの個人情報は隠し、クリップボードの内容や個人のバックアップファイルは公開しないでください。

## Privacy and security

EmoShelf is local-first and does not include analytics. Optional app-aware Boards use only the foreground executable basename and monitor identifier; full paths and window titles are neither saved nor sent anywhere.

- [Privacy](./PRIVACY.md)
- [Security policy](./SECURITY.md)
- [Code-signing policy](./CODE_SIGNING_POLICY.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## Development

Requirements: Node.js 22+, pnpm 10+, stable Rust, WebView2, and the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
cd app
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm release:audit

cd src-tauri
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo check --locked
```

Run the desktop app with `pnpm tauri dev`. Real-window E2E uses WebDriverIO and `tauri-driver`; see [app/README.md](./app/README.md).

## Project guide

- [Design specification](./DESIGN.md)
- [Roadmap and acceptance status](./ROADMAP.md)
- [Contributor guide](./CONTRIBUTING.md)
- [v1.0 release notes](./RELEASE_NOTES.md)
- [Engineering handoff](./HANDOFF.md)

Publisher: **ELRdn + Contributors**. Support and product feedback are handled through [GitHub Issues](https://github.com/ELRdn/EmoShelf/issues).

## License

EmoShelf application code is licensed under [Apache License 2.0](./LICENSE). Emoji artwork and third-party components remain under their respective licenses.
