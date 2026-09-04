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

  it("saves and edits a reusable emoji sequence", () => {
    const boardId = useShelfStore.getState().addBoard("Sequences", "✨");
    const itemId = useShelfStore
      .getState()
      .saveSequence(boardId, "😭🙏", "Please");

    expect(itemId).toBeTruthy();
    expect(useShelfStore.getState().boards[0]?.items[0]).toMatchObject({
      id: itemId,
      type: "sequence",
      payload: "😭🙏",
      display: { name: "Please" },
    });

    expect(
      useShelfStore
        .getState()
        .editSequence(boardId, itemId ?? "", "👀🍿", "Watching"),
    ).toBe(true);
    expect(useShelfStore.getState().boards[0]?.items[0]).toMatchObject({
      payload: "👀🍿",
      display: { name: "Watching" },
    });
  });

  it("replaces imported state only after immediately persisting it", async () => {
    const incoming = createInitialState();
    incoming.onboardingCompleted = true;
    incoming.boards = [
      { id: "imported", name: "Imported", order: 0, items: [] },
    ];

    await useShelfStore.getState().applyImportedState(incoming, "replace");

    expect(invoke).toHaveBeenCalledWith("save_state", {
      content: expect.stringContaining('"name":"Imported"'),
    });
    expect(useShelfStore.getState().boards[0]?.name).toBe("Imported");
  });

  it("restores the previous shortcut when a replace import cannot be saved", async () => {
    const incoming = createInitialState();
    incoming.settings.globalShortcut = "Ctrl+Shift+E";
    incoming.boards = [
      { id: "imported", name: "Imported", order: 0, items: [] },
    ];
    mockedInvoke
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValueOnce(undefined);

    await expect(
      useShelfStore.getState().applyImportedState(incoming, "replace"),
    ).rejects.toThrow("disk full");

    expect(mockedInvoke).toHaveBeenNthCalledWith(1, "set_global_shortcut", {
      shortcut: "Ctrl+Shift+E",
    });
    expect(mockedInvoke).toHaveBeenNthCalledWith(3, "set_global_shortcut", {
      shortcut: "Alt+E",
    });
    expect(useShelfStore.getState().settings.globalShortcut).toBe("Alt+E");
    expect(useShelfStore.getState().boards).toEqual([]);
  });
});
