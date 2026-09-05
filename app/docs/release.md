# v1.0 Release Runbook

The signed release workflow is intentionally fail-closed. It must run from `main` after the repository is public and every manual acceptance item has evidence.
The exact commit selected for release must also have a successful `CI` push run; a prior commit's result is not accepted.

## External setup

1. Enable MFA on GitHub and SignPath.
2. Make the repository public only after the history, secret, generated-output, and license audit is accepted.
3. Apply to SignPath Foundation and connect the GitHub App.
4. Create SignPath project `emoshelf`, policy `release-signing`, and ZIP-root artifact configurations:
   - `windows-executable`
   - `windows-installers`
5. Create a protected GitHub environment named `production-signing` with the release approver.
6. Add repository variable `SIGNPATH_ORGANIZATION_ID`.
7. Add secrets:
   - `SIGNPATH_API_TOKEN`
   - `EMOSHELF_UPDATER_PRIVATE_KEY`
   - `EMOSHELF_UPDATER_PRIVATE_KEY_PASSWORD`
   - `EMOSHELF_UPDATER_PUBLIC_KEY`
   - `EMOSHELF_RENDERER_PRIVATE_KEY`
   - `EMOSHELF_RENDERER_PRIVATE_KEY_PASSWORD`
   - `EMOSHELF_RENDERER_PUBLIC_KEY_BASE64`

The updater and renderer key pairs must be generated independently. Keep encrypted private-key backups in the maintainer's user profile; never add them to the repository.

The Windows build matrix isolates NSIS and MSI. Tauri writes updater bundle metadata into the unsigned
application before SignPath signs it; the final bundle step then verifies that the signed executable's
SHA-256 is unchanged. The installed executable's Authenticode status is checked again after silent install.

## Manual acceptance before dispatch

- Record the original Windows display scale.
- Verify 125%, 150%, and 200%, then restore and record the original scale.
- Verify keyboard-only use, Narrator, large text, contrast, and Reduced Motion.
- Verify `Alt+E` with at least ten warm samples and record p95.
- Verify paste into Notepad and Edge, image copy into Paint, external image drag, Pinned focus restoration, Tray, Autostart, single instance, and multiple monitors.
- Verify motion on a 120/144Hz-or-higher display.
- Confirm clean worktree, no untracked build output, secret-history audit, and third-party licenses.
- Confirm SignPath approval and the `production-signing` environment reviewer.

## Dispatch

Run **Signed Windows release** from `main` with:

```text
version: 1.0.0
confirmation: RELEASE_v1.0.0
```

The workflow creates no release until x64/ARM64 Authenticode, updater signatures, renderer signatures, silent install, real-window E2E, and uninstall gates all pass.
