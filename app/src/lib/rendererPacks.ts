import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { RendererId } from "./state";

export type PackRendererId = Exclude<RendererId, "twemoji" | "native">;

export interface RendererPackRecord {
  rendererId: PackRendererId;
  version: string;
  displayName: string;
  enabled: boolean;
  attribution: string;
  licenseName: string;
  licenseText: string;
  assetCount: number;
  keyId: string;
  installedAt: string;
}

const rendererAssetCache = new Map<string, string>();

export async function listRendererPacks(): Promise<RendererPackRecord[]> {
  const packs = await invoke<RendererPackRecord[]>("list_renderer_packs");
  return Array.isArray(packs) ? packs : [];
}

export async function pickAndInstallRendererPack(): Promise<RendererPackRecord | null> {
  const path = await open({
    title: "Install EmoShelf Renderer Pack",
    multiple: false,
    directory: false,
    filters: [{ name: "EmoShelf Renderer", extensions: ["emoshelf-renderer"] }],
  });
  if (!path) {
    return null;
  }
  const pack = await invoke<RendererPackRecord>("install_renderer_pack", {
    path,
  });
  clearRendererAssetCache(pack.rendererId);
  return pack;
}

export async function setRendererPackEnabled(
  rendererId: PackRendererId,
  enabled: boolean,
): Promise<void> {
  await invoke("set_renderer_pack_enabled", { rendererId, enabled });
  clearRendererAssetCache(rendererId);
}

export async function removeRendererPack(
  rendererId: PackRendererId,
): Promise<boolean> {
  const removed = await invoke<boolean>("remove_renderer_pack", { rendererId });
  clearRendererAssetCache(rendererId);
  return removed;
}

export async function rendererAssetDataUrl(
  rendererId: PackRendererId,
  hexcode: string,
): Promise<string> {
  const key = `${rendererId}:${hexcode.toLowerCase()}`;
  const cached = rendererAssetCache.get(key);
  if (cached) {
    return cached;
  }
  const dataBase64 = await invoke<string>("read_renderer_asset", {
    rendererId,
    hexcode: hexcode.toLowerCase(),
  });
  const source = `data:image/svg+xml;base64,${dataBase64}`;
  rendererAssetCache.set(key, source);
  return source;
}

export function clearRendererAssetCache(rendererId?: PackRendererId): void {
  if (!rendererId) {
    rendererAssetCache.clear();
    return;
  }
  for (const key of rendererAssetCache.keys()) {
    if (key.startsWith(`${rendererId}:`)) {
      rendererAssetCache.delete(key);
    }
  }
}
