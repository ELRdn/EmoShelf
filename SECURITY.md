# Security Policy

## Supported version

Security fixes target the latest signed stable release. Pre-release and unsigned CI artifacts are not supported distributions.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting / Security Advisory flow for this repository. If that option is unavailable, open a minimal [GitHub Issue](https://github.com/ELRdn/EmoShelf/issues) asking for a private contact channel without publishing exploit details, secrets, or affected user data.

Do not report a vulnerability in a public issue with reproduction secrets or a working exploit.

Include the affected version, Windows architecture, impact, reproduction conditions, and any suggested mitigation. Maintainers will acknowledge a complete report as soon as practical and coordinate disclosure after a fix is available.

## Trust boundaries

- Official Windows artifacts must have a valid Authenticode signature issued through SignPath Foundation.
- Updater artifacts must also pass Tauri's separate update-signature verification.
- Renderer packs use a distinct Ed25519 key and are rejected when signatures, hashes, paths, licenses, or compatibility metadata are invalid.
- The repository never stores private signing keys or passwords.
