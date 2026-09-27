import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type RefObject, useRef } from "react";
import { type AppLocale, findByEmoji } from "../lib/emoji";
import { translate } from "../lib/i18n";
import type { RendererId, ShelfItem } from "../lib/state";
import { CustomAssetArtwork } from "./CustomAssetArtwork";
import { EmojiArtwork } from "./EmojiArtwork";

interface ShelfGridProps {
  items: ShelfItem[];
  locale: AppLocale;
  renderer: RendererId;
  editMode: boolean;
  /** Allows press-and-hold reordering outside edit mode. */
  canReorder?: boolean;
  shelfGlow?: boolean;
  selectedId?: string;
  onSelect: (item: ShelfItem) => void;
  onFocusItem?: (item: ShelfItem) => void;
  onRemove: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function itemLabel(item: ShelfItem, locale: AppLocale): string {
  if (item.type !== "unicode") return item.display.name;
  const entry = findByEmoji(item.payload, locale);
  // Translate catalog names saved in the other language; retain custom labels.
  return entry &&
    [entry.label, entry.alternateLabel].includes(item.display.name)
    ? entry.label
    : item.display.name;
}

function glowClass(item: ShelfItem, enabled: boolean): string {
  if (!enabled || item.usage.useCount <= 0) {
    return "";
  }
  if (item.usage.useCount >= 10) {
    return " has-glow glow-high";
  }
  if (item.usage.useCount >= 4) {
    return " has-glow glow-medium";
  }
  return " has-glow glow-low";
}

function SortableShelfItem({
  item,
  locale,
  renderer,
  selected,
  onSelect,
  onRemove,
  shelfGlow,
}: {
  item: ShelfItem;
  locale: AppLocale;
  renderer: RendererId;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  shelfGlow: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });
  return (
    <li
      className={`emoji-tile shelf-tile is-editable${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}${glowClass(item, shelfGlow)}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={`${itemLabel(item, locale)} — ${locale === "ja" ? "並べ替え" : "reorder"}`}
        className="tile-main-button"
        onClick={onSelect}
        type="button"
        {...attributes}
        {...listeners}
      >
        {item.type === "image" ? (
          <CustomAssetArtwork assetId={item.assetId} className="emoji-art" />
        ) : (
          <EmojiArtwork
            className="emoji-art"
            emoji={item.payload}
            locale={locale}
            renderer={renderer}
          />
        )}
        <span className="drag-grip" aria-hidden="true">
          ⠿
        </span>
      </button>
      <button
        aria-label={`${translate(locale, "removeFromShelf")}: ${itemLabel(item, locale)}`}
        className="tile-remove-button"
        onClick={onRemove}
        type="button"
      >
        ×
      </button>
    </li>
  );
}

// Hold this long before a tile lifts, so a normal click still pastes.
const LONG_PRESS_MS = 350;

function PressSortableShelfItem({
  item,
  locale,
  renderer,
  selected,
  shelfGlow,
  suppressClick,
  onSelect,
  onFocusItem,
}: {
  item: ShelfItem;
  locale: AppLocale;
  renderer: RendererId;
  selected: boolean;
  shelfGlow: boolean;
  suppressClick: RefObject<boolean>;
  onSelect: () => void;
  onFocusItem?: () => void;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={itemLabel(item, locale)}
        data-shelf-item-id={item.id}
        className={`emoji-tile shelf-tile${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}${glowClass(item, shelfGlow)}`}
        onClick={() => {
          if (!suppressClick.current) onSelect();
        }}
        onFocus={onFocusItem}
        title={itemLabel(item, locale)}
        type="button"
        {...listeners}
      >
        {item.type === "image" ? (
          <CustomAssetArtwork assetId={item.assetId} className="emoji-art" />
        ) : (
          <EmojiArtwork
            className="emoji-art"
            emoji={item.payload}
            locale={locale}
            renderer={renderer}
          />
        )}
      </button>
    </li>
  );
}

export function ShelfGrid({
  items,
  locale,
  renderer,
  editMode,
  canReorder = false,
  shelfGlow = false,
  selectedId,
  onSelect,
  onFocusItem,
  onRemove,
  onReorder,
}: ShelfGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // Outside edit mode only a held pointer reorders; Enter and clicks keep pasting.
  const pressSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: LONG_PRESS_MS, tolerance: 8 },
    }),
  );
  const suppressClick = useRef(false);

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = items.findIndex((item) => item.id === active.id);
    const toIndex = items.findIndex((item) => item.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      arrayMove(items, fromIndex, toIndex);
      onReorder(fromIndex, toIndex);
    }
  };

  if (editMode) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="shelf-grid">
            {items.map((item) => (
              <SortableShelfItem
                item={item}
                key={item.id}
                locale={locale}
                onRemove={() => onRemove(item.id)}
                onSelect={() => onSelect(item)}
                renderer={renderer}
                selected={selectedId === item.id}
                shelfGlow={shelfGlow}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    );
  }

  if (canReorder) {
    const release = () => {
      // The click that ends a drag arrives after dragEnd; ignore it.
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    };
    return (
      <DndContext
        collisionDetection={closestCenter}
        onDragCancel={release}
        onDragEnd={(event) => {
          dragEnd(event);
          release();
        }}
        onDragStart={() => {
          suppressClick.current = true;
        }}
        sensors={pressSensors}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="shelf-grid">
            {items.map((item) => (
              <PressSortableShelfItem
                item={item}
                key={item.id}
                locale={locale}
                onFocusItem={onFocusItem ? () => onFocusItem(item) : undefined}
                onSelect={() => onSelect(item)}
                renderer={renderer}
                selected={selectedId === item.id}
                shelfGlow={shelfGlow}
                suppressClick={suppressClick}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <ul className="shelf-grid">
      {items.map((item) => {
        return (
          <li key={item.id}>
            <button
              aria-label={itemLabel(item, locale)}
              data-shelf-item-id={item.id}
              className={`emoji-tile shelf-tile${selectedId === item.id ? " is-selected" : ""}${glowClass(item, shelfGlow)}`}
              onClick={() => onSelect(item)}
              onFocus={() => onFocusItem?.(item)}
              title={itemLabel(item, locale)}
              type="button"
            >
              {item.type === "image" ? (
                <CustomAssetArtwork
                  assetId={item.assetId}
                  className="emoji-art"
                />
              ) : (
                <EmojiArtwork
                  className="emoji-art"
                  emoji={item.payload}
                  locale={locale}
                  renderer={renderer}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
