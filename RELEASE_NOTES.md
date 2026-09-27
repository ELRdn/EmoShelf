# EmoShelf v1.1.0

EmoShelf now supports three more emoji styles: **Fluent**, **Noto**, and **OpenMoji**.
They ship as separately signed style packs, so the app stays small and you install only the styles you want.

## Download

| Your PC | Installer |
| --- | --- |
| Windows 11 x64 (most PCs) | `EmoShelf_1.1.0_windows-x86_64_UNSIGNED-setup.exe` |
| Windows 11 ARM64 | `EmoShelf_1.1.0_windows-aarch64_UNSIGNED-setup.exe` |

MSI packages are also provided for managed installs. These installers are **not code-signed**, so Windows may show an
"unknown publisher" warning. Download only from this page and verify the file against `SHA256SUMS.txt`
before installing. See the [installation guide](https://github.com/ELRdn/EmoShelf#install)
([日本語](https://github.com/ELRdn/EmoShelf/blob/main/README.jp.md#インストール)).

## Emoji style packs

| Style | File | License |
| --- | --- | --- |
| Fluent Emoji Color (Microsoft) | `EmoShelf-fluent-1.0.0.emoshelf-renderer` | MIT |
| Noto Color Emoji (Google) | `EmoShelf-noto-1.0.0.emoshelf-renderer` | Apache-2.0 |
| OpenMoji Color (HfG Schwäbisch Gmünd) | `EmoShelf-openmoji-1.0.0.emoshelf-renderer` | CC BY-SA 4.0 |

1. Install EmoShelf v1.1.0 or later. v1.0.0 cannot install packs.
2. Download the packs you want from this page.
3. Open **Settings → Additional emoji styles → Install pack** and choose the file.
4. Pick the style in **Settings → Emoji appearance**.

Each pack is built from a pinned commit of the official artwork and signed with an EmoShelf key. The app checks the signature,
every file's hash, and the SVG content before installing, and again when it loads the pack. Emoji that a style does not cover
fall back to Twemoji. The style changes what you see in EmoShelf; pasted text still uses the receiving app's emoji font.

## Other changes

- Settings links to the official release page for style packs.

## Updating

Updates are manual. Export a backup from Settings, then install the new version over the existing one.
Upgrading from v1.0.0 keeps your shelf data.

## Known boundaries

- EmoShelf is Windows 11 only. Cloud sync, accounts, and social features are out of scope.
- Style pack artwork remains subject to its own license and attribution, shown in Settings.

Every installer was installed and uninstalled in CI before this release was created. The x64 installers passed the full
desktop test suite, including installing, rendering, and removing all three style packs; the ARM64 installers were checked
to launch and render the shelf.
