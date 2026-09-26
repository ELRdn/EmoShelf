# EmoShelf v1.0.0

Unreleased development snapshot, September 22, 2026. v1.0.0 is undergoing qualification for the first stable Windows
release of the local-first Personal Emoji Shelf. See
[release qualification](app/docs/release-qualification.md) before publishing.

## Reliability refresh

- Foreground-aware Alt+E, verified target focus and explicit copy fallback.
- Repeated Alt+E always brings the shelf forward; Escape/close dismiss it.
- Pinned keeps the shelf open while returning focus and releasing its topmost position.
- Consistent text/image insertion outcomes, IME guards and pending-action protection.
- Optional details, keyboard navigation and an unsaved practice editor.
- Serialized, flushed saves; Quit and update installation wait for persistence.
- Desktop regression coverage and an unsigned draft qualification workflow.
- Permanent leftmost All tab with search/category reset and unchanged personal Boards.
- Centered OS-native emoji and clear labels for missing or disabled style packs.

## Highlights

- Reach personal Boards instantly with the global shortcut.
- Search 1,949 emoji in English or Japanese.
- Paste one item, compose a sequence, or keep EmoShelf pinned.
- Use bundled Twemoji or OS-native emoji. Optional Fluent, Noto and OpenMoji delivery is planned as signed packs.
- Import custom PNG, WebP, and safely normalized SVG assets.
- Export and restore `.emoshelf` backups with preview, merge, and replace protection.
- Map Boards to an application without storing full executable paths or window titles.
- Use keyboard navigation, visible focus, Reduced Motion, and high-contrast support.
- Update manually after exporting a backup; automatic updating remains disabled without trusted verification keys.

## September 26 launch polish

- Japanese/English download guidance, localized share URLs and social image, improved mobile text and touch targets.
- Accessible contrast, localized saved-shelf labels, catalog retry and render recovery.
- Settings Escape no longer also hides the shelf; manual updates link directly to official releases.
- Failed E2E builds stop before testing stale binaries; installed production binaries use ordinary WebDriver without a test plugin.
- Unsigned draft workflow reuses exact successful CI artifacts and verifies installation, E2E, uninstallation and checksums.

## Distribution

The published release remains unsigned `v1.0.0-rc.1`. These reliability/UI changes
are present only in the development source and local candidates, not that installer.

The planned stable release will contain explicitly labelled **unsigned** x64 and
ARM64 NSIS/MSI installers and SHA-256 checksums. Updates are manual; no updater feed
is published by this workflow. Optional emoji styles still require independently
verified signed packs. Pack publication and the
in-app preview/download/install flow remain outstanding; local-file pack import
requires a build configured with the matching trusted verification key.

Verify downloaded files against `SHA256SUMS.txt`. EmoShelf does not currently receive SignPath signing. Only assets published in the official GitHub Release are distribution releases; local candidates and CI artifacts remain test outputs.

## Compatibility

- Windows 11 x64: local smoke coverage; full compatibility qualification pending.
- Windows 11 ARM64: build target; current candidate has not been accepted on ARM64 hardware.
- Existing schema-v1 data is migrated once to schema v2.
- Existing schema-v2 data and unknown fields are preserved.

## Known boundaries

- Local checks: frontend 84, tooling 7, Rust 71, desktop E2E 10; see the qualification
  record for which artifact each result applies to. Full external-app repetitions,
  physical keyboard/DPI/accessibility, performance and five-day qualification remain open.
- Changing emoji style changes EmoShelf previews; pasted Unicode uses the receiving app's font.
- EmoShelf remains Windows-first.
- Cloud sync, accounts, social features, AI features, nested folders, and Compact Quick View are outside v1.0.
- Renderer artwork remains subject to its own license and attribution.
