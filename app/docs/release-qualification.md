# Release qualification — reliability refresh

Status: **NOT READY FOR PUBLIC LAUNCH**. Implementation, automated checks, desktop
smoke tests and formal release acceptance are separate milestones.

## What changed

- Alt+E always reveals the shelf, including when it is already foreground. Escape
  and the close button dismiss it. The 2026-09-22 follow-up replaces the former toggle.
- Restore/show/raise/focus run in order on the owning UI thread. Native foreground,
  visibility and minimized state are checked before acknowledging a reveal. The shelf
  is temporarily topmost while selecting; deactivation releases it without activation,
  including when Pinned keeps the shelf visible after pasting.
- Text, compositions and images share bounded target validation and input delivery.
  Windows focus must settle in a control before scan-code Ctrl+V is sent. Held
  modifiers/Enter, closed targets, changed focus and overlapping insertions are refused.
  Clipboard sequence changes cancel automatic delivery; manual copy recovery never
  retries a possibly submitted input batch.
- IPC distinguishes `input-sent`, `copied` and `failed`. `input-sent` means Windows
  accepted the batch, not that an arbitrary third-party editor inserted it.
- Copy fallback stays visible with Ctrl+V instructions. Copy-only mode remains explicit.
- Details are optional; while inspecting details, clicks select without pasting.
  Enter pastes. Search supports arrows/Enter, Ctrl+Enter adds to the shelf, IME
  confirmation and key repeats do not trigger insertion. Editing never pastes.
- A permanent leftmost All tab opens the complete emoji catalog and resets search
  and category filters. Only the current view is highlighted. All is navigation,
  not a stored board; personal board ordering, defaults and Ctrl+1–9 stay unchanged.
  Board rename/delete actions are unavailable while viewing All.
- Help offers an ephemeral local practice editor. It does not prove OS integration.
- Focused settings/help buttons keep their own Enter action. Shelf editing does not
  paste search results; keyboard focus follows tile navigation.
- Saves are serialized; Quit waits for the last save and update installation flushes
  state first. Failed saves keep the app open. Atomic primary/backup writes are flushed;
  saving after corrupt-primary recovery preserves the valid backup.
- Reveal diagnostics wait for a frontend frame acknowledgement and focus. Search
  diagnostics include a rendering opportunity, rather than only filtering time.
  These are timing proxies; actual display/input acceptance still needs measurement.

## Evidence captured in this work

Paths under `logs/` below refer to local, ignored evidence in `app/logs/`; they are
not shipped or committed. A source commit/push does not qualify or re-label those
earlier binaries as a frozen release candidate.

The September 22 distribution decision keeps Twemoji bundled and Native available
from the OS. Fluent Emoji, Noto Emoji and OpenMoji are planned as optional signed
GitHub Releases packs with future in-app preview/download/install/update controls.
Only local pack import exists today; production keys, published packs and that
download flow remain pending. See [renderer pack delivery](renderer-packs.md).

Before the documentation/source checkpoint was pushed, `pnpm check` was rerun:
84 frontend and 7 tooling tests passed, with TypeScript and Biome checks passing
(24 existing style warnings). `pnpm lp:build` passed with the September 22 All/Native
screenshot. Logs: `logs/pre-push-check-20260922.log`, `logs/pre-push-lp-20260922.log`.
The earlier Rust and desktop E2E results below were retained; those implementations
were not changed by this documentation update.

### Localized high-resolution screenshots and English layout (2026-09-22)

- Replaced the 803×603 JPEG preview with separate English and Japanese 1762×1322
  PNG captures of the real app. README and LP use the matching UI language.
  See [capture provenance](../../images/screenshots/README.md).
- Capturing English All exposed an implicit grid column growing to its content
  width and clipping right-side controls. An explicit `minmax(0, 1fr)` column
  keeps the shell within the viewport.
- `pnpm test:e2e`: all 11 scenarios passed, including English All at 880px and
  480px window widths. As with the Native geometry test, locale setup dispatches
  the real select change handler; this is not physical OS dropdown acceptance.
- The normal x64 capture build (no WebDriver) passed. Both locale screenshots
  were visually inspected at original resolution. A separate public sample
  profile was used; the user's installed binary and data were not replaced.
- `pnpm lp:build` passed. Browser checks confirmed both language buttons load
  the corresponding 1762×1322 PNG and preserve its aspect ratio when displayed
  at 593×445. All 40 local links/images in the affected README/provenance records
  resolve; changed-file Biome checks passed with existing style warnings.
- Logs: `logs/readme-capture-20260922/build-fixed.log`,
  `logs/readme-capture-20260922/e2e.log`,
  `logs/readme-capture-20260922/format-final.log`,
  `logs/readme-capture-20260922/lp-build.log`.
- Earlier frontend/tooling/Rust results are retained. This CSS change and the
  screenshot build do not establish new external-app or release acceptance.

### Native emoji alignment and style availability (2026-09-22)

- Reproduced with the installed Native setting. The fallback glyph advance was
  46.69px inside a 38px catalog slot, 52.19px inside a 42px shelf slot, and 64.55px
  inside a 52px detail slot. Overflowing text started at the left edge instead of
  being centered, shifting the text box right by 3.16–6.27px across four sizes.
- Native artwork now uses flex centering and an explicit OS emoji font stack.
  The production component fixture (`tools/fixtures/emoji-alignment.html`, served
  by `pnpm dev`) measured 20 samples at four sizes: maximum horizontal text-box
  offset 0.0078125px, vertical offset 0.5px. This measures text boxes, not identical
  optical bounds for every emoji. The before/after Windows screenshots were inspected.
- Missing/disabled packs are labeled in settings. The helper explains that the
  selected style affects EmoShelf, while pasted text uses the destination app's style.
  Verified the published `v1.0.0-rc.1` asset list: installers and checksums only,
  no `.emoshelf-renderer` packages. The three extra styles are not delivered yet.
- Frontend 84 and tooling 7 tests passed; final changed-file Biome checks have only
  the prior CSS specificity warning. Desktop E2E 10 scenarios passed, including a
  horizontal native alignment regression. Its setup dispatches the real select
  change handler because the embedded driver's option click does not do so; this
  is geometry coverage, not physical OS dropdown acceptance. Earlier test attempts
  exposed that driver limitation and a stale modal handle, not acceptance passes.
- Logs: `logs/native-emoji-check-20260922.log`,
  `logs/native-emoji-e2e-geometry-20260922.log`,
  `logs/native-emoji-format-final-20260922.log`.
- Normal x64 binary (no WebDriver) installed locally with SHA-256
  `9cacd0a66be16d1d2e978ed42cc4b00c68c9b381838541c7489d631b49039921`.
  Inspected centered Native emoji in My Shelf and All, then opened the real OS
  select popup and confirmed the three missing-pack labels. The state file hash
  is unchanged and the user's Native preference remains selected. Artifact,
  source hashes and previous binary/data backup: `logs/native-emoji-20260922/`.
  This remains an unsigned local candidate, without new external insertion claims.

### All catalog tab (2026-09-22)

- `pnpm check`: 82 frontend and 7 tooling tests passed; TypeScript and Biome
  passed with 24 existing style warnings. Added keyboard activation, filter reset,
  mode switching, board action exclusion and unchanged saved board/settings checks.
- `pnpm test:e2e`: 9 desktop scenarios passed, including All navigation, restored
  personal shelf selection, 480×320 layout, native storage and repeated reveal.
- Logs: `logs/all-shelf-check-20260922.log`, `logs/all-shelf-e2e-20260922.log`.
  Native implementation is unchanged from the repeated Alt+E follow-up below.
  Its earlier physical insertion samples apply to that earlier executable hash;
  they do not constitute full release acceptance of the All build.
- Built the normal x64 binary without WebDriver and replaced the installed
  `AppData/Local/EmoShelf/emoshelf.exe`. SHA-256:
  `df27ad895d92c0b7d67bebc11393f215f96f10328976620f9d8704333468fc53`.
  Installed UI inspection confirmed All opens 1,949 emoji, My Shelf still shows
  its eight items, and Alt+E reveals All with search focus. The state file hash
  is unchanged. Artifact, source hashes and backup are in `logs/all-shelf-20260922/`.
- Physical Ctrl+1 through the desktop helper did not visibly switch views in this
  session. Component shortcut coverage passed and clicking My Shelf worked;
  physical keyboard acceptance remains pending. No external insertion acceptance
  is claimed for this new binary. It remains unsigned.

### Repeated Alt+E follow-up (2026-09-22)

- The normally launched installed executable was still the baseline hash below;
  the 2026-09-21 isolated candidate had not replaced it.
- Replaced toggle with idempotent reveal, serialized show/restore/raise/focus on
  the window thread, verified native foreground state, and removed the redundant
  key-release latch (Windows registration already uses `MOD_NOREPEAT`).
- Temporary topmost state is released by a posted window message after deactivation,
  with a foreground recheck. No z-order mutation is performed inside `WM_ACTIVATE`;
  doing so risks reentry into Tao while its window-state lock is held.
- Manual follow-up uncovered missing frontend permissions for minimize, hide,
  maximize and titlebar dragging. Added only these window permissions. E2E now
  consumes the same production capability and uses the same undecorated window.
- Regression red evidence: `activation-e2e-permissions-red-20260922.log` reports
  7 passing, 1 failing, specifically “The minimize button did not minimize the
  native window”. This reproduces the permission failure, not a proven deadlock.
- The new E2E invokes the real shared reveal path through a `wdio`-only command;
  the command is absent in shipping builds. It checks native minimize/hide state
  and repeated reopening over three cycles. It cannot prove physical hotkey focus:
  Windows can reject foreground activation from embedded IPC without user input.
- Activation unit tests model state transitions and denial cleanup. Their 30-loop
  model test is **not** 30 real external-app paste samples.
- Reveal restores DOM focus to the selected shelf tile (or the first tile), so
  Enter does not operate a previously focused minimize button. Tile focus selects
  without inserting. Text/IME editing and open dialogs retain their focus, and a
  delayed frame cannot reclaim focus after Pinned insertion. An empty shelf can
  fall back to search. Focusing a populated shelf does not open the full catalog.
- Frontend regression red evidence: the lifecycle tests failed with focus left
  on the minimize button. Updated lifecycle and App tests cover focus restoration,
  preserving the shelf view, and Ctrl+Enter of the focused tile without a click.
- Rejected intermediate builds: Pinned initially left the shelf above the editor;
  another run reported input-sent but the Notepad document stayed empty (manual
  Ctrl+V worked and is excluded from acceptance counts). The final implementation
  releases topmost to the bottom of the z-order and awaits that UI-thread operation
  before restoring the editor. A queued release does nothing once topmost is clear.
  This prevents a late z-order change during input delivery; the failed build is
  not counted as accepted. See Microsoft's [SetWindowPos contract](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos).
- Final installed x64 executable: SHA-256
  `98817b2d70d4a6db5408d1d867147851e393b59981d68c4ac008388c9a4530a1`.
  Normal `com.emoshelf.app` configuration, no `wdio`, Authenticode **NotSigned**.
  Replaced the local installed executable only; this is not a published update.
- On that exact executable, Notepad verified **six consecutive insert/delete/reopen
  cycles**: two clicks, two Enter insertions after minimizing/restoring, and two
  Ctrl+Enter keep-open insertions. Every sample inserted exactly one emoji; no
  omissions or duplicates. Pinned left Notepad unobstructed and focused. Ten Alt+E
  reveals included hidden/background/minimized and already-foreground states.
  Escape dismissed the shelf. This is a smoke run, below the 30-per-mode release gate.
- One Computer Use action was withheld after concurrent user input was detected;
  the state was reobserved before continuing. No unknown click was blindly retried.
- Final frontend: 80 tests and 7 tooling tests pass; TypeScript/Biome pass with the
  existing 24 style warnings. Rust: 71 tests and strict Clippy pass. E2E: 8 scenarios
  pass on the final frontend/shared reveal path; the subsequent native z-order and
  insertion sequencing adjustments were rechecked with Rust and the six real-app
  cycles above. No full cross-application acceptance or performance p95 is claimed.
- Existing boards, item metadata/order, settings, custom assets and renderer packs
  matched the pre-restart backup (usage counters legitimately reflect testing).
  Schema remains v2. The previous binary and data backup are under
  `app/logs/installed-backup-20260922/`; user data is excluded from Git.
- Local artifact and receipt: `app/logs/alt-e-fix-20260922/emoshelf.exe` and
  `artifact-info.json`. Native evidence: `native-sequenced.log`. Source is still
  the working tree based on `4fcf7c27fba6e6b2d12718ff93a9dc3d27d5ee09`, not a clean
  release commit. No commit, push, signing, installer or public release was performed.

### Earlier local smoke evidence

- Installed baseline: 1.0.0, SHA-256
  `b00f850ff0ab46094bc36b12f1ac49d2b67bae192c10883dfecbafbe75766f72`.
  Settings: Alt+E, paste-close, not pinned. Existing user boards were not edited.
- Baseline reproduction: with Notepad foreground and EmoShelf behind it, Alt+E hid
  EmoShelf. After the change the shelf was brought forward.
- First candidate: copying worked, native insertion did not. This result was rejected.
  After checking stable control focus and using keyboard scan codes, one click and
  one Enter each appended exactly one emoji in a fresh unsent Notepad document.
  The original manual Ctrl+V used to isolate the failure is excluded from these counts.
- Final local candidate: one normal click, one Enter and one Pinned click each
  appended exactly one emoji in the test Notepad document (three additional insertions).
  The shelf remained visible behind focused Notepad after Pinned insertion.
  Minimize → Alt+E restored the shelf. Physical Escape/Enter restored and reopened Help
  without pasting the previously selected emoji.
- Environment: Windows 11 Home `10.0.26200`, Notepad `11.2607.14.0`.
  Final native input timings: 203ms, 106ms and 110ms; smoke samples only.
- Native timing logs (`app/logs/native-acceptance.log`, ignored) reported input batches
  at 308ms and 142ms. These are **not** the 30-sample reveal performance gate.
- GitHub repository was public; the repository-secrets listing returned no entries.
  No signing credentials were read, configured or generated, and no release was published.
- Chrome was running with its extension enabled, but the native-host manifest and
  registration were missing. Browser compatibility testing needs the Browser plugin
  connection repaired by the user. No browser profile/configuration was modified.
- Claude `2.2553.1.0` opened with a reauthentication requirement; no text was sent.
  Paint was absent from app discovery and `System32/mspaint.exe` was unavailable.
  Photoshop 2026 started, but the capture tool returned only small floating controls
  after opening an empty test canvas; image/text insertion could not be visually
  qualified. No existing Photoshop document was edited.

## Automated results (2026-09-21, local working tree)

- TypeScript and Biome pass with 24 non-blocking CSS/style warnings.
- Frontend: 75 passing tests across 10 files; release tooling: 7 passing tests.
- Rust: 68 passing tests; `cargo clippy --locked -- -D warnings` passes.
- Production frontend and LP builds pass; JavaScript chunks remain below 500 KiB.
- Desktop E2E: 7 passing scenarios, including native reload persistence and 480×320
  viewport checks. This is embedded WebView2 evidence, not Edge browser acceptance.
- Signing workflow YAML parses and the draft gate is present; release audit passes
  for 122 tracked files. Newly created files are reviewed locally and are not yet
  included in that tracked-file count.
- Local logs are in `app/logs/` and intentionally ignored by Git. No CI run on the
  uncommitted changes, signed installer test or full compatibility pass is claimed.

## Earlier local review artifact (2026-09-21, superseded)

- File: `app/logs/candidate-20260921/EmoShelf-Acceptance.exe` (ignored local output).
- SHA-256: `4b8509eae6c1a98f6267840b835a33f8efbc960e60c46e837af99dae024122ac`.
- Authenticode: **NotSigned**. Native release build, without the `wdio` feature;
  isolated acceptance identifier, not an official installer or an RC-upgrade test.
- Source base: `4fcf7c27fba6e6b2d12718ff93a9dc3d27d5ee09` plus uncommitted changes.
  `candidate-info.json` beside the executable inventories the local source bytes.
  This artifact does not satisfy the clean frozen-commit publication gate.
- The installed 1.0.0 executable's original SHA-256 remained unchanged after testing.

## Reproducible local validation

From `app/`:

```powershell
pnpm check
pnpm build
pnpm release:audit
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --locked --manifest-path src-tauri/Cargo.toml
pnpm test:e2e
pnpm build:acceptance
```

`build:acceptance` uses `com.emoshelf.acceptance`; WebDriver uses `com.emoshelf.e2e`.
Both are separate from the installed app's `com.emoshelf.app`. Run only one
interactive EmoShelf build at a time to avoid hotkey conflicts. Acceptance builds
are unsigned local test artifacts and must not be advertised as formal installers.

The E2E suite exercises the real WebView, local practice, disclosure, keyboard
search and disk persistence. It must never inject keys into arbitrary external
applications on a shared CI desktop. External compatibility remains a separate gate.
Embedded WebDriver drops modifier/default-button behavior for some named keys;
component tests are not a substitute for physical keyboard acceptance. Shipping
binary tests select the external driver instead of expecting the embedded plugin.
`tools/fixtures/input-target.html` provides a local unsaved external input target.
The unattended OS-to-external-editor regression runner is still pending; the
seven desktop E2E scenarios do not cover actual insertion into a separate process.

## Required acceptance before advertising

| Gate | Required evidence | Current status |
| --- | --- | --- |
| External text insertion | Notepad, Edge, Chrome, Claude unsent draft, Photoshop text; 30 clicks + 30 Enter each; zero errors | Notepad smoke only; full matrix pending |
| Image integration | Photoshop/Paint paste, Explorer OLE drag, fallback | Pending |
| Window lifecycle | Pinned, minimized, tray, repeat, target close/change, multiple monitors | Partial: back-to-front, minimized restore and Pinned smoke confirmed |
| Data lifecycle | Crash/restart, corrupt primary/backup, v1/v2 import, RC upgrade, failed update, uninstall | Automated coverage; installed upgrade pending |
| Accessibility | Narrator, keyboard/IME, 100/125/150/200%, themes, contrast, reduced motion | Partial automated coverage; manual matrix pending |
| Performance | >=30 samples, reveal-to-frame/focus p95 <=300ms, search-to-frame p95 <=100ms | Pending |
| Sustained use | Five separate business days on one frozen candidate; no crashes/data loss/core regressions | Not started |
| Distribution | Verified x64/ARM64 signed application and installers, update signatures, installed-app test | Blocked on external signing setup and validation |

Keep final evidence outside tracked source so it can name the exact frozen commit
without a self-referential commit. Record installer hash, OS/build, app versions,
reviewer, dates, recordings and defect counts. Run:

```powershell
pnpm release:readiness <evidence.json> <exact-40-character-commit> <installer.exe>
```

The tool checks evidence completeness, artifact bytes, repetition counts, sample
thresholds and distinct weekdays. It does not authenticate recordings/signatures
or decide public holidays; the reviewer owns those checks. Missing or pending
records fail. `tools/release-readiness.node-test.mjs` contains synthetic fixtures,
never product acceptance evidence. Source changes invalidate affected validation;
candidate changes restart sustained-use qualification.
Start with `tools/release-evidence.example.json`, whose checks are deliberately pending.
It also requires a clean source, build timestamp, OS build, app versions and reviewer;
business-day records predating the candidate are rejected.

The signing workflow now stops at an unpublished draft, so five-day qualification
can use the exact signed artifact before promotion. Its changes are locally reviewed,
not validated by an authenticated signing run. See `release.md` for promotion.

Native API references: [foreground activation](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow),
[input batches](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput),
[clipboard change detection](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getclipboardsequencenumber).

Do not change the repository visibility, dispatch signing/publication, or start ads
as part of routine local validation. Follow `release.md` after qualification.
