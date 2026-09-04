import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Board, createInitialState } from "./state";
import { useShelfStore } from "./store";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockedInvoke = vi.mocked(invoke);

function board(id: string, name: string, order: number): Board {
  return { id, name, order, items: [] };
}

describe("shelf store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedInvoke.mockReset();
    useShelfStore.setState({
      ...createInitialState(),
      loaded: true,
      loadError: undefined,
      saveError: undefined,
      persistenceBlocked: false,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renames and reorders boards while keeping normalized order", () => {
    useShelfStore.setState({
      boards: [board("a", "Alpha", 0), board("b", "Beta", 1)],
    });

    useShelfStore.getState().renameBoard("b", "  Reactions  ");
    useShelfStore.getState().reorderBoards(1, 0);

    expect(useShelfStore.getState().boards).toMatchObject([
      { id: "b", name: "Reactions", order: 0 },
      { id: "a", name: "Alpha", order: 1 },
    ]);
  });

  it("restores a deleted board at its original position for Undo", () => {
    const removed = board("b", "Beta", 1);
    useShelfStore.setState({
      boards: [board("a", "Alpha", 0), removed, board("c", "Gamma", 2)],
    });

    useShelfStore.getState().removeBoard("b");
    expect(useShelfStore.getState().boards.map(({ id }) => id)).toEqual([
      "a",
      "c",
    ]);

    useShelfStore.getState().restoreBoard(removed, 1);
    expect(
      useShelfStore.getState().boards.map(({ id, order }) => ({ id, order })),
    ).toEqual([
      { id: "a", order: 0 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ]);
  });

  it("does not persist a shortcut that Rust rejects", async () => {
    mockedInvoke.mockRejectedValueOnce(
      new Error("shortcut already registered"),
    );

    await expect(
      useShelfStore.getState().setGlobalShortcut("Ctrl+Shift+E"),
    ).rejects.toThrow("shortcut already registered");

    expect(useShelfStore.getState().settings.globalShortcut).toBe("Alt+E");
  });
});
