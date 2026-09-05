# EmoShelf Roadmap

This roadmap describes the planned path from prototype to a stable public release.

EmoShelf is intentionally scoped as a focused desktop utility:

> **A free and open-source Personal Emoji Shelf.**

The goal is not to build the largest emoji platform. The goal is to make frequently used emojis dramatically faster to access.

---

# Milestones

## Phase 0 — Foundation

**Goal:** establish a clean desktop-app foundation before feature work.

### Engineering

- [x] Initialize Tauri 2 project
- [x] React + TypeScript frontend
- [x] Define application state model
- [x] Define persistence format
- [x] Add formatting / linting
- [x] Establish build commands
- [x] Windows development packaging
- [x] Add basic CI
- [x] Add application icon placeholder
- [x] Decide final application license (Apache-2.0)

### Core data model

Initial conceptual model:

```text
AppState
├── boards[]
├── recent[]
├── settings
└── onboardingState

Board
├── id
├── name
├── icon
├── order
└── items[]

ShelfItem
├── id
├── type
├── payload
├── displayMetadata
└── usageMetadata
```

For v0.1, the primary `ShelfItem.type` is Unicode emoji.

The model should leave room for future:

- EmojiSequence
- Symbol
- CustomImage

without requiring those features in v0.1.

### Exit criteria

- App starts reliably on Windows
- State can be saved and restored
- Basic window shell renders
- CI can build/check the project

---

# v0.1 — The Shelf

**Theme:** *Make EmoShelf useful enough to replace Win + . for frequent emojis.*

This is the first real product milestone.

## 1. Onboarding

- [x] Welcome screen
- [x] Full emoji catalog on first run
- [x] Let user select frequently used emojis
- [x] Create `My Shelf`
- [x] Explain global shortcut
- [x] Optional Skip path
- [x] Save onboarding completion

### Acceptance

A new user should understand within the first session that EmoShelf is a **Shelf**, not just another emoji catalog.

---

## 2. Shelf Home

- [x] `My Shelf` as default Board
- [x] Horizontal Board tabs
- [x] `+` New Board action
- [x] Emoji grid
- [x] Empty state
- [x] Add-to-Shelf action
- [x] Remove-from-Shelf action
- [x] Selected emoji state
- [x] Action footer

### Acceptance

After onboarding, the app opens directly to the user's Shelf.

---

## 3. Boards

- [x] Create Board
- [x] Rename Board
- [x] Change Board icon
- [x] Reorder Boards
- [x] Delete Board with confirmation/undo
- [x] Flat Board model only
- [x] Prevent accidental destructive edits

### Non-goal

No nested folders or workspace hierarchy.

---

## 4. Edit Shelf mode

- [x] Explicit `Edit Shelf` mode
- [x] Drag-and-drop emoji reordering
- [x] Remove item
- [x] Move item
- [x] Copy item to another Board
- [x] Exit edit mode cleanly

### UX rule

Normal browsing should not allow accidental drag reordering.

---

## 5. Emoji Catalog

- [x] Unicode emoji dataset
- [x] Categories
- [x] Search
- [x] Emoji names
- [x] Add to Board
- [x] Recently used section

### Acceptance

The catalog is easy to reach, but never dominates the normal Home experience.

---

## 6. Twemoji renderer

- [x] Twemoji as default visual renderer
- [x] Separate renderer from copied Unicode payload
- [x] Fallback behavior
- [x] Attribution / license documentation
- [x] Rendering performance validation

### Acceptance

Changing rendering must not mutate the Unicode text copied/pasted into another application.

---

## 7. Paste workflow

Default:

```text
Hotkey → Shelf → Click → Paste → Close
```

- [x] Clipboard integration
- [x] Paste into foreground app
- [x] Restore focus correctly
- [x] Close after successful selection
- [x] Failure handling
- [x] `Copy only` fallback

### Acceptance

The common path should feel faster than opening a general-purpose emoji picker.

---

## 8. Global shortcut

- [x] Default `Alt + E`
- [x] Custom shortcut setting
- [x] Conflict detection where practical
- [x] Show/hide toggle
- [x] Return focus correctly

---

## 9. Quick / Pinned behavior

- [x] Quick mode
- [x] Pinned mode
- [x] Visible Pin control
- [x] Remember preferred behavior if configured

---

## 10. Appearance

- [x] Dark mode
- [x] Light mode
- [x] System mode
- [x] Raycast-inspired compact layout
- [x] Discord-like warmth through emoji presentation
- [x] Motion and hover states
- [x] Reduced-motion support

---

## 11. Local persistence

Persist:

- [x] Boards
- [x] Board order
- [x] Item order
- [x] Recents
- [x] Renderer preference
- [x] Theme
- [x] Shortcut
- [x] Window size
- [x] Pinned preference

### Exit criteria for v0.1

A user can:

1. install EmoShelf,
2. finish onboarding,
3. build a personal Shelf,
4. press a global shortcut,
5. click an emoji,
6. paste it into another app,
7. reopen EmoShelf later with their setup preserved.

---

# v0.2 — Compose & Personalization

**Theme:** *Move beyond single-emoji pasting.*

## Compose mode

- [x] Compose Tray
- [x] Add multiple emojis before paste
- [x] Undo last addition
- [x] Clear composition
- [x] Paste composition
- [x] Copy composition

Example:

```text
😭 + 🫠 + 💀
        ↓
     😭🫠💀
```

## Emoji Sequences

- [x] Save a sequence as one Shelf item
- [x] Reuse saved sequences
- [x] Edit saved sequences

Examples:

```text
😭🙏
👀🍿
🔥🔥🔥
✅✨
```

## Renderer switching

- [x] Renderer selector
- [x] Twemoji
- [ ] Fluent Emoji
- [ ] Noto Emoji
- [ ] OpenMoji
- [x] Native/system
- [x] Per-renderer attribution information

Fluent/Noto/OpenMojiはv0.4の署名付きRenderer Packとして導入する。v0.2では
未インストールの外部rendererを選択できない状態で表示し、ライセンス情報だけを先行表示する。

## Import / Export

- [x] Export local EmoShelf configuration
- [x] Import configuration
- [x] Schema version
- [x] Validation
- [x] Safe merge / replace flow

## Keyboard improvements

- [x] Arrow-key navigation
- [x] Enter to paste
- [x] Escape to close
- [x] Search shortcut
- [x] Actions shortcut
- [x] Add-to-Shelf shortcut
- [x] Board switching shortcuts

### Exit criteria for v0.2

Power users can use EmoShelf almost entirely from the keyboard and can save multi-emoji reactions as reusable Shelf items.

---

# v0.3 — Context-aware Shelf

**Theme:** *Show the right Shelf for the app you're using.*

## Per-App Boards

- [x] Detect foreground application
- [x] Optional app → Board mapping
- [x] Fallback to last/default Board
- [x] Privacy-friendly local implementation
- [x] Easy opt-out

Examples:

```text
Discord → Reactions
VS Code → Dev
Photoshop → Design
Browser → My Shelf
```

## Usage intelligence — local only

- [x] Track local usage counts
- [x] Frequently used view
- [x] Optional Shelf Glow
- [x] Reset usage statistics
- [x] Disable usage tracking

No remote analytics are required for this feature.

## System integration

- [x] Start with Windows
- [x] Tray refinements
- [x] Better multi-monitor positioning
- [x] Remember popup position behavior
- [x] DPI / scaling validation
- [ ] High refresh-rate motion checks

実装は物理monitor座標とwindow DPIを基準にし、現在の60Hz・2画面ホストで実機確認済み。
120/144Hz以上の最終視覚確認はv0.5の品質ゲートで行う。

### Exit criteria for v0.3

EmoShelf can adapt its default Board to the user's current application without requiring an online service.

---

# v0.4 — Custom Emoji & Packs

**Theme:** *Expand beyond Unicode while keeping Unicode first.*

This milestone is intentionally deferred until the core Shelf experience is stable.

## Custom image emojis

- [x] Import PNG/WebP/SVG where safe/supported
- [x] Local image library
- [x] Custom image Boards
- [x] Copy image
- [ ] Drag image into compatible applications
- [x] Remove local asset safely

## Emoji packs

- [x] Renderer/pack abstraction
- [x] Pack metadata
- [x] Local install/uninstall
- [x] Compatibility checks
- [x] License metadata
- [x] Attribution UI

Windows OLEの外部ドラッグ実装とコピーフォールバックは組み込み済み。実Tauriから
Explorerへの受け入れ確認は、Computer Useが対象ウィンドウ外へのポインター移動を拒否するため未完了。
互換アプリへの実ドロップ成功を確認するまで該当チェックは更新しない。

## Guardrails

Custom content must not compromise:

- app startup speed
- Unicode workflows
- local-first operation
- portability
- clear licensing

---

# v0.5 — Polish & Accessibility

**Theme:** *Make EmoShelf feel finished.*

- [ ] Screen-reader review
- [x] Full keyboard audit
- [x] Focus-visible audit
- [x] Color contrast audit
- [x] Reduced-motion validation
- [ ] Large text / scaling
- [ ] 125% / 150% / 200% Windows scaling
- [x] Multi-monitor behavior
- [ ] High-DPI emoji rendering
- [x] Search quality improvements
- [x] Japanese search improvements
- [x] Startup-performance profiling
- [x] Memory profiling
- [x] Crash recovery
- [x] Settings backup
- [x] Update flow

モーダルのfocus trap／復帰、skip link、セマンティック要素、axe、forced-colors、
prefers-contrast、Reduced Motionを自動検証した。1949件の検索はp95 100ms未満をテストし、
絵文字データを静的JSONへ分離して全JavaScript chunkを500KiB以下に制限した。

Windows実機では起動→操作可能77.5ms、JavaScript heap 6.4MiB、非同期化したホットキー
表示要求0.1msを確認した。ホットキー値は再起動後1 sampleのため、10 sample以上のp95証跡は
v1.0手動ゲートへ残す。Narrator、125%／150%／200%、大文字、高DPI、120/144Hz以上も、
端末設定を安全に復元できる手順と人手を伴うため未受入のままとする。

---

# v1.0 — Stable Public Release

## Product requirements

- [ ] Stable Windows release
- [ ] Reliable global shortcut
- [ ] Reliable one-click paste
- [ ] Boards stable
- [ ] Search stable
- [ ] Twemoji renderer stable
- [ ] Renderer switching stable enough for release scope
- [ ] Import/export stable
- [ ] Keyboard navigation complete
- [ ] Accessibility baseline complete
- [ ] Installer/uninstaller tested
- [ ] Auto-update strategy decided
- [ ] Privacy statement
- [ ] Third-party attribution
- [ ] Contribution guide
- [ ] Issue templates
- [ ] Release notes
- [ ] Screenshots / demo media
- [ ] README finalized

## Product promise

By v1.0, this sentence should be true:

> **EmoShelf is the fastest way to reach the emojis you personally use most on Windows.**

---

# Performance goals

These are engineering targets, not guaranteed numbers until benchmarked.

## Interaction

- Hotkey → popup should feel immediate
- Board switching should appear instant
- Emoji hover should remain smooth
- Search should update without visible lag
- Paste should not leave EmoShelf focused accidentally

## Long-term target

Where practical on a typical modern Windows PC:

```text
Global hotkey → visible popup < 100 ms
```

Performance work should prioritize perceived latency over decorative animation.

---

# Explicit non-goals

EmoShelf should not become:

- a chat app
- a social network
- a cloud emoji marketplace
- an AI assistant
- a general clipboard manager
- a Notion-like workspace
- a complex asset-management suite
- a Discord clone

Features should be rejected when they weaken the core:

> **Open Shelf → reach emoji → paste.**

---

# Future ideas — not committed

Possible ideas that may be explored only after the core product is stable:

- macOS support
- Linux support
- portable mode
- plugin API
- optional sync
- community renderer packs
- optional usage-based sorting
- optional command-line interface

These are ideas, not promises.
