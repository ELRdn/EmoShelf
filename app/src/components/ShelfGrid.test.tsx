import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ShelfItem } from "../lib/state";
import { ShelfGrid } from "./ShelfGrid";

it("localizes saved emoji labels when the language changes without rewriting the shelf", () => {
  const item: ShelfItem = {
    id: "fire",
    type: "unicode",
    payload: "🔥",
    display: { name: "火", keywords: [] },
    usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
  };
  const props = {
    items: [item],
    renderer: "native" as const,
    editMode: false,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
  };
  const { rerender } = render(<ShelfGrid {...props} locale="ja" />);
  expect(screen.getByRole("button", { name: "火" })).toHaveAttribute(
    "title",
    "火",
  );
  rerender(<ShelfGrid {...props} locale="en" />);
  expect(screen.getByRole("button", { name: "fire" })).toHaveAttribute(
    "title",
    "fire",
  );
  rerender(<ShelfGrid {...props} locale="en" editMode />);
  expect(screen.getByRole("button", { name: "fire — reorder" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: /Remove from Shelf: fire/i }),
  ).toBeVisible();
  expect(item.display.name).toBe("火");
  const customItem = {
    ...item,
    display: { ...item.display, name: "My hot take" },
  };
  rerender(<ShelfGrid {...props} items={[customItem]} locale="en" />);
  expect(screen.getByRole("button", { name: "My hot take" })).toBeVisible();
});
