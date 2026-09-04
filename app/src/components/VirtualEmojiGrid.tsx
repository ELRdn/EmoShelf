import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLocale, CatalogEntry } from "../lib/emoji";
import type { RendererId } from "../lib/state";
import { EmojiArtwork } from "./EmojiArtwork";

interface VirtualEmojiGridProps {
  entries: CatalogEntry[];
  locale: AppLocale;
  renderer: RendererId;
  selectedEmoji?: string;
  picked?: ReadonlySet<string>;
  onSelect: (entry: CatalogEntry) => void;
  className?: string;
}

export function VirtualEmojiGrid({
  entries,
  locale,
  renderer,
  selectedEmoji,
  picked,
  onSelect,
  className,
}: VirtualEmojiGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const columns = Math.max(4, Math.floor(width / 72));
  const rows = Math.ceil(entries.length / columns);
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 74,
    overscan: 5,
  });
  const visibleRows = virtualizer.getVirtualItems();
  const gridTemplateColumns = useMemo(
    () => `repeat(${columns}, minmax(0, 1fr))`,
    [columns],
  );
  const selectedIndex = selectedEmoji
    ? entries.findIndex((entry) => entry.emoji === selectedEmoji)
    : -1;

  useEffect(() => {
    if (selectedIndex < 0) {
      return;
    }
    virtualizer.scrollToIndex(Math.floor(selectedIndex / columns), {
      align: "auto",
    });
  }, [columns, selectedIndex, virtualizer]);

  return (
    <section
      aria-label={locale === "ja" ? "絵文字一覧" : "Emoji list"}
      className={["virtual-grid-scroll", className].filter(Boolean).join(" ")}
      ref={scrollRef}
    >
      <div
        className="virtual-grid-canvas"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {visibleRows.map((row) => {
          const start = row.index * columns;
          const rowEntries = entries.slice(start, start + columns);
          return (
            <div
              className="virtual-grid-row"
              key={row.key}
              style={{
                gridTemplateColumns,
                transform: `translateY(${row.start}px)`,
              }}
            >
              {rowEntries.map((entry, columnIndex) => {
                const isSelected = selectedEmoji === entry.emoji;
                const isPicked = picked?.has(entry.emoji) ?? false;
                return (
                  <button
                    aria-label={entry.label}
                    aria-pressed={isPicked || undefined}
                    className={`emoji-tile${isSelected ? " is-selected" : ""}${isPicked ? " is-picked" : ""}`}
                    data-catalog-index={start + columnIndex}
                    key={entry.hexcode}
                    onClick={() => onSelect(entry)}
                    title={entry.label}
                    type="button"
                  >
                    <EmojiArtwork
                      className="emoji-art"
                      emoji={entry.emoji}
                      hexcode={entry.hexcode}
                      locale={locale}
                      renderer={renderer}
                    />
                    {isPicked ? <span className="picked-mark">✓</span> : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
