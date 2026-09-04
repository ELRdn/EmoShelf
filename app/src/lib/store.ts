import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import {
  type AppState,
  type Board,
  createInitialState,
  FutureStateVersionError,
  type NewShelfItem,
  parseAppState,
  type Settings,
  type ShelfItem,
  type TextShelfItem,
} from "./state";

const MAX_RECENT = 30;
const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function snapshotState(state: ShelfStore): AppState {
  return {
    schemaVersion: state.schemaVersion,
    boards: state.boards,
    recent: state.recent,
    settings: state.settings,
    onboardingCompleted: state.onboardingCompleted,
    appBoardMappings: state.appBoardMappings,
    customAssets: state.customAssets,
    extensions: state.extensions,
  };
}

function serialize(state: ShelfStore): string {
  return JSON.stringify(snapshotState(state));
}

function scheduleSave(state: ShelfStore): void {
  if (state.persistenceBlocked) {
    return;
  }
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    invoke("save_state", { content: serialize(state) }).catch((error) => {
      useShelfStore.setState({ saveError: String(error) });
      console.error("EmoShelf: state save failed", error);
    });
  }, SAVE_DEBOUNCE_MS);
}

function createShelfItem(input: NewShelfItem): ShelfItem {
  const base = {
    id: crypto.randomUUID(),
    display: input.display,
    usage: { addedAt: new Date().toISOString(), useCount: 0 },
  };
  return input.type === "image"
    ? { ...base, type: "image", assetId: input.assetId }
    : { ...base, type: input.type, payload: input.payload };
}

function itemKey(item: ShelfItem): string {
  return item.type === "image"
    ? `image:${item.assetId}`
    : `${item.type}:${item.payload}`;
}

function normalizeBoards(boards: Board[]): Board[] {
  return boards.map((board, order) => ({ ...board, order }));
}

export interface ShelfStore extends AppState {
  loaded: boolean;
  loadError?: string;
  saveError?: string;
  persistenceBlocked: boolean;
  initialize: () => Promise<void>;
  persistNow: () => Promise<void>;
  addBoard: (name: string, icon?: string) => string;
  renameBoard: (boardId: string, name: string) => void;
  setBoardIcon: (boardId: string, icon: string | undefined) => void;
  reorderBoards: (fromIndex: number, toIndex: number) => void;
  removeBoard: (boardId: string) => void;
  restoreBoard: (board: Board, index: number) => void;
  addItemToBoard: (boardId: string, input: NewShelfItem) => string | null;
  removeItemFromBoard: (boardId: string, itemId: string) => void;
  moveItemWithinBoard: (
    boardId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  moveItemToBoard: (
    fromBoardId: string,
    toBoardId: string,
    itemId: string,
  ) => void;
  copyItemToBoard: (
    fromBoardId: string,
    toBoardId: string,
    itemId: string,
  ) => void;
  recordUse: (payload: string) => void;
  recordItemUse: (item: ShelfItem) => void;
  clearRecents: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
  setGlobalShortcut: (shortcut: string) => Promise<void>;
  finishOnboarding: (items: NewShelfItem[]) => string;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  resetAll: () => void;
  clearSaveError: () => void;
}

function withSave(
  set: (partial: Partial<ShelfStore>) => void,
  get: () => ShelfStore,
  partial: Partial<ShelfStore>,
): void {
  set({ ...partial, saveError: undefined });
  scheduleSave(get());
}

export const useShelfStore = create<ShelfStore>()((set, get) => ({
  ...createInitialState(),
  loaded: false,
  persistenceBlocked: false,

  initialize: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const raw = await invoke<string | null>("load_state");
      if (raw !== null) {
        const parsed = parseAppState(JSON.parse(raw) as unknown);
        set({ ...parsed, loaded: true, loadError: undefined });
      } else {
        set({ loaded: true });
      }
    } catch (error) {
      const blocked = error instanceof FutureStateVersionError;
      set({
        loaded: true,
        persistenceBlocked: blocked,
        loadError: blocked
          ? "このデータは新しいEmoShelfで作成されています。上書きを防ぐため読み取り専用で起動しました。"
          : "保存データを読み込めなかったため、初期状態で起動しました。",
      });
      console.error("EmoShelf: state load failed", error);
    }

    try {
      await invoke("set_global_shortcut", {
        shortcut: get().settings.globalShortcut,
      });
    } catch (error) {
      console.error("EmoShelf: shortcut register failed", error);
    }
  },

  persistNow: async () => {
    if (get().persistenceBlocked) {
      throw new Error("state persistence is blocked for a future schema");
    }
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await invoke("save_state", { content: serialize(get()) });
    set({ saveError: undefined });
  },

  addBoard: (name, icon) => {
    const board: Board = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 48) || "Board",
      order: get().boards.length,
      items: [],
      ...(icon ? { icon } : {}),
    };
    withSave(set, get, { boards: [...get().boards, board] });
    return board.id;
  },

  renameBoard: (boardId, name) => {
    const safeName = name.trim().slice(0, 48);
    if (!safeName) {
      return;
    }
    withSave(set, get, {
      boards: get().boards.map((board) =>
        board.id === boardId ? { ...board, name: safeName } : board,
      ),
    });
  },

  setBoardIcon: (boardId, icon) => {
    withSave(set, get, {
      boards: get().boards.map((board) =>
        board.id === boardId ? { ...board, icon } : board,
      ),
    });
  },

  reorderBoards: (fromIndex, toIndex) => {
    const boards = [...get().boards];
    if (
      fromIndex < 0 ||
      fromIndex >= boards.length ||
      toIndex < 0 ||
      toIndex >= boards.length
    ) {
      return;
    }
    const [moved] = boards.splice(fromIndex, 1);
    if (!moved) {
      return;
    }
    boards.splice(toIndex, 0, moved);
    withSave(set, get, { boards: normalizeBoards(boards) });
  },

  removeBoard: (boardId) => {
    const boards = get().boards;
    if (boards.length <= 1) {
      return;
    }
    const nextBoards = normalizeBoards(
      boards.filter((board) => board.id !== boardId),
    );
    const settings =
      get().settings.defaultBoardId === boardId
        ? { ...get().settings, defaultBoardId: nextBoards[0]?.id }
        : get().settings;
    withSave(set, get, { boards: nextBoards, settings });
  },

  restoreBoard: (board, index) => {
    const boards = [...get().boards];
    boards.splice(Math.max(0, Math.min(index, boards.length)), 0, board);
    withSave(set, get, { boards: normalizeBoards(boards) });
  },

  addItemToBoard: (boardId, input) => {
    const item = createShelfItem(input);
    let added = false;
    const boards = get().boards.map((board) => {
      if (
        board.id !== boardId ||
        board.items.some((entry) => itemKey(entry) === itemKey(item))
      ) {
        return board;
      }
      added = true;
      return { ...board, items: [...board.items, item] };
    });
    if (!added) {
      return null;
    }
    withSave(set, get, { boards });
    return item.id;
  },

  removeItemFromBoard: (boardId, itemId) => {
    withSave(set, get, {
      boards: get().boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              items: board.items.filter((item) => item.id !== itemId),
            }
          : board,
      ),
    });
  },

  moveItemWithinBoard: (boardId, fromIndex, toIndex) => {
    const boards = get().boards.map((board) => {
      if (board.id !== boardId) {
        return board;
      }
      const items = [...board.items];
      if (
        fromIndex < 0 ||
        fromIndex >= items.length ||
        toIndex < 0 ||
        toIndex >= items.length
      ) {
        return board;
      }
      const [moved] = items.splice(fromIndex, 1);
      if (!moved) {
        return board;
      }
      items.splice(toIndex, 0, moved);
      return { ...board, items };
    });
    withSave(set, get, { boards });
  },

  moveItemToBoard: (fromBoardId, toBoardId, itemId) => {
    if (fromBoardId === toBoardId) {
      return;
    }
    const boards = get().boards;
    const item = boards
      .find((board) => board.id === fromBoardId)
      ?.items.find((entry) => entry.id === itemId);
    const target = boards.find((board) => board.id === toBoardId);
    if (
      !item ||
      !target ||
      target.items.some((entry) => itemKey(entry) === itemKey(item))
    ) {
      return;
    }
    withSave(set, get, {
      boards: boards.map((board) => {
        if (board.id === fromBoardId) {
          return {
            ...board,
            items: board.items.filter((entry) => entry.id !== itemId),
          };
        }
        if (board.id === toBoardId) {
          return { ...board, items: [...board.items, item] };
        }
        return board;
      }),
    });
  },

  copyItemToBoard: (fromBoardId, toBoardId, itemId) => {
    const sourceItem = get()
      .boards.find((board) => board.id === fromBoardId)
      ?.items.find((entry) => entry.id === itemId);
    if (!sourceItem) {
      return;
    }
    const input: NewShelfItem =
      sourceItem.type === "image"
        ? {
            type: "image",
            assetId: sourceItem.assetId,
            display: sourceItem.display,
          }
        : {
            type: sourceItem.type,
            payload: sourceItem.payload,
            display: sourceItem.display,
          };
    get().addItemToBoard(toBoardId, input);
  },

  recordUse: (payload) => {
    const item = get()
      .boards.flatMap((board) => board.items)
      .find(
        (entry): entry is TextShelfItem =>
          entry.type !== "image" && entry.payload === payload,
      );
    if (item) {
      get().recordItemUse(item);
      return;
    }
    const now = new Date().toISOString();
    const recentEntry = {
      id: `unicode:${payload}`,
      type: "unicode" as const,
      payload,
      usedAt: now,
    };
    withSave(set, get, {
      recent: [
        recentEntry,
        ...get().recent.filter((entry) => entry.payload !== payload),
      ].slice(0, MAX_RECENT),
    });
  },

  recordItemUse: (item) => {
    const now = new Date().toISOString();
    const key = itemKey(item);
    const recentEntry =
      item.type === "image"
        ? { id: key, type: item.type, assetId: item.assetId, usedAt: now }
        : { id: key, type: item.type, payload: item.payload, usedAt: now };
    const boards = get().boards.map((board) => ({
      ...board,
      items: board.items.map((entry) =>
        itemKey(entry) === key
          ? {
              ...entry,
              usage: {
                ...entry.usage,
                lastUsedAt: now,
                useCount: get().settings.usageTrackingEnabled
                  ? entry.usage.useCount + 1
                  : entry.usage.useCount,
              },
            }
          : entry,
      ),
    }));
    withSave(set, get, {
      recent: [
        recentEntry,
        ...get().recent.filter((entry) => entry.id !== key),
      ].slice(0, MAX_RECENT),
      boards,
    });
  },

  clearRecents: () => withSave(set, get, { recent: [] }),

  updateSettings: (partial) => {
    const { globalShortcut, ...immediate } = partial;
    if (Object.keys(immediate).length > 0) {
      withSave(set, get, { settings: { ...get().settings, ...immediate } });
    }
    if (
      globalShortcut !== undefined &&
      globalShortcut !== get().settings.globalShortcut
    ) {
      void get().setGlobalShortcut(globalShortcut);
    }
  },

  setGlobalShortcut: async (shortcut) => {
    const normalized = shortcut.trim();
    await invoke("set_global_shortcut", { shortcut: normalized });
    withSave(set, get, {
      settings: { ...get().settings, globalShortcut: normalized },
    });
  },

  finishOnboarding: (inputs) => {
    const id = crypto.randomUUID();
    const board: Board = {
      id,
      name: "My Shelf",
      icon: "✨",
      order: 0,
      items: inputs.map(createShelfItem),
    };
    withSave(set, get, {
      boards: [board],
      onboardingCompleted: true,
      settings: { ...get().settings, defaultBoardId: id },
    });
    return id;
  },

  completeOnboarding: () => {
    if (get().boards.length === 0) {
      get().finishOnboarding([]);
    } else {
      withSave(set, get, { onboardingCompleted: true });
    }
  },

  resetOnboarding: () => withSave(set, get, { onboardingCompleted: false }),

  resetAll: () => {
    const initial = createInitialState();
    set({
      ...initial,
      loadError: undefined,
      saveError: undefined,
      persistenceBlocked: false,
    });
    scheduleSave(get());
    void invoke("set_global_shortcut", {
      shortcut: initial.settings.globalShortcut,
    }).catch((error) => {
      console.error("EmoShelf: shortcut register failed", error);
    });
  },

  clearSaveError: () => set({ saveError: undefined }),
}));
