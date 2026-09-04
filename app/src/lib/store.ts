// EmoShelf の状態ストア（zustand）。
// UI コンポーネントは持たない。データ操作・永続化・設定反映の基盤のみ。
// 保存先・形式の仕様は app/docs/persistence.md、型は ./state.ts が正本。

import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import {
  type AppState,
  type Board,
  createInitialState,
  type Settings,
  type ShelfItem,
  STATE_SCHEMA_VERSION,
} from "./state";

/** 最近使った絵文字の最大保持件数。 */
const MAX_RECENT = 30;
/** 保存のデバウンス時間（連続操作時の書き込み抑制用）。 */
const SAVE_DEBOUNCE_MS = 300;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** ストアの状態から AppState 部分だけを抜き出して JSON 化する。 */
function serialize(state: ShelfStore): string {
  const snapshot: AppState = {
    schemaVersion: state.schemaVersion,
    boards: state.boards,
    recent: state.recent,
    settings: state.settings,
    onboardingCompleted: state.onboardingCompleted,
  };
  return JSON.stringify(snapshot);
}

/** 保存をデバウンスして予約する。 */
function scheduleSave(state: ShelfStore): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    invoke("save_state", { content: serialize(state) }).catch((error) => {
      console.error("EmoShelf: state save failed", error);
    });
  }, SAVE_DEBOUNCE_MS);
}

/** 読み込んだ生データの形（検証前のため全フィールド unknown）。 */
interface LoadedState {
  schemaVersion?: unknown;
  boards?: unknown;
  recent?: unknown;
  settings?: unknown;
  onboardingCompleted?: unknown;
}

/** 読み込んだ生データを検証しながら初期状態へマージする。 */
function mergeLoaded(raw: unknown): AppState {
  const base = createInitialState();
  if (typeof raw !== "object" || raw === null) {
    return base;
  }
  const data = raw as LoadedState;
  // スキーマ版が違うデータは将来の migrateState() で扱う。
  // 現時点では安全のため初期状態で起動する。
  if (data.schemaVersion !== STATE_SCHEMA_VERSION) {
    return base;
  }
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    boards: Array.isArray(data.boards) ? (data.boards as Board[]) : base.boards,
    recent: Array.isArray(data.recent)
      ? (data.recent as AppState["recent"])
      : base.recent,
    settings: {
      ...base.settings,
      ...((data.settings as Partial<Settings>) ?? {}),
    },
    onboardingCompleted: data.onboardingCompleted === true,
  };
}

/** ShelfItem の新規作成（id・利用状況は自動採番）。 */
function createShelfItem(input: Omit<ShelfItem, "id" | "usage">): ShelfItem {
  return {
    ...input,
    id: crypto.randomUUID(),
    usage: {
      addedAt: new Date().toISOString(),
      useCount: 0,
    },
  };
}

export interface ShelfStore extends AppState {
  /** 起動時の読み込みが完了したかどうか。 */
  loaded: boolean;
  /** 起動処理: 保存済み状態の読み込み＋ショートカット登録。 */
  initialize: () => Promise<void>;
  /** 即時保存（終了時・テスト用）。 */
  persistNow: () => Promise<void>;
  /** Board を追加して id を返す。 */
  addBoard: (name: string, icon?: string) => string;
  /** Board 名を変更する。 */
  renameBoard: (boardId: string, name: string) => void;
  /** Board アイコンを変更する。 */
  setBoardIcon: (boardId: string, icon: string | undefined) => void;
  /** Board を削除する（最後の 1 枚は保護）。 */
  removeBoard: (boardId: string) => void;
  /** Board にアイテムを追加して id を返す。 */
  addItemToBoard: (
    boardId: string,
    input: Omit<ShelfItem, "id" | "usage">,
  ) => string | null;
  /** Board からアイテムを外す。 */
  removeItemFromBoard: (boardId: string, itemId: string) => void;
  /** 同一 Board 内でアイテムを並べ替える。 */
  moveItemWithinBoard: (
    boardId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  /** アイテムを別 Board へ移動する。 */
  moveItemToBoard: (
    fromBoardId: string,
    toBoardId: string,
    itemId: string,
  ) => void;
  /** アイテムを別 Board へコピーする。 */
  copyItemToBoard: (
    fromBoardId: string,
    toBoardId: string,
    itemId: string,
  ) => void;
  /** 使用を記録する（recent 更新＋使用回数加算）。 */
  recordUse: (payload: string) => void;
  /** 設定を部分更新する（ショートカット変更時は再登録）。 */
  updateSettings: (partial: Partial<Settings>) => void;
  /** オンボーディング完了を記録する。 */
  completeOnboarding: () => void;
  /** ローカルデータを初期化する（設定の Reset 用）。 */
  resetAll: () => void;
}

function withSave(
  set: (partial: Partial<ShelfStore>) => void,
  get: () => ShelfStore,
  partial: Partial<ShelfStore>,
): void {
  set(partial);
  scheduleSave(get());
}

export const useShelfStore = create<ShelfStore>()((set, get) => ({
  ...createInitialState(),
  loaded: false,

  initialize: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const raw = await invoke<string | null>("load_state");
      if (raw !== null) {
        const merged = mergeLoaded(JSON.parse(raw) as unknown);
        set({ ...merged, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch (error) {
      // 保存が読めなくても起動は止めない（初期状態で続行）
      console.error("EmoShelf: state load failed", error);
      set({ loaded: true });
    }
    // 設定のショートカットを登録（失敗時は Rust 側の既定 Alt+E が生きる）
    try {
      await invoke("set_global_shortcut", {
        shortcut: get().settings.globalShortcut,
      });
    } catch (error) {
      console.error("EmoShelf: shortcut register failed", error);
    }
  },

  persistNow: async () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await invoke("save_state", { content: serialize(get()) });
  },

  addBoard: (name, icon) => {
    const board: Board = {
      id: crypto.randomUUID(),
      name,
      order: get().boards.length,
      items: [],
      ...(icon !== undefined ? { icon } : {}),
    };
    withSave(set, get, { boards: [...get().boards, board] });
    return board.id;
  },

  renameBoard: (boardId, name) => {
    withSave(set, get, {
      boards: get().boards.map((board) =>
        board.id === boardId ? { ...board, name } : board,
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

  removeBoard: (boardId) => {
    const boards = get().boards;
    if (boards.length <= 1) {
      return;
    }
    withSave(set, get, {
      boards: boards
        .filter((board) => board.id !== boardId)
        .map((board, index) => ({ ...board, order: index })),
    });
  },

  addItemToBoard: (boardId, input) => {
    const item = createShelfItem(input);
    let added = false;
    const boards = get().boards.map((board) => {
      if (board.id !== boardId) {
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
      if (moved === undefined) {
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
    const source = boards.find((board) => board.id === fromBoardId);
    const targetExists = boards.some((board) => board.id === toBoardId);
    const item = source?.items.find((entry) => entry.id === itemId);
    if (source === undefined || !targetExists || item === undefined) {
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
    const boards = get().boards;
    const source = boards.find((board) => board.id === fromBoardId);
    const targetExists = boards.some((board) => board.id === toBoardId);
    const item = source?.items.find((entry) => entry.id === itemId);
    if (source === undefined || !targetExists || item === undefined) {
      return;
    }
    const copied: ShelfItem = {
      ...item,
      id: crypto.randomUUID(),
      usage: { addedAt: new Date().toISOString(), useCount: 0 },
    };
    withSave(set, get, {
      boards: boards.map((board) =>
        board.id === toBoardId
          ? { ...board, items: [...board.items, copied] }
          : board,
      ),
    });
  },

  recordUse: (payload) => {
    const now = new Date().toISOString();
    const recent = [
      { payload, usedAt: now },
      ...get().recent.filter((entry) => entry.payload !== payload),
    ].slice(0, MAX_RECENT);
    const boards = get().boards.map((board) => ({
      ...board,
      items: board.items.map((item) =>
        item.payload === payload
          ? {
              ...item,
              usage: {
                ...item.usage,
                lastUsedAt: now,
                useCount: item.usage.useCount + 1,
              },
            }
          : item,
      ),
    }));
    withSave(set, get, { recent, boards });
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    withSave(set, get, { settings });
    if (partial.globalShortcut !== undefined) {
      invoke("set_global_shortcut", {
        shortcut: settings.globalShortcut,
      }).catch((error) => {
        console.error("EmoShelf: shortcut register failed", error);
      });
    }
  },

  completeOnboarding: () => {
    withSave(set, get, { onboardingCompleted: true });
  },

  resetAll: () => {
    const initial = createInitialState();
    withSave(set, get, { ...initial });
    invoke("set_global_shortcut", {
      shortcut: initial.settings.globalShortcut,
    }).catch((error) => {
      console.error("EmoShelf: shortcut register failed", error);
    });
  },
}));
