import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  type AppState,
  type Board,
  type CustomAsset,
  parseAppState,
  type RecentEntry,
  type ShelfItem,
  STATE_SCHEMA_VERSION,
} from "./state";

export type ImportMode = "merge" | "replace";

export interface EmoShelfManifest {
  format: "emoshelf";
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
}

interface NativeImportPreview {
  manifest: EmoShelfManifest;
  stateJson: string;
  boardCount: number;
  itemCount: number;
  assetCount: number;
}

export interface ImportPreview extends NativeImportPreview {
  path: string;
  state: AppState;
}

function remapRecent(
  recent: RecentEntry,
  assetIds: ReadonlyMap<string, string>,
): RecentEntry | null {
  if (recent.type !== "image") {
    return { ...recent };
  }
  if (!recent.assetId) {
    return null;
  }
  const assetId = assetIds.get(recent.assetId);
  return assetId ? { ...recent, id: `image:${assetId}`, assetId } : null;
}

function recentKey(entry: RecentEntry): string {
  return entry.type === "image"
    ? `image:${entry.assetId ?? ""}`
    : `${entry.type}:${entry.payload ?? ""}`;
}

/**
 * Merge imports user content while retaining local preferences. Every imported
 * Board/item ID is reassigned, and assets are deduplicated by SHA-256.
 */
export function mergeAppStates(
  current: AppState,
  incoming: AppState,
  createId: () => string = () => crypto.randomUUID(),
): AppState {
  const customAssets: Record<string, CustomAsset> = {
    ...current.customAssets,
  };
  const assetIds = new Map<string, string>();
  const existingByHash = new Map(
    Object.values(customAssets).map((asset) => [asset.sha256, asset.id]),
  );

  for (const asset of Object.values(incoming.customAssets)) {
    const existingId = existingByHash.get(asset.sha256);
    const nextId = existingId ?? asset.sha256;
    assetIds.set(asset.id, nextId);
    if (!existingId) {
      customAssets[nextId] = { ...asset, id: nextId };
      existingByHash.set(asset.sha256, nextId);
    }
  }

  const boardIds = new Map<string, string>();
  const importedBoards: Board[] = incoming.boards.map((board, offset) => {
    const id = createId();
    boardIds.set(board.id, id);
    const items = board.items.flatMap((item): ShelfItem[] => {
      if (item.type !== "image") {
        return [{ ...item, id: createId() }];
      }
      const assetId = assetIds.get(item.assetId);
      return assetId ? [{ ...item, id: createId(), assetId }] : [];
    });
    return {
      ...board,
      id,
      order: current.boards.length + offset,
      items,
    };
  });

  const importedRecents = incoming.recent.flatMap((entry) => {
    const remapped = remapRecent(entry, assetIds);
    return remapped ? [remapped] : [];
  });
  const seenRecents = new Set<string>();
  const recent = [...importedRecents, ...current.recent]
    .filter((entry) => {
      const key = recentKey(entry);
      if (seenRecents.has(key)) {
        return false;
      }
      seenRecents.add(key);
      return true;
    })
    .slice(0, 30);

  const importedMappings = Object.fromEntries(
    Object.entries(incoming.appBoardMappings).flatMap(
      ([application, boardId]) => {
        const remapped = boardIds.get(boardId);
        return remapped ? [[application, remapped]] : [];
      },
    ),
  );

  return {
    ...current,
    schemaVersion: STATE_SCHEMA_VERSION,
    boards: [...current.boards, ...importedBoards],
    recent,
    appBoardMappings: {
      ...importedMappings,
      ...current.appBoardMappings,
    },
    customAssets,
    onboardingCompleted:
      current.onboardingCompleted || incoming.onboardingCompleted,
  };
}

export async function exportEmoShelf(state: AppState): Promise<string | null> {
  const path = await save({
    title: "Export EmoShelf",
    defaultPath: `emoshelf-${new Date().toISOString().slice(0, 10)}.emoshelf`,
    filters: [{ name: "EmoShelf", extensions: ["emoshelf"] }],
  });
  if (!path) {
    return null;
  }
  await invoke("export_emoshelf", {
    path,
    stateJson: JSON.stringify(state),
    exportedAt: new Date().toISOString(),
  });
  return path;
}

export async function openEmoShelfPreview(): Promise<ImportPreview | null> {
  const path = await open({
    title: "Import EmoShelf",
    multiple: false,
    directory: false,
    filters: [{ name: "EmoShelf", extensions: ["emoshelf"] }],
  });
  if (!path) {
    return null;
  }
  const preview = await invoke<NativeImportPreview>("preview_emoshelf", {
    path,
  });
  const state = parseAppState(JSON.parse(preview.stateJson) as unknown);
  return { ...preview, path, state };
}

export async function installEmoShelfAssets(path: string): Promise<void> {
  await invoke("install_emoshelf_assets", { path });
}
