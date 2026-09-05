# Third-Party Notices

EmoShelf application code is Apache-2.0. The following works are bundled, used at runtime, or offered as separately signed renderer packs under their own terms.

## Emoji artwork and metadata

### Twemoji

- Project: [jdecked/twemoji](https://github.com/jdecked/twemoji)
- Artwork license: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: “Twemoji graphics licensed under CC-BY 4.0”

Twemoji SVG artwork is the default bundled renderer. The optimized `@twemoji/svg` packaging code is MIT licensed; that package does not replace the artwork's CC BY 4.0 terms.

### Emojibase

- Project: [milesj/emojibase](https://github.com/milesj/emojibase)
- License: MIT

Emojibase and emojibase-data provide Unicode emoji metadata, English/Japanese labels, tags, and search data.

## Optional signed renderer packs

Renderer packs are separate GitHub Release assets and are not part of the core installer. Every pack contains its own `LICENSE.txt` and a manifest with source commit, attribution, hashes, compatibility range, and signing-key ID.

| Pack | Upstream | Artwork license | Pinned source |
| --- | --- | --- | --- |
| Fluent Emoji Color | [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji) | MIT | `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc` |
| Noto Color Emoji | [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 | `8998f5dd683424a73e2314a8c1f1e359c19e8742` |
| OpenMoji Color | [hfg-gmuend/openmoji](https://github.com/hfg-gmuend/openmoji) | CC BY-SA 4.0 | `aeb8bb3a59e2de39c754ac79180c8131c906acea` |

OpenMoji adaptations in an EmoShelf renderer pack remain under CC BY-SA 4.0. The pack generation process only normalizes safe SVG presentation attributes and file names; it preserves attribution and distributes the upstream license.

## Application libraries

The shipped application uses:

- React and React DOM — MIT
- Tauri and official Tauri plugins — Apache-2.0 OR MIT
- dnd-kit — MIT
- TanStack Virtual — MIT
- Zustand — MIT
- Zod — MIT
- Rust Serde, image, zip, sha2, semver, Ed25519, Windows bindings, resvg, and their transitive dependencies under the licenses declared by the locked crates

Exact JavaScript and Rust versions are reproducibly recorded in `app/pnpm-lock.yaml` and `app/src-tauri/Cargo.lock`. Release builds use frozen/locked installation and the source repository includes the corresponding application license.

## Brand artwork

The EmoShelf sunglasses-face-and-purple-shelf application icon was created specifically for EmoShelf from the project's own design reference, without modifying or redistributing the reference image as the output asset. It is distributed with the application under Apache-2.0.

## No implied endorsement

Use of a project name identifies the upstream work and license. It does not imply that Microsoft, Google, HfG Schwäbisch Gmünd, the Twemoji maintainers, or other dependency authors endorse EmoShelf.
