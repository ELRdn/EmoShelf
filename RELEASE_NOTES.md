# EmoShelf v1.0.0

The first stable release of EmoShelf, a local-first Personal Emoji Shelf for Windows 11.
Press **Alt + E**, pick from your own Boards, and paste straight back into the app you were using.

## Download

| Your PC | Installer |
| --- | --- |
| Windows 11 x64 (most PCs) | `EmoShelf_1.0.0_windows-x86_64_UNSIGNED-setup.exe` |
| Windows 11 ARM64 | `EmoShelf_1.0.0_windows-aarch64_UNSIGNED-setup.exe` |

MSI packages are also provided for managed installs. These installers are **not code-signed**, so Windows may show an
"unknown publisher" warning. Download only from this page and verify the file against `SHA256SUMS.txt`
before installing. See the [installation guide](https://github.com/ELRdn/EmoShelf#install)
([日本語](https://github.com/ELRdn/EmoShelf/blob/main/README.jp.md#インストール)).

## Highlights

- Reach personal Boards instantly with the global shortcut (Alt + E).
- Search 1,949 emoji in English or Japanese.
- Paste one item, compose a sequence, or keep EmoShelf pinned.
- Use bundled Twemoji or OS-native emoji.
- Import custom PNG, WebP, and safely normalized SVG assets.
- Export and restore `.emoshelf` backups with preview, merge, and replace protection.
- Map Boards to an application without storing full executable paths or window titles.
- Keyboard navigation, visible focus, Reduced Motion, and high-contrast support.
- Japanese and English UI. No account, no cloud sync, no analytics — your shelf stays on your PC.

## Changes since RC 1

- Alt+E always brings the shelf forward from hidden, background, or minimized states; Escape/close dismiss it.
- Verified target focus before pasting, with an explicit copy fallback when direct input is not possible.
- Pinned keeps the shelf open while returning focus to your app.
- Permanent leftmost **All** tab with search/category reset that leaves your personal Boards unchanged.
- Centered OS-native emoji and clear labels for unavailable style packs.
- Serialized, flushed saves; quitting waits for persistence.
- Render recovery screen, catalog retry, accessible contrast and localized labels.
- Settings Escape no longer also hides the shelf; manual updates link directly to official releases.

## Updating

Updates are manual. Export a backup from Settings, then install the new version over the existing one.
Upgrading from RC 1 keeps your shelf data. Existing schema-v1 data is migrated once to schema v2.

## Known boundaries

- Additional emoji styles (Fluent, Noto, OpenMoji) are planned as separately signed packs and are not included yet.
- Changing the emoji style changes EmoShelf previews; pasted Unicode uses the receiving app's font.
- EmoShelf is Windows 11 only. Cloud sync, accounts, and social features are out of scope.
- Renderer artwork remains subject to its own license and attribution.

Each installer was installed, tested and uninstalled in CI before this release was created.
