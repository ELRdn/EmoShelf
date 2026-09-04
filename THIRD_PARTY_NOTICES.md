# Third-party notices

EmoShelf includes or depends on the following third-party works. This file is
provided for attribution and does not change the license of EmoShelf itself.

## Twemoji graphics

- Project: [jdecked/twemoji](https://github.com/jdecked/twemoji)
- Copyright: Twitter, Inc. and other contributors
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)

EmoShelf distributes Twemoji SVG graphics locally so emoji rendering does not
require a network connection. The Unicode text copied or pasted by EmoShelf is
independent from these graphics.

## @twemoji/svg package

- Package: `@twemoji/svg`
- Copyright: 2023 Samuel Kopp
- License: MIT

The complete dependency license inventory will be regenerated and audited for
the v1.0 release package.

## Optional renderer packs (not bundled in v0.4)

The application can install the following renderers through its signed
Renderer Pack system. Their artwork is not distributed in the v0.4 application
package and remains unavailable until a compatible pack signed by the trusted
EmoShelf renderer key is installed and enabled.

- Fluent Emoji graphics — Microsoft, MIT License
- Noto Emoji SVG/image resources — Google, Apache License 2.0; the font files
  use the SIL Open Font License 1.1
- OpenMoji graphics — OpenMoji contributors, CC BY-SA 4.0; related code uses
  LGPL-3.0

Each pack must carry its exact upstream license and attribution files. EmoShelf
shows that metadata in the renderer settings before the pack can be used.
