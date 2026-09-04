import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppState, CustomAsset } from "./state";

interface NativeCustomAssetRecord {
  id: string;
  fileName: string;
  mediaType: "image/png";
  width: number;
  height: number;
  byteLength: number;
  sha256: string;
}

interface NativeCustomAssetData {
  id: string;
  mediaType: "image/png";
  dataBase64: string;
  width: number;
  height: number;
}

const dataUrlCache = new Map<string, string>();

export async function pickAndImportCustomAsset(): Promise<CustomAsset | null> {
  const path = await open({
    title: "Import custom image",
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: ["png", "webp", "svg"] }],
  });
  if (!path) {
    return null;
  }
  const record = await invoke<NativeCustomAssetRecord>("import_custom_asset", {
    path,
  });
  return { ...record, addedAt: new Date().toISOString() };
}

export async function customAssetDataUrl(assetId: string): Promise<string> {
  const cached = dataUrlCache.get(assetId);
  if (cached) {
    return cached;
  }
  const asset = await invoke<NativeCustomAssetData>("read_custom_asset", {
    assetId,
  });
  const source = `data:${asset.mediaType};base64,${asset.dataBase64}`;
  dataUrlCache.set(assetId, source);
  return source;
}

export async function copyCustomAsset(assetId: string): Promise<void> {
  await invoke("copy_image_asset", { assetId });
}

export async function pasteCustomAsset(
  assetId: string,
  keepOpen: boolean,
): Promise<void> {
  await invoke("paste_image_asset", { assetId, keepOpen });
}

export async function dragCustomAsset(assetId: string): Promise<void> {
  await invoke("drag_image_asset", { assetId });
}

export async function removeCustomAssetFile(
  assetId: string,
  state: AppState,
): Promise<boolean> {
  const removed = await invoke<boolean>("remove_custom_asset", {
    assetId,
    stateJson: JSON.stringify(state),
  });
  if (removed) {
    dataUrlCache.delete(assetId);
  }
  return removed;
}

export function clearCustomAssetCache(): void {
  dataUrlCache.clear();
}
