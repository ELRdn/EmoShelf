# EmoShelf Code-Signing Policy

EmoShelf publishes formal Windows releases only after automated source builds, independent verification, and manual release approval.

**Free code signing provided by SignPath.io, certificate by SignPath Foundation**

## Project identity

- Product: EmoShelf
- Publisher displayed by the application: `ELRdn + Contributors`
- Source and releases: <https://github.com/ELRdn/EmoShelf>
- Support: <https://github.com/ELRdn/EmoShelf/issues>
- Privacy statement: [PRIVACY.md](./PRIVACY.md)

## Roles

- Authors and reviewers: repository contributors and maintainers participating through GitHub pull requests.
- Release approver: the `ELRdn` repository owner or a later explicitly documented project maintainer.
- SignPath submitter: the GitHub Actions trusted-build integration, not a developer workstation.

MFA is required for GitHub and SignPath accounts involved in release approval.

## Signing order

1. Build the unbundled application on a GitHub-hosted native x64 or ARM64 Windows runner.
2. In isolated NSIS and MSI jobs, let Tauri embed the matching installer type into the unsigned executable.
3. Submit each type-specific application executable to SignPath and verify its Authenticode status.
4. Build the matching installer around that signed executable and require its SHA-256 to remain unchanged during bundling.
5. Submit the installer to SignPath and verify its Authenticode status.
6. Sign the final installer bytes with the separate Tauri updater key and verify those signatures independently.
7. Generate `latest.json` and SHA-256 checksums.
8. Exercise silent install, verify the installed executable's Authenticode signature, run a real Tauri WebDriver session, and uninstall.
9. Publish the immutable GitHub Release only after manual approval.

The type-specific pre-bundle is required because Tauri writes updater bundle metadata into the executable.
No workflow step may mutate application bytes after the application Authenticode signature is created.

All jobs leading to a SignPath request run on GitHub-hosted runners. The source policy in `.signpath/policies/emoshelf/release-signing.yml` rejects rerun-based signing.

## Key separation

The updater key and renderer-pack Ed25519 key are generated independently, password protected, and stored outside the repository in the maintainer's user profile and GitHub Secrets. Their public keys are compiled into formal release builds. Private key values, passwords, and sensitive signing logs must never be committed or printed.

Unsigned artifacts may be used only for development or a clearly labelled release candidate when SignPath requires public project history. They must never be presented as formal `v1.0.0` artifacts.
