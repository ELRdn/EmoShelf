# EmoShelf v1.2.0

Emoji are now easier to see, and your shelf is easier to arrange.

## What's new

- **Emoji size**: choose **Small**, **Medium**, or **Large** in **Settings → Emoji size**. The default is Medium,
  which is larger than before. Small matches the v1.1.0 layout. The setting applies to your shelves, the All list,
  and the first-run emoji picker.
- **Press and hold to reorder**: on your own shelves, press and hold an emoji for a moment, then drag it to a new
  spot. A normal click still pastes right away. Keyboard reordering and removal remain in **Edit shelf**.

## Download

| Your PC | Installer |
| --- | --- |
| Windows 11 x64 (most PCs) | `EmoShelf_1.2.0_windows-x86_64_UNSIGNED-setup.exe` |
| Windows 11 ARM64 | `EmoShelf_1.2.0_windows-aarch64_UNSIGNED-setup.exe` |

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

These are the same packs as v1.1.0. Packs you already installed keep working after the update.
To add one, open **Settings → Additional emoji styles → Install pack**, choose the file, then pick the style in
**Settings → Emoji appearance**. Emoji that a style does not cover fall back to Twemoji.

## Updating

Updates are manual. Export a backup from Settings, then install the new version over the existing one.
Upgrading from v1.0.0 or v1.1.0 keeps your shelf data. Existing installs switch to the new Medium size; choose Small
in Settings to keep the previous look.

## Known boundaries

- EmoShelf is Windows 11 only. Cloud sync, accounts, and social features are out of scope.
- Style pack artwork remains subject to its own license and attribution, shown in Settings.

Every installer was installed and uninstalled in CI before this release was created. The x64 installers passed the full
desktop test suite, including installing, rendering, and removing all three style packs; the ARM64 installers were checked
to launch and render the shelf.
