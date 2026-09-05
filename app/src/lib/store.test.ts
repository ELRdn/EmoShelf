import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Board, createInitialState } from "./state";
import { countAssetReferences, getFrequentItems, useShelfStore } from "./store";

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
      recoveredFromBackup: false,
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
      appBoardMappings: { "code.exe": "b", "notepad.exe": "a" },
    });

    useShelfStore.getState().removeBoard("b");
    expect(useShelfStore.getState().boards.map(({ id }) => id)).toEqual([
      "a",
      "c",
    ]);
    expect(useShelfStore.getState().appBoardMappings).toEqual({
      "notepad.exe": "a",
    });

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

  it("accepts only a foreground executable basename for app mappings", () => {
    useShelfStore.setState({ boards: [board("shelf", "Shelf", 0)] });

    expect(
      useShelfStore
        .getState()
        .setAppBoardMapping("C:\\Apps\\code.exe", "shelf"),
    ).toBe(false);
    expect(
      useShelfStore.getState().setAppBoardMapping("code.exe", "missing"),
    ).toBe(false);
    expect(
      useShelfStore.getState().setAppBoardMapping(" CODE.EXE ", "shelf"),
    ).toBe(true);
    expect(useShelfStore.getState().appBoardMappings).toEqual({
      "code.exe": "shelf",
    });

    expect(useShelfStore.getState().setAppBoardMapping("code.exe")).toBe(true);
    expect(useShelfStore.getState().appBoardMappings).toEqual({});
  });

  it("keeps all usage data unchanged when tracking is disabled", () => {
    const initial = createInitialState();
    const item = {
      id: "joy",
      type: "unicode" as const,
      payload: "😂",
      display: { name: "Joy", keywords: [] },
      usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 2 },
    };
    useShelfStore.setState({
      boards: [{ ...board("shelf", "Shelf", 0), items: [item] }],
      settings: { ...initial.settings, usageTrackingEnabled: false },
    });

    useShelfStore.getState().recordItemUse(item);
    useShelfStore.getState().recordUse("🔥");

    expect(useShelfStore.getState().boards[0]?.items[0]?.usage.useCount).toBe(
      2,
    );
    expect(useShelfStore.getState().recent).toEqual([]);
  });

  it("builds a deduplicated frequent view without multiplying one use", () => {
    const first = {
      id: "joy-a",
      type: "unicode" as const,
      payload: "😂",
      display: { name: "Joy", keywords: [] },
      usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 2 },
    };
    const second = {
      ...first,
      id: "joy-b",
      usage: { ...first.usage, useCount: 3 },
    };
    const fire = {
      ...first,
      id: "fire",
      payload: "🔥",
      usage: { ...first.usage, useCount: 4 },
    };
    useShelfStore.setState({
      boards: [
        { ...board("a", "A", 0), items: [first, fire] },
        { ...board("b", "B", 1), items: [second] },
      ],
    });

    useShelfStore.getState().recordItemUse(second);

    expect(
      useShelfStore
        .getState()
        .boards.map((entry) => entry.items.map((item) => item.usage.useCount)),
    ).toEqual([[2, 4], [4]]);
    expect(
      getFrequentItems(useShelfStore.getState().boards).map((item) => [
        item.type === "image" ? item.assetId : item.payload,
        item.usage.useCount,
      ]),
    ).toEqual([
      ["😂", 6],
      ["🔥", 4],
    ]);
  });

  it("resets recents and counters while retaining added dates", () => {
    const item = {
      id: "joy",
      type: "unicode" as const,
      payload: "😂",
      display: { name: "Joy", keywords: [] },
      usage: {
        addedAt: "2026-01-01T00:00:00Z",
        lastUsedAt: "2026-02-01T00:00:00Z",
        useCount: 8,
      },
    };
    useShelfStore.setState({
      boards: [{ ...board("shelf", "Shelf", 0), items: [item] }],
      recent: [
        {
          id: "unicode:😂",
          type: "unicode",
          payload: "😂",
          usedAt: "2026-02-01T00:00:00Z",
        },
      ],
    });

    useShelfStore.getState().resetUsageStatistics();

    expect(useShelfStore.getState().recent).toEqual([]);
    expect(useShelfStore.getState().boards[0]?.items[0]?.usage).toEqual({
      addedAt: "2026-01-01T00:00:00Z",
      useCount: 0,
    });
  });

  it("persists autostart only after the native operation succeeds", async () => {
    mockedInvoke.mockRejectedValueOnce(new Error("registry denied"));

    await expect(useShelfStore.getState().setAutostart(true)).rejects.toThrow(
      "registry denied",
    );
    expect(useShelfStore.getState().settings.autostart).toBe(false);

    mockedInvoke.mockResolvedValueOnce(undefined);
    await useShelfStore.getState().setAutostart(true);
    expect(mockedInvoke).toHaveBeenCalledWith("set_autostart", {
      enabled: true,
    });
    expect(useShelfStore.getState().settings.autostart).toBe(true);
  });

  it("counts Board and Recent references before allowing asset deletion", () => {
    const image = {
      id: "image-item",
      type: "image" as const,
      assetId: "a".repeat(64),
      display: { name: "Custom image", keywords: [] },
      usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 1 },
    };
    const state = createInitialState();
    state.boards = [{ ...board("images", "Images", 0), items: [image] }];
    state.recent = [
      {
        id: `image:${image.assetId}`,
        type: "image",
        assetId: image.assetId,
        usedAt: "2026-01-01T00:00:00Z",
      },
    ];

    expect(countAssetReferences(state, image.assetId)).toBe(2);
  });

  it("surfaces backup recovery after initialization", async () => {
    const initial = createInitialState();
    useShelfStore.setState({ loaded: false, recoveredFromBackup: false });
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_state") {
        return JSON.stringify(initial);
      }
      if (command === "take_recovery_notice") {
        return true;
      }
      return undefined;
    });

    await useShelfStore.getState().initialize();

    expect(useShelfStore.getState().recoveredFromBackup).toBe(true);
    expect(useShelfStore.getState().persistenceBlocked).toBe(false);
  });

  it("creates and restores a validated settings-only backup", async () => {
    const restored = {
      ...createInitialState().settings,
      theme: "light" as const,
      globalShortcut: "Ctrl+Shift+E",
    };
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings_backup") {
        return JSON.stringify({ schemaVersion: 2, settings: restored });
      }
      return undefined;
    });

    await useShelfStore.getState().createSettingsBackup();
    expect(mockedInvoke).toHaveBeenCalledWith("create_settings_backup", {
      content: expect.stringContaining('"schemaVersion":2'),
    });

    await expect(
      useShelfStore.getState().restoreSettingsBackup(),
    ).resolves.toBe(true);
    expect(useShelfStore.getState().settings.theme).toBe("light");
    expect(mockedInvoke).toHaveBeenCalledWith("set_global_shortcut", {
      shortcut: "Ctrl+Shift+E",
    });
  });

  it("registers a deduplicated asset and refuses to delete it while referenced", async () => {
    const id = "b".repeat(64);
    const asset = {
      id,
      fileName: `${id}.png`,
      mediaType: "image/png" as const,
      width: 64,
      height: 64,
      byteLength: 512,
      sha256: id,
      addedAt: "2026-01-01T00:00:00Z",
    };
    useShelfStore.getState().registerCustomAsset(asset);
    useShelfStore.getState().registerCustomAsset(asset);
    const boardId = useShelfStore.getState().addBoard("Images", "▧");
    useShelfStore.getState().addItemToBoard(boardId, {
      type: "image",
      assetId: id,
      display: { name: "Custom image", keywords: [] },
    });

    await expect(useShelfStore.getState().removeCustomAsset(id)).resolves.toBe(
      false,
    );
    expect(Object.keys(useShelfStore.getState().customAssets)).toEqual([id]);
    expect(mockedInvoke).not.toHaveBeenCalledWith(
      "remove_custom_asset",
      expect.anything(),
    );
  });

  it("removes ephemeral Recent references before deleting an unused asset", async () => {
    const id = "c".repeat(64);
    useShelfStore.setState({
      customAssets: {
        [id]: {
          id,
          fileName: `${id}.png`,
          mediaType: "image/png",
          width: 32,
          height: 32,
          byteLength: 256,
          sha256: id,
          addedAt: "2026-01-01T00:00:00Z",
        },
      },
      recent: [
        {
          id: `image:${id}`,
          type: "image",
          assetId: id,
          usedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    mockedInvoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce(true);

    await expect(useShelfStore.getState().removeCustomAsset(id)).resolves.toBe(
      true,
    );
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, "remove_custom_asset", {
      assetId: id,
      stateJson: expect.not.stringContaining(id),
    });
    expect(useShelfStore.getState().customAssets).toEqual({});
    expect(useShelfStore.getState().recent).toEqual([]);
  });
});
