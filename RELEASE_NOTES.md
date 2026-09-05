# EmoShelf v1.0.0

EmoShelf v1.0.0 is the first stable Windows release of the local-first Personal Emoji Shelf.

## Highlights

- Reach personal Boards instantly with the global shortcut.
- Search 1,949 emoji in English or Japanese.
- Paste one item, compose a sequence, or keep EmoShelf pinned.
- Use Twemoji, native emoji, or separately signed Fluent, Noto, and OpenMoji renderer packs.
- Import custom PNG, WebP, and safely normalized SVG assets.
- Export and restore `.emoshelf` backups with preview, merge, and replace protection.
- Map Boards to an application without storing full executable paths or window titles.
- Use keyboard navigation, visible focus, Reduced Motion, and high-contrast support.
- Receive updates only after explicit consent and signature verification.

## Distribution

The release contains Authenticode-signed x64 and ARM64 NSIS/MSI installers, Tauri updater signatures, `latest.json`, renderer packs, and SHA-256 checksums.

Verify downloaded files against `SHA256SUMS.txt`. Formal artifacts are signed through SignPath Foundation; unsigned CI artifacts are not official releases.

## Compatibility

- Windows 11 x64
- Windows 11 ARM64
- Existing schema-v1 data is migrated once to schema v2.
- Existing schema-v2 data and unknown fields are preserved.

## Known boundaries

- EmoShelf remains Windows-first.
- Cloud sync, accounts, social features, AI features, nested folders, and Compact Quick View are outside v1.0.
- Renderer artwork remains subject to its own license and attribution.
