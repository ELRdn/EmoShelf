# EmoShelf Design

> **Design direction:** Discord warmth × Raycast precision<br>
> **Approved UI concept:** Concept 2.5<br>
> **Approved color direction:** Purple × Yellow dual accent<br>
> **Platform priority:** Windows-first<br>
> **Status:** Product design baseline for implementation

---

# 1. Design vision

EmoShelf is a compact desktop utility for reaching the emojis a user actually uses.

The app should not feel like a giant emoji database, a chat client, or a general clipboard manager.

It should feel like a polished launcher:

- fast
- quiet
- keyboard-aware
- visually disciplined
- immediately understandable

The emojis provide the color and personality.

The interface provides structure and speed.

## North star

> **The emoji are playful. The interface is disciplined.**

## Visual influence

A useful mental ratio:

```text
Raycast-like utility precision   70%
Discord-like emoji warmth       20%
EmoShelf identity               10%
```

This is inspiration, not visual cloning.

---

# 2. Product mental model

EmoShelf is not primarily an Emoji Picker.

It is a:

> **Personal Emoji Shelf**

Traditional emoji pickers optimize for finding any emoji.

EmoShelf optimizes for reaching the emojis a specific user already likes.

```text
Traditional picker

Search
  ↓
Choose
  ↓
Paste
```

```text
EmoShelf

Arrange
  ↓
Reach
  ↓
Paste
```

Search still exists, but it is a supporting tool.

The personal Shelf is Home.

---

# 3. Core interaction

The default interaction must remain extremely short:

```text
Alt + E
   ↓
EmoShelf opens
   ↓
Click emoji
   ↓
Paste
   ↓
Close
```

Default behavior:

> **Hotkey → Click → Paste → Close**

Alternative behavior can be configured later:

- Paste and close
- Paste and keep open
- Copy only

Pinned mode temporarily keeps the app open regardless of the default close behavior.

---

# 4. Design principles

## 4.1 Emoji first. Chrome second.

The emoji grid should be the strongest visual element.

Navigation, borders, buttons, labels, and decorative effects must remain secondary.

## 4.2 Shelf first.

The user's Boards are Home.

The full emoji catalog is a utility surface.

## 4.3 Fast enough to feel native.

Animation must never make EmoShelf feel slower.

Perceived latency matters more than decorative motion.

## 4.4 One emoji, one click.

Routine use should not require menus or confirmation dialogs.

## 4.5 Keyboard-first, mouse-friendly.

Keyboard navigation must be fast without making mouse use awkward.

## 4.6 Familiar, not derivative.

Learn from polished desktop utilities without cloning another product's identity.

## 4.7 Flat beats hierarchical.

Boards are intentionally simple.

No nested folders in the core product.

## 4.8 Local-first.

Core use must not require an account, cloud connection, or remote profile.

## 4.9 Safe editing.

Destructive actions should be reversible where practical.

Prefer:

- Undo
- explicit Edit Shelf mode
- safe confirmation for destructive Board actions
- local recovery where reasonable

over accidental permanent deletion.

---

# 5. Approved Concept 2.5

Concept 2.5 is the implementation target.

It combines:

- Concept 2's split layout and detail panel
- Concept 3's bottom utility footer
- the new Purple × Yellow color system

## Layout summary

```text
┌──────────────────────────────────────────────────────────────┐
│ EmoShelf                                             ─ □ ×   │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Search emojis...                                  Ctrl+F │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [ My Shelf ] [ Reactions ] [ Dev ] [ Design ] [ + ]         │
│                                                              │
│ ┌──────────────────────────────┐ ┌─────────────────────────┐ │
│ │                              │ │                         │ │
│ │ Emoji Shelf Grid             │ │ Emoji Detail Panel      │ │
│ │                              │ │                         │ │
│ │ 😂 😭 🫠 💀                  │ │ 😭                      │ │
│ │ 👀 🔥 ✨ ✅                  │ │ Loudly Crying Face      │ │
│ │ 🥹 😏 🩵 🚀                  │ │ Unicode / Keywords      │ │
│ │                              │ │                         │ │
│ └──────────────────────────────┘ └─────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 😭 Loudly Crying Face  Enter Paste  Ctrl+K Actions      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ● Ready to paste · Free & open source       GitHub ? ⚙      │
└──────────────────────────────────────────────────────────────┘
```

---

# 6. Main surfaces

The initial product requires five primary surfaces:

1. **Shelf**
2. **Search / Emoji Catalog**
3. **Board Editor**
4. **Settings**
5. **Onboarding**

Supporting surfaces:

- Action menu
- Context menu
- Toasts
- Emoji detail panel

These supporting surfaces should not become full-page workflows unless necessary.

---

# 7. Application window

## Default window

Recommended starting size for the full Concept 2.5 view:

```text
Width:  760–860 px
Height: 560–640 px
```

The exact size should be tuned after implementation.

The original 560 × 420 compact concept remains useful for a future reduced Quick view, but the approved split-panel Concept 2.5 benefits from additional horizontal space.

## Window properties

- compact floating utility window
- rounded corners
- restrained shadow
- dark neutral shell
- no oversized title bar
- no permanent left sidebar
- remembers resized dimensions
- supports Windows scaling
- opens on the active display
- restores focus to the previous application after paste
- supports Pin / keep-open behavior
- should feel closer to a launcher than a traditional desktop dashboard

## Future Compact Quick view

A smaller configuration may target approximately:

```text
480 × 320 px
```

This is not required for v0.1.

---

# 8. Information architecture

```text
EmoShelf
│
├─ Shelf
│   ├─ My Shelf
│   ├─ Reactions
│   ├─ Dev
│   ├─ Design
│   └─ + New Board
│
├─ Search / Catalog
│   ├─ Search
│   ├─ Categories
│   ├─ Recents
│   └─ Add to Board
│
├─ Board Editor
│
├─ Settings
│   ├─ General
│   ├─ Appearance
│   ├─ Shelf
│   ├─ Data
│   └─ About
│
└─ Onboarding
```

---

# 9. Layout anatomy

Concept 2.5 uses six persistent visual regions:

1. **Title / window controls**
2. **Search row**
3. **Board tab row**
4. **Shelf + Detail split content**
5. **Contextual action footer**
6. **Utility footer**

The two-footer model is intentional.

The first footer is contextual and changes with the selected emoji.

The second footer contains product-level utilities and status.

---

# 10. Search row

Search is always easy to reach, but it must not visually overpower the Shelf.

Example:

```text
┌─────────────────────────────────────────────┐
│ 🔍 Search emojis...                  Ctrl+F │
└─────────────────────────────────────────────┘
```

## Behavior

- click or shortcut focuses search
- typing switches content into Search mode
- `Esc` exits search
- clearing the query returns to the current Board
- search should feel immediate
- avoid modal search dialogs

## Shortcut

The final shortcut map may use `Ctrl+F` or `Ctrl+K`.

Implementation must choose one consistent behavior and avoid collisions with the Actions menu.

---

# 11. Board tabs

Use a horizontal tab model.

Example:

```text
▦ My Shelf   ☺ Reactions   </> Dev   🎨 Design   +
```

## Rules

- current Board is clearly selected
- tabs remain compact
- `+` creates a Board
- overflow moves into a `More` menu
- no permanent sidebar in v0.1
- Board icon is optional but encouraged
- Board names remain short
- dragging Board tabs is allowed only in an editing/reordering interaction if accidental rearrangement becomes a problem

## Color behavior

The selected Board should primarily use **Purple**.

A Board that semantically represents favorites / My Shelf may use a **small Yellow icon or warm marker**, but should not become a fully yellow tab by default.

---

# 12. Shelf grid

The Shelf grid is the center of the product.

## Emoji size

Recommended visible glyph size:

```text
36–44 px
```

The clickable cell must be larger than the glyph.

Recommended target cell:

```text
72–88 px
```

depending on final window density.

## Grid behavior

- adapts column count to window width
- does not grow emoji indefinitely on large windows
- keeps spacing visually consistent
- prioritizes reliable hit areas
- supports mouse and keyboard focus

## Cell states

- default
- hover
- keyboard focus
- pressed
- selected
- edit mode
- unavailable/fallback

---

# 13. Emoji cell styling

## Default

- dark neutral surface
- subtle border
- no accent glow
- emoji centered

## Hover

- slightly brighter surface
- short scale-up
- no heavy glow
- tooltip after a small delay

## Selected

Primary visual language:

- **Purple border**
- subtle Purple inner glow/tint
- small Purple selection indicator if needed

Do not use Yellow as the default selected border.

Purple owns selection.

## Favorite / My Shelf marker

Yellow may be used for:

- star / heart marker
- Add to Shelf confirmation
- small warm indicator
- favorite-related iconography

Yellow should complement Purple, not compete with it.

---

# 14. Emoji tooltip

On hover or keyboard focus:

```text
😭
Loudly Crying Face

Click to paste
```

Tooltips should:

- appear after a short delay
- never cover the selected emoji unnecessarily
- show the human-readable emoji name
- remain compact

---

# 15. Detail panel

Concept 2.5 keeps a dedicated right-side detail panel.

This is one of the major reasons Concept 2.5 is preferred over the simpler Concept 1.

## Purpose

The detail panel gives EmoShelf product depth without interrupting the fast paste path.

It can show:

- large emoji preview
- emoji name
- shortcode if available
- Unicode value
- category
- keywords
- Board membership
- date added
- copy action
- Add to Shelf / Move actions

Example:

```text
        😂

Face with Tears of Joy

:face_with_tears_of_joy:

Category     Reactions
Keywords     joy, laugh, funny
Unicode      U+1F602
Added        Today
```

## Rules

- panel updates instantly with selection
- no mandatory interaction before paste
- should not become a giant metadata inspector
- metadata rows remain quiet and secondary
- future fields should be added carefully

---

# 16. Contextual action footer

The first footer changes according to the current selection.

Shelf example:

```text
😭 Loudly Crying Face

Enter  Paste
Ctrl+Enter  Keep open
Ctrl+K  Actions
```

Search example:

```text
😭 Loudly Crying Face

Enter  Paste
Ctrl+Enter  Add to Shelf
Ctrl+K  Actions
```

## Purpose

- teach shortcuts
- expose high-frequency actions
- show selection context
- reinforce Raycast-like utility precision

## Styling

- neutral surface
- shortcut keycaps
- Purple used for active/focused shortcut hints
- Yellow only for Shelf/favorite-specific actions where helpful

---

# 17. Utility footer

The second footer comes from the strongest part of Concept 3.

## Left side

Example:

```text
● Ready to paste · Free & open source
```

Possible status states:

- Ready to paste
- Pinned
- Copied
- Paste unavailable
- Updating data — only if ever needed

The status dot should use semantic colors, not the brand accent by default.

## Right side

Recommended utilities:

- GitHub
- Help
- Settings

Represented as compact icons.

Example:

```text
GitHub   ?   ⚙
```

## Rules

- settings lives here instead of the top bar
- GitHub is visible but unobtrusive
- footer remains thin
- no promotional clutter
- external links should be clearly distinguishable

---

# 18. Search / Emoji Catalog

Search is secondary but fast.

When active, the central area may switch from Grid into a result list.

Example:

```text
Search Emoji
> cry

😭  Loudly Crying Face
😢  Crying Face
🥲  Smiling Face with Tear
😂  Face with Tears of Joy
```

## Keyboard behavior

Planned:

- `↑ / ↓` — navigate
- `Enter` — paste
- `Ctrl + Enter` — add to Shelf
- `Esc` — return / close
- shortcut — Actions

## Search actions

Primary:

- Paste

Secondary:

- Add to My Shelf
- Add to another Board
- Copy
- View info

Avoid modal dialogs for routine actions.

Use menus and Toasts.

---

# 19. Board Editor

Reordering should require an explicit editing state.

## Browse mode

Clicking an emoji pastes it.

Normal browsing should not accidentally rearrange a Board.

## Edit Shelf mode

Example:

```text
┌────────┐ ┌────────┐ ┌────────┐
│   😭  ⋮│ │   😂  ⋮│ │   💀  ⋮│
└────────┘ └────────┘ └────────┘

Drag to reorder
```

Actions:

- drag to reorder
- remove
- move to Board
- copy to Board
- exit edit mode

Board-level actions:

- rename
- choose icon
- reorder
- delete
- duplicate later if useful

Deletion should offer Undo or a safe confirmation path.

---

# 20. Onboarding

The onboarding has one job:

> **Teach the user to build a Shelf.**

It should not become a long feature tour.

## Step 1 — Welcome

```text
Welcome to EmoShelf 👋

Your emojis.
Your boards.
Always one shortcut away.

[ Get started ]
```

## Step 2 — Pick your emojis

On first launch, show the full emoji catalog.

```text
Pick the emojis you use most

😀 😃 😄 😁 😂 🥹 😭 😎
🥰 😏 🤨 🫠 💀 😇 🫡 👀
🔥 ✨ ✅ ❤️ 🩵 🚀 💯 🤝

Selected: 8

[ Continue ]
```

During this onboarding step, selecting means:

```text
Add to future My Shelf
```

not immediate paste.

Do not enforce a strict minimum unless later testing proves it useful.

A soft suggestion of roughly 5–12 emojis is enough.

## Step 3 — Create My Shelf

```text
My Shelf

😂 😭 🫠 💀 👀 🔥 ✨ ✅
```

Message:

```text
Next time, EmoShelf opens here.
```

## Step 4 — Teach shortcut

```text
You're ready ✨

Press Alt + E anywhere
to open EmoShelf.

Click an emoji → Paste → Done.
```

## Step 5 — Home

Enter My Shelf.

The second launch and later should open directly into the user's Shelf.

---

# 21. Add to Shelf language

Avoid treating the core concept as generic “Favorites”.

Preferred language:

```text
Add to Shelf
Added to My Shelf
Move to Board
Remove from Shelf
```

This reinforces the product's unique mental model.

A star or heart icon may still be used visually.

---

# 22. Paste behavior

Default:

```text
Paste and close
```

Settings may expose:

- Paste and close
- Paste and keep open
- Copy only

## Pinned mode

Pinned mode temporarily overrides auto-close.

Pinned state must always be visible.

Potential indicator:

```text
📌 Pinned
```

or a subtle footer status.

---

# 23. Renderer system

The visual renderer and clipboard payload must remain separate.

## Data flow

```text
Unicode code point / sequence
            ↓
      renderer layer
            ↓
       visible emoji
```

```text
Unicode code point / sequence
            ↓
     clipboard payload
            ↓
      target application
```

Example:

```text
Visible: Twemoji artwork
Payload: 😭
```

## Planned renderers

```text
Emoji Style

● Twemoji
○ Fluent
○ Noto Emoji
○ OpenMoji
○ Native
```

Twemoji is the preferred default.

## Renderer requirements

Every renderer must have:

- documented license
- required attribution
- fallback behavior
- consistent sizing strategy
- no mutation of Unicode payload

Do not label Twemoji as a Discord-owned asset.

Descriptive copy may say the appearance is familiar to Discord users only when legally and visually clear.

---

# 24. Official color system

## Direction

EmoShelf uses a:

> **Purple × Yellow dual-accent system**

The dark neutral UI remains the foundation.

Purple and Yellow have distinct semantic roles.

They should not be sprayed across the interface equally.

## Role split

### Purple — Primary brand / interaction accent

Purple owns:

- selected Board
- selected emoji
- keyboard focus
- primary CTA
- active controls
- focus rings
- important interactive emphasis
- brand identity

### Yellow — Warm supporting accent

Yellow owns:

- Shelf / favorite semantics
- stars / hearts / saved indicators
- warm highlights
- selected supporting metadata
- positive celebratory emphasis
- small brand details
- logo secondary accent

### Rule

> **Purple tells you where you are. Yellow tells you what you love.**

This is the core semantic color rule.

---

# 25. Dark theme tokens

These tokens are the approved starting point for implementation.

```text
Background             #111113
Surface                #18181B
Elevated Surface       #222226
Surface Hover          #26262B
Border                 #2A2A2F
Border Strong          #373740

Text Primary           #F5F5F7
Text Secondary         #9C9CA5
Text Muted             #73737C

Purple Primary         #8B7CFF
Purple Hover           #A69AFD
Purple Pressed         #7466E8
Purple Subtle          rgba(139, 124, 255, 0.14)

Yellow Primary         #FFC857
Yellow Hover           #FFD77A
Yellow Pressed         #E7A92F
Yellow Subtle          rgba(255, 200, 87, 0.14)

Success                #22C55E
Warning                #F59E0B
Danger                 #FF5D73
```

Exact values may be nudged during implementation for contrast and display calibration, but the Purple × Yellow relationship is fixed.

---

# 26. Light theme tokens

Light mode should not become pure white.

```text
Background             #F4F4F6
Surface                #FAFAFB
Elevated Surface       #FFFFFF
Surface Hover          #EFEFF3
Border                 #E3E3E7
Border Strong          #D3D3DA

Text Primary           #18181B
Text Secondary         #6F6F78
Text Muted             #8B8B94

Purple Primary         #7467E8
Purple Hover           #6558D8
Purple Pressed         #594FC4
Purple Subtle          rgba(116, 103, 232, 0.11)

Yellow Primary         #D99A10
Yellow Hover           #C88700
Yellow Pressed         #AD7300
Yellow Subtle          rgba(217, 154, 16, 0.12)

Success                #168A3D
Warning                #B86A00
Danger                 #D93A55
```

The light theme should preserve the same semantic role split.

---

# 27. Accent usage rules

## Purple should appear on

- active tab
- focus border
- selected card
- primary button
- shortcut focus
- main interactive highlight
- branded app icon base

## Yellow should appear on

- My Shelf star
- favorite heart
- Add to Shelf success accent
- warm status emphasis
- tiny logo highlight
- optional “saved” marker

## Avoid

- Purple and Yellow both filling the same large control
- large Yellow surfaces
- using Yellow for every positive state
- using Purple as success/error
- replacing semantic red/green with brand colors
- rainbow gradients behind emoji

---

# 28. Gradient policy

Gradients are optional, not foundational.

Allowed only for:

- tiny brand moments
- icon treatment
- onboarding illustration
- subtle selected glow

Potential brand gradient:

```text
Purple #8B7CFF
   ↓
Warm Yellow #FFC857
```

Do not use this as a large page background.

The main product UI remains neutral and flat.

---

# 29. Color philosophy

Emoji already provides substantial color.

Therefore the app shell should use:

- neutral dark surfaces
- restrained border contrast
- one primary interactive accent
- one warm supporting accent
- minimal decorative gradients

The goal is not to compete with Twemoji.

The goal is to frame it.

---

# 30. Glass and depth

Use depth sparingly.

Allowed:

- subtle backdrop blur
- soft floating shadow
- slightly translucent utility-window feel
- thin borders
- mild inner highlight

Avoid:

- extreme glassmorphism
- 50% transparent surfaces
- neon glow everywhere
- rainbow gradient backgrounds
- oversized layered cards
- glossy skeuomorphism

The window should separate from the desktop without visually shouting.

---

# 31. Motion

Motion exists to clarify interaction.

## Emoji hover

Suggested:

```text
scale: 1.00 → ~1.08
duration: 100–140 ms
```

Do not create a macOS Dock wave.

## Press

Suggested:

```text
1.00 → 0.95 → 1.02 → 1.00
```

Keep total feedback fast.

## Board switch

Small fade/slide only if it does not delay input.

## Detail panel

Content may crossfade quickly when selection changes.

## Reduced motion

Respect OS reduced-motion settings where possible.

---

# 32. Focus states

Keyboard focus must always be visible.

Primary focus style:

```text
2 px Purple ring
+
subtle Purple outer glow
```

Do not rely on a color change alone.

For Yellow/favorite controls, keyboard focus still uses Purple.

Purple remains the universal interaction/focus language.

---

# 33. Toasts

Use lightweight Toasts.

Examples:

```text
Added to My Shelf ★
Copied
Moved to Reactions
Board restored
```

Suggested color behavior:

- neutral Toast shell
- Purple for interaction confirmation
- Yellow star/heart for Shelf-related confirmations
- semantic Green only for system success when appropriate
- Red only for errors

Avoid modal dialogs for successful everyday actions.

---

# 34. Context menu / Actions

Right click or Actions menu:

```text
Paste
Copy

Add to...
Move to...

Remove from Shelf
Emoji info
```

Actions adapt to context.

Search results show:

```text
Add to...
```

Shelf items show:

```text
Move
Remove
```

The Actions menu should use Purple focus states.

Yellow is reserved for Shelf/favorite semantics.

---

# 35. Settings

Settings should stay compact.

Recommended sections:

## General

- Start with Windows
- Global shortcut
- Default selection behavior
- Pinned behavior
- Window behavior

## Appearance

- Theme
- Emoji renderer
- UI scale if needed
- Reduced motion

## Shelf

- Default Board
- Recents behavior
- Reset onboarding
- Usage stats later

## Data

- Export
- Import
- Reset local data

## About

- Version
- Open-source repository
- Licenses
- Emoji artwork attribution

Settings entry lives in the Utility Footer.

Do not add a giant permanent settings sidebar unless the content actually requires it.

---

# 36. Empty states

## Empty Shelf

```text
Your Shelf is empty.

Add the emojis you use most
and they'll always be one shortcut away.

[ Add emojis ]
```

Primary button uses Purple.

A Yellow star may be used as the illustration/accent.

## Empty search

```text
No emoji found for "..."

Try another name or category.
```

## New Board

```text
Nothing here yet.

[ Add emojis ]
```

Keep empty states useful and short.

---

# 37. Accessibility

Accessibility is part of the product baseline.

Requirements:

- every emoji cell keyboard reachable
- visible Purple focus state
- meaningful accessible labels
- emoji names exposed to screen readers
- no information communicated by color alone
- sufficient hit areas
- sufficient text/background contrast
- reduced-motion support
- Windows text scaling validation
- high-DPI testing

Emoji artwork must not replace semantic Unicode or accessible names where avoidable.

Yellow text must be used carefully in light mode because contrast can degrade quickly.

---

# 38. Responsive behavior

The window is resizable.

The emoji grid adapts by column count.

```text
narrow → fewer columns
wide   → more columns
```

Do not endlessly scale emoji with the window.

Large windows should gain:

- columns
- breathing room
- detail-panel space

rather than giant emoji.

---

# 39. Windows-specific quality

Windows-first quality is a core requirement.

Test:

- 100% scaling
- 125% scaling
- 150% scaling
- 200% scaling
- multiple monitors
- mixed-DPI monitors
- taskbar auto-hide
- fullscreen applications
- focus restoration
- shortcut conflicts
- dark/light system changes
- clipboard timing
- startup behavior
- window positioning

---

# 40. Brand voice

EmoShelf should sound:

- concise
- friendly
- confident
- slightly playful
- never corporate-heavy

Good:

```text
Added to My Shelf ★
```

Good:

```text
Your emojis, one shortcut away.
```

Avoid:

```text
Emoji asset successfully persisted to collection.
```

Avoid excessive jokes inside core actions.

---

# 41. Icon direction

The app icon should communicate:

- emoji
- shelf
- quick access
- friendliness

## Approved color direction

The icon should use:

- Purple as the dominant base
- Yellow as a small secondary highlight

Potential visual concept:

```text
   ☺
━━━━
☺  ★
━━━━
```

or a simplified shelf/face mark.

Do not use the Discord logo or a shape that could be confused with Discord branding.

The icon must remain legible at:

- 16 px
- 24 px
- 32 px
- 48 px
- 256 px

---

# 42. Logo / brand treatment

Recommended lockup:

```text
[Icon] EmoShelf
```

Wordmark should stay neutral/light.

Do not make the full wordmark Purple + Yellow.

Use brand color primarily in:

- icon
- small accent
- focused product moments

This keeps screenshots visually calm.

---

# 43. Future: Compose Tray

Not required for v0.1.

```text
Compose

😭 🫠 💀

Undo      Clear      Paste
```

Purple owns the active controls.

Yellow may mark saved sequences / favorites.

---

# 44. Future: Shelf Glow

Frequently used emoji cells may gain extremely subtle visual intensity.

Requirements:

- optional
- local-only usage data
- no popularity numbers by default
- must not reduce accessibility
- should not become a heatmap rainbow

Use neutral brightness changes first.

Do not automatically use Yellow for usage frequency.

---

# 45. Future: Per-App Boards

The active Board can optionally depend on the foreground application.

Example:

```text
Discord   → Reactions
VS Code   → Dev
Photoshop → Design
```

The transition should feel predictable.

When a Board changes automatically, a subtle temporary label is enough.

Avoid flashy animation.

---

# 46. Anti-patterns

Do not turn EmoShelf into:

- a permanent giant sidebar app
- a Notion-style hierarchy
- an emoji social feed
- an AI chatbot
- a clipboard-history clone
- a settings maze
- a Discord clone
- a heavy Electron-feeling utility
- an animation showcase
- a neon Purple/Yellow gaming UI

When uncertain, return to:

```text
Alt + E
   ↓
Shelf
   ↓
Emoji
   ↓
Paste
```

---

# 47. Design success criteria

The UI is successful when:

1. a screenshot immediately communicates “emoji app”,
2. the window feels compact and premium,
3. the user's Board dominates the experience,
4. the catalog feels secondary,
5. the common paste path is obvious,
6. keyboard shortcuts are discoverable,
7. the app does not resemble a Discord clone,
8. emoji artwork provides most of the visual personality,
9. editing is safe and intentional,
10. Purple clearly communicates interaction/selection,
11. Yellow clearly communicates Shelf/favorite warmth,
12. the two accents never overwhelm the emojis,
13. the bottom GitHub / Help / Settings utility area feels natural,
14. the detail panel adds depth without adding friction,
15. the app feels fast enough that users choose it instead of the OS picker.

---

# 48. Implementation reference

For initial implementation, preserve this priority order:

```text
1. Layout and interaction correctness
2. Fast popup / focus restoration
3. Shelf grid usability
4. Detail panel
5. Purple interaction states
6. Yellow Shelf/favorite accents
7. Keyboard navigation
8. Motion polish
9. Decorative effects
```

Do not perfect gradients or glass before the paste workflow feels excellent.

---

# 49. Final design statement

> **EmoShelf is a quiet, fast desktop utility built around colorful personal emoji Boards.**

> **Purple tells you where you are. Yellow tells you what you love.**

> **The emoji are playful. The interface is disciplined.**
