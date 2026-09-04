import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

export interface AvailableUpdate {
  version: string;
  body?: string;
  date?: string;
}

let pendingUpdate: Update | null = null;

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const { check } = await import("@tauri-apps/plugin-updater");
  pendingUpdate = await check();
  if (!pendingUpdate) {
    return null;
  }
  return {
    version: pendingUpdate.version,
    body: pendingUpdate.body,
    date: pendingUpdate.date,
  };
}

export async function installAvailableUpdate(
  onEvent?: (event: DownloadEvent) => void,
): Promise<void> {
  if (!pendingUpdate) {
    throw new Error("No verified update is ready to install");
  }
  await pendingUpdate.downloadAndInstall(onEvent);
}
