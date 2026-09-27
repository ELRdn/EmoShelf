import type { EmojiSize } from "./state";

/** Catalog grid metrics per size. Tile and glyph sizes live in App.css. */
export const catalogGridMetrics: Record<
  EmojiSize,
  { columnWidth: number; rowHeight: number }
> = {
  small: { columnWidth: 72, rowHeight: 74 },
  medium: { columnWidth: 86, rowHeight: 88 },
  large: { columnWidth: 100, rowHeight: 102 },
};
