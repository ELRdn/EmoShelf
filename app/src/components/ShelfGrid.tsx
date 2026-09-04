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
import type { AppLocale } from "../lib/emoji";
import { translate } from "../lib/i18n";
import type { RendererId, ShelfItem } from "../lib/state";
import { EmojiArtwork } from "./EmojiArtwork";

interface ShelfGridProps {
  items: ShelfItem[];
  locale: AppLocale;
  renderer: RendererId;
  editMode: boolean;
  selectedId?: string;
  onSelect: (item: ShelfItem) => void;
  onRemove: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function SortableShelfItem({
  item,
  locale,
  renderer,
  selected,
  onSelect,
  onRemove,
}: {
  item: ShelfItem;
  locale: AppLocale;
  renderer: RendererId;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
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
  const payload = item.type === "image" ? "🖼️" : item.payload;
  return (
    <li
      className={`emoji-tile shelf-tile is-editable${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={`${item.display.name} — ${locale === "ja" ? "並べ替え" : "reorder"}`}
        className="tile-main-button"
        onClick={onSelect}
        type="button"
        {...attributes}
        {...listeners}
      >
        <EmojiArtwork
          className="emoji-art"
          emoji={payload}
          locale={locale}
          renderer={renderer}
        />
        <span className="drag-grip" aria-hidden="true">
          ⠿
        </span>
      </button>
      <button
        aria-label={`${translate(locale, "removeFromShelf")}: ${item.display.name}`}
        className="tile-remove-button"
        onClick={onRemove}
        type="button"
      >
        ×
      </button>
    </li>
  );
}

export function ShelfGrid({
  items,
  locale,
  renderer,
  editMode,
  selectedId,
  onSelect,
  onRemove,
  onReorder,
}: ShelfGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
        const payload = item.type === "image" ? "🖼️" : item.payload;
        return (
          <li key={item.id}>
            <button
              aria-label={item.display.name}
              className={`emoji-tile shelf-tile${selectedId === item.id ? " is-selected" : ""}`}
              onClick={() => onSelect(item)}
              title={item.display.name}
              type="button"
            >
              <EmojiArtwork
                className="emoji-art"
                emoji={payload}
                locale={locale}
                renderer={renderer}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
