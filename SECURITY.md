# Security Policy

## Supported version

Security fixes target the latest published stable release, including unsigned releases under our distribution policy. Until a stable release is published, reports for the current public RC are also accepted. CI artifacts are not supported distributions.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting / Security Advisory flow for this repository. If that option is unavailable, open a minimal [GitHub Issue](https://github.com/ELRdn/EmoShelf/issues) asking for a private contact channel without publishing exploit details, secrets, or affected user data.

Do not report a vulnerability in a public issue with reproduction secrets or a working exploit.

Include the affected version, Windows architecture, impact, reproduction conditions, and any suggested mitigation. Maintainers will acknowledge a complete report as soon as practical and coordinate disclosure after a fix is available.

## Trust boundaries

- Official Windows installers are explicitly unsigned and published only on the project GitHub Releases with SHA-256 checksums. Windows cannot verify the publisher through a certificate. See [the distribution policy](./CODE_SIGNING_POLICY.md).
- Current builds use manual updates. Any future automatic updater must pass Tauri's separate update-signature verification; unsigned distribution does not relax that boundary.
- Renderer packs use a distinct Ed25519 key and are rejected when signatures, hashes, paths, licenses, or compatibility metadata are invalid.
- The repository never stores private signing keys or passwords.
