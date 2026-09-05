# Contributing to EmoShelf

Thanks for helping make frequently used emojis easier to reach.

## Before opening a change

1. Search [existing issues](https://github.com/ELRdn/EmoShelf/issues).
2. Keep the proposal inside EmoShelf's focused scope: open Shelf, reach an item, paste.
3. For behavior or visual changes, describe the user problem and include before/after evidence.
4. Do not add telemetry, cloud requirements, third-party artwork, or broad UI frameworks without prior agreement.

Security vulnerabilities must follow [SECURITY.md](./SECURITY.md), not a public issue.

## Local checks

```powershell
cd app
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm release:audit

cd src-tauri
cargo fmt --check
cargo clippy --locked -- -D warnings
cargo test --locked
cargo check --locked
```

For changes to Windows integration, also build the applicable installer with either
`pnpm tauri build --bundles nsis --ci` or `pnpm tauri build --bundles msi --ci`.
CI tests both types in isolated jobs. Real-window E2E instructions are in [app/README.md](./app/README.md).

## Pull requests

- Make one cohesive change per PR.
- Add or update tests for observable behavior.
- Preserve schema-v1 migration and schema-v2 unknown fields.
- Keep the existing Tauri command names backward compatible.
- Do not commit `node_modules`, `dist`, Rust `target`, credentials, signing keys, local state, or unsigned release artifacts.
- Update ROADMAP and HANDOFF only for work that was actually accepted.

Contributions are submitted under the repository's Apache-2.0 license.
