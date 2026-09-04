# EmoShelf

> **Your personal emoji shelf.**

EmoShelf is a free and open-source desktop app for keeping the emojis you actually use within instant reach.

Instead of opening a giant emoji catalog every time, EmoShelf lets you build your own Boards, arrange your favorite emojis, and paste them anywhere with a single click.

**Stop searching. Start reaching.**

---

## Why EmoShelf?

Operating-system emoji pickers are useful when you need to *find* an emoji.

But most of the time, you already know which emojis you use.

EmoShelf is designed around a different idea:

> **Emoji Pickerではなく、Personal Emoji Shelf。**  
> 探すためのアプリではなく、自分が使う絵文字を置いておくアプリ。

Your Shelf becomes the home screen. Search is still there when you need it, but it is no longer the main workflow.

---

## Core experience

```text
Global shortcut
      ↓
Open EmoShelf
      ↓
Choose from your Board
      ↓
Click emoji
      ↓
Paste
      ↓
Close
```

The default interaction is intentionally simple:

**Hotkey → Click → Paste → Close**

---

## Features

### Personal Boards

Create simple, flat Boards for different contexts.

Examples:

- ⭐ My Shelf
- 😂 Reactions
- 💻 Dev
- 🎨 Design
- 📱 Social

Add emojis to a Board, enter Edit mode, and drag them into the order that makes sense to you.

### Shelf-first Home

On the first launch, EmoShelf opens the full emoji catalog as part of onboarding.

You choose a few emojis you use often, and EmoShelf creates your first Shelf.

From the second launch onward, your personal Boards become Home.

### Fast global popup

Open EmoShelf from anywhere using a global shortcut.

Default:

```text
Alt + E
```

The shortcut will be configurable.

### One-click paste

By default:

```text
Click → Paste → Close
```

Alternative selection behaviors are planned:

- Paste and close
- Paste and keep open
- Copy only

### Twemoji by default

EmoShelf separates the emoji **payload** from the emoji **renderer**.

For example:

```text
Rendered appearance: Twemoji
Copied payload:      😭
Unicode:             U+1F62D
```

Changing the renderer does not change the Unicode copied to the target app.

Planned renderer choices:

- Twemoji — default
- Fluent Emoji
- Noto Emoji
- OpenMoji
- Native / system renderer

> Renderer availability and bundled assets are subject to their respective licenses and attribution requirements.

### Search when you need it

Search is a utility, not the product homepage.

Search results switch from the Board grid into a keyboard-friendly result list.

Planned actions:

- `Enter` — Paste
- `Ctrl + Enter` — Add to Shelf
- `Ctrl + K` — Actions

### Quick and pinned workflows

EmoShelf is designed for both fast one-off pastes and repeated use.

- **Quick mode** — paste one emoji and close
- **Pinned mode** — keep EmoShelf open while you work

### Local-first

EmoShelf should work without an account.

Core user data stays on the device:

- Boards
- Board order
- Emoji order
- Recent emojis
- Preferences
- Window size
- Shortcut settings

Cloud sync is intentionally not required for the core experience.

---

## Design direction

### Discord warmth × Raycast precision

EmoShelf combines:

- colorful, friendly emoji presentation
- compact utility-app density
- keyboard-first navigation
- subtle dark surfaces
- small, intentional motion
- minimal UI chrome

The emoji should always be more visually important than the surrounding interface.

> **Emoji first. Chrome second.**

See [`DESIGN.md`](./DESIGN.md) for the full interface specification.

---

## Product principles

1. **Shelf first**  
   Your Boards are the product. The catalog is secondary.

2. **One emoji, one click**  
   The common action should require as little friction as possible.

3. **Keyboard-first, mouse-friendly**  
   Fast shortcuts without making mouse use awkward.

4. **Local-first**  
   No account should be required to use the core product.

5. **Appearance independent**  
   Rendering style and copied Unicode are separate concerns.

6. **Stay lightweight**  
   EmoShelf should remain a focused desktop utility.

7. **Free and open source**  
   The essential emoji-shelf experience should not live behind a paywall.

---

## Onboarding

First launch:

```text
Welcome
   ↓
Browse full emoji catalog
   ↓
Pick emojis you use often
   ↓
Create "My Shelf"
   ↓
Learn Alt + E
   ↓
Open your Shelf
```

Second launch and later:

```text
My Shelf
```

The onboarding itself teaches the product's main mental model: **put emojis on your Shelf instead of searching for them every time.**

---

## Current architecture

EmoShelf is planned as a Windows-first desktop app.

```text
Tauri 2
├── React
├── TypeScript
├── Rust
│
├── Global Shortcut
├── Clipboard / Paste integration
├── System Tray
├── Start with Windows
├── Local persistence
└── Privacy-safe foreground app / monitor integration
```

The project should stay small enough to feel native and open quickly.

### Performance target

A long-term interaction target is:

> **Global hotkey → visible popup in under 100 ms where practical.**

This is a product goal, not yet a guaranteed benchmark.

---

## Initial scope

The first usable release focuses on:

- Windows
- Global shortcut
- Twemoji rendering
- Emoji catalog
- Search
- Recent emojis
- Custom Boards
- Add to Shelf
- Board editing
- Drag-and-drop reordering
- One-click paste
- Quick / pinned behavior
- Local persistence
- Dark / light appearance

Not in the first release:

- Custom image emojis
- Sticker management
- Cloud sync
- Accounts
- Social/community features
- AI features
- Nested folders

See [`ROADMAP.md`](./ROADMAP.md).

---

## Project status

**Status: Planning / pre-alpha**

The product direction, core interaction model, onboarding, visual direction, and MVP scope are currently defined.

Implementation has not yet reached a stable public release.

---

## Contributing

EmoShelf is intended to be an open-source project.

Contribution guidelines will be added once the initial application structure and coding conventions are stable.

Potential contribution areas include:

- accessibility
- keyboard navigation
- emoji metadata / search
- renderer integrations
- Windows behavior
- localization
- performance
- packaging

---

## License

The application license will be finalized before the first public release.

Third-party emoji artwork and libraries may use separate licenses and attribution requirements. These must be documented clearly before distribution.

---

## Acknowledgements

EmoShelf is inspired by the speed and polish of modern launcher-style utilities and by the friendliness of contemporary emoji experiences.

It is not intended to clone another product's interface. The goal is to build a distinct **Personal Emoji Shelf** workflow around open, local-first desktop software.

---

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md).

## Design

See [`DESIGN.md`](./DESIGN.md).
