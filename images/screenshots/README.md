# Product screenshots

| File | UI language | Size |
| --- | --- | --- |
| [emoshelf-en.png](emoshelf-en.png) | English | 1762 × 1322 |
| [emoshelf-ja.png](emoshelf-ja.png) | Japanese | 1762 × 1322 |

Captured on Windows on September 22, 2026, from the actual local development app:
All catalog, dark theme, OS-native emoji, and a public sample shelf. Each README
uses its matching language; the landing page follows its language selector.

These are original window captures saved losslessly as PNG. The app rendered at
2× device scale; the images were not enlarged or reconstructed from the previous
803 × 603 JPEG. They show development UI, not the published RC 1 or a qualified
stable release. See the [qualification record](../../app/docs/release-qualification.md).

## Capture provenance

- Source: `2149b257056d2016a844f16de0271320020bd336` plus the English All grid-width
  fix committed alongside these images (`app/src/App.css`).
- Normal x64 build without WebDriver, using a temporary Tauri configuration with
  identifier `com.emoshelf.screenshots20260922`, a 1760 × 1320 window, and WebView
  arguments `--force-device-scale-factor=2`. Windows adds the captured border.
- Separate sample profile with locale `en` / `ja`; personal shelves and settings
  were not used for the images or changed for capture.
- Capture executable SHA-256:
  `4a117e09850cde54db8a99de7169a4d6b102f20fc6e4e4833654b83d82b45d2f`.
- Local build/config/logs remain under ignored `app/logs/readme-capture-20260922/`.

To refresh, build the current app with the same isolated profile and display
settings, open All in each language, move the pointer outside the window, and
save a native window capture as PNG without resizing or JPEG conversion. Inspect
both images for clipped controls, overlays, private data, and correct language.

`emoshelf-v1-shelf.png` is retained as an older screenshot; it is not the current
README or landing-page preview.
