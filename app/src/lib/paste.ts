import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Settings } from "./state";

/** Windows accepted the keystrokes; editor insertion is verified separately. */
export interface PasteOutcome {
  status: "input-sent" | "copied" | "failed";
  reason: string | null;
}
export async function copyPayload(payload: string): Promise<void> {
  if (!payload) throw new Error("payload must not be empty");
  await writeText(payload);
}
export function parsePasteOutcome(value: unknown): PasteOutcome {
  if (
    value &&
    typeof value === "object" &&
    "status" in value &&
    ["input-sent", "copied", "failed"].includes(String(value.status)) &&
    "reason" in value &&
    (value.reason === null || typeof value.reason === "string")
  ) {
    return value as PasteOutcome;
  }
  return { status: "failed", reason: "invalid-native-response" };
}
export async function pastePayload(
  payload: string,
  behavior: Settings["selectionBehavior"],
  keepOpen = false,
): Promise<PasteOutcome> {
  if (!payload) return { status: "failed", reason: "empty-payload" };
  if (behavior === "copy-only") {
    try {
      await writeText(payload);
      return { status: "copied", reason: "copy-only" };
    } catch {
      return { status: "failed", reason: "clipboard-unavailable" };
    }
  }
  try {
    return parsePasteOutcome(
      await invoke("paste_payload", { payload, keepOpen }),
    );
  } catch {
    // Never retry an insertion after an uncertain IPC result.
    try {
      await writeText(payload);
      await invoke("show_recovery_window");
      return { status: "copied", reason: "native-unavailable" };
    } catch {
      return { status: "failed", reason: "native-unavailable" };
    }
  }
}
