# v1.0 Release Runbook

The current distribution plan is **unsigned Windows installers with manual updates**.
Code signing is not a release blocker. Quality and artifact verification remain
required. See [the distribution policy](../../CODE_SIGNING_POLICY.md).

## Prepare the exact candidate

1. Review the source, secret history, licenses and [qualification record](release-qualification.md).
2. Freeze a clean commit on `main`. Require a successful `CI` push run for that exact
   commit, including native x64/ARM64 E2E and NSIS/MSI packaging.
3. Run **Unsigned Windows release** (`release-unsigned.yml`) from that commit:
   `version: 1.0.0`, `confirmation: UNSIGNED_v1.0.0`.
4. The workflow downloads installers from that exact CI run, verifies `NotSigned`,
   installs each in an isolated runner, runs real-window E2E against the installed
   executable, and uninstalls it. It renames files with `UNSIGNED`, records their
   SHA-256 and provenance, then creates an **unpublished draft**.
5. Download and qualify the draft's exact bytes. Do not rebuild after qualification.

The workflow needs the standard GitHub token, no SignPath or private signing keys.
Its new path still needs a successful GitHub Actions run; local YAML validation
does not prove installer qualification. Current published RC 1 does not contain
the latest source changes.

## Qualification before public promotion

Use `release-qualification.md` for the complete compatibility matrix. Record the
exact source commit, installer hash, build date, OS/app versions and reviewer outside
tracked source. Include:

- 30 click and 30 Enter insertion trials per supported external text target.
- Pinned focus restoration, tray/reopen, backups, persistence and recovery.
- Installation, manual upgrade from RC with backup, and uninstallation.
- Narrator, keyboard/IME, 125/150/200% display scales and multiple monitors.
- At least 30 warm reveal/search samples; frame/focus p95 <=300 ms and search p95 <=100 ms.
- Five distinct business days on the frozen candidate without core regressions.

Use `distributionMode: "unsigned"`, `updateMode: "manual"` in the evidence.
Both architecture distribution checks record `authenticode: "NotSigned"` and
`checksumMatches: true` after actual verification. These values describe
distribution, not safety guarantees.

Run `pnpm release:readiness <evidence.json> <commit> <installer>` for each installer.
Review recordings and dates as well as the tool result. Missing evidence fails.
A native `input-sent` result alone is not proof of insertion into the external editor.

## Promote and connect the landing page

1. Attach reviewed evidence and obtain explicit publication approval.
2. Promote the existing draft without rebuilding or replacing assets:
   `gh release edit v1.0.0 --draft=false --latest`.
3. Independently download each public file, match `SHA256SUMS.txt`, and verify the
   manual upgrade path from RC 1. No unsigned updater feed is published.
4. Update `lp/src/config.ts` and the Japanese/English download copy to the verified
   public release. Update screenshots if the candidate differs.
5. Remove the development-preview `noindex, nofollow` and update its assertion in
   `tools/lp-audit.mjs` only when the matching public release and copy are ready.
   Run the LP build/audit and browser checks, then deploy after approval.
6. Recheck live download links, mobile layout and manual-update instructions before ads.

Current local polish is not a five-day qualification or a public release. If the
candidate changes, rerun affected checks and restart its stability record.

## Optional future signed release

`release.yml` retains the SignPath workflow for future use. It requires SignPath
approval, the `production-signing` environment, and the secrets/variables named in
its preflight. Updater and renderer keys must be separate and independently verified.
Unsigned distribution never authorizes disabling their cryptographic checks.
