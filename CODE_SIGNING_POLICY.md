# EmoShelf Distribution and Code-Signing Policy

EmoShelf distributes Windows installers **without Authenticode code signing**.
This applies to planned stable releases as well as release candidates. The project
does not currently receive code signing from SignPath. Signing is a possible future
improvement, not a condition for the current distribution plan.

## Official source

- Product: EmoShelf
- Application publisher label: `ELRdn + Contributors` (not a verified certificate identity)
- Source and releases: <https://github.com/ELRdn/EmoShelf>
- Support: <https://github.com/ELRdn/EmoShelf/issues>
- Privacy: [PRIVACY.md](./PRIVACY.md)

Download from the project's GitHub Releases. Official unsigned installers use
`UNSIGNED` in their filenames and include `SHA256SUMS.txt`. Windows may show an
unknown-publisher or SmartScreen warning. A matching hash verifies that the file
matches the published checksum; it does not authenticate the publisher or guarantee
safety. Keep Windows protection enabled and follow the [installation guide](./README.md#install).
Managed devices may prohibit unsigned apps.

## Release controls

1. Select an exact reviewed `main` commit with successful CI and secret/license audits.
2. Reuse x64 and ARM64 installers built by that CI run on native Windows runners.
3. Verify unsigned status and SHA-256 of the actual application and distribution files.
4. Test installation, real application operation and uninstallation for each installer.
5. Prepare an unpublished draft with release notes, checksums and build provenance.
6. Review qualification evidence for those exact files and obtain publication approval.
7. Publish the qualified bytes without rebuilding or replacing them.

The `ELRdn` repository owner or a documented maintainer approves publication.
Release accounts must use MFA. Workflow artifacts and local candidates are not
published releases. See [the release runbook](./app/docs/release.md).

## Updates and optional renderer packs

Current unsigned builds use **manual updates**. Export a `.emoshelf` backup, quit
EmoShelf, and install the newer official release after verifying its checksum.
The unsigned workflow does not publish a `latest.json` feed.

Authenticode, Tauri updater signatures, and renderer-pack signatures are separate
mechanisms. Choosing unsigned installers does not disable updater or pack signature
verification. Automatic updates and optional packs stay unavailable until their
independent trusted keys and distribution flows are configured and tested. Twemoji
is bundled; Native uses the operating system. Never commit private keys.

## Optional future signing

The existing signed workflow and `.signpath` policies remain available for future
use. They require their own secrets, approval and validation and are not the current
release path. No SignPath sponsorship or approval is claimed.
