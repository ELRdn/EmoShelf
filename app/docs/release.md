# v1.0 Release Runbook

The signed release workflow prepares an **unpublished draft** from `main` after the
repository is public and signing setup is complete. Qualify its actual bytes before
public promotion; do not rebuild an already qualified candidate.
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

## Candidate qualification before public promotion

The reliability refresh is **not yet qualified for public launch**. Use
[`release-qualification.md`](release-qualification.md) for the current evidence,
the app compatibility matrix and remaining blockers. Freeze one candidate, finish
the 30-click/30-Enter matrix and five business days, and run `pnpm release:readiness`
against its exact commit and installer. Review the recordings; a passing unit test
or an `input-sent` native result is not external editor acceptance.

- Record the original Windows display scale.
- Verify 125%, 150%, and 200%, then restore and record the original scale.
- Verify keyboard-only use, Narrator, large text, contrast, and Reduced Motion.
- Verify `Alt+E` with at least 30 warm samples and record frame/focus p95.
- Verify the complete Notepad, Edge, Chrome, Claude unsent-draft, Photoshop, Paint and Explorer matrix in the qualification record, plus Pinned focus restoration, Tray, Autostart, single instance, and multiple monitors.
- Verify motion on a 120/144Hz-or-higher display.
- Confirm clean worktree, no untracked build output, secret-history audit, and third-party licenses.
- Confirm SignPath approval and the `production-signing` environment reviewer.

## Dispatch

Run **Signed Windows release** from `main` with:

```text
version: 1.0.0
confirmation: RELEASE_v1.0.0
```

The workflow creates only a draft after x64/ARM64 Authenticode, updater signatures,
renderer signatures, silent install, real-window E2E and uninstall gates pass.
Installed-app E2E uses the external Tauri driver; production binaries never contain
the embedded automation plugin. This workflow change still needs a signed CI run.

## Promote the same qualified bytes

1. Download the draft's exact installers and `SHA256SUMS.txt` using authenticated GitHub access.
2. Record its source commit, each installer hash, OS/app versions and all acceptance
   evidence outside tracked source. Finish the full matrix and five business days.
3. Run `pnpm release:readiness <evidence.json> <commit> <installer>` for each released
   installer. The report must name that installer's hash; review actual signatures,
   recordings and dates as well as the completeness result.
4. Attach the reviewed evidence to the draft. Obtain explicit publication approval.
5. Promote without rebuilding or replacing any asset:

```powershell
gh release edit v1.0.0 --draft=false --latest
```

Then verify the public `releases/latest/download/latest.json` endpoint, both platform
URLs/signatures, and a download/update from the supported RC. Do not start ads until
those checks pass. If the candidate changes, repeat affected checks and restart its
five-day qualification; keep the new candidate a draft.
