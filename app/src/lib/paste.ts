// ペースト実行の基盤。UI は持たない。
// 既定は Rust 側の paste_payload（クリップボード書き込み → 非表示 → Ctrl+V）。
// 失敗時は Copy only にフォールバックする。
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Settings } from "./state";

/** ペースト結果。呼び出し側（将来の Toast 等）が利用する。 */
export type PasteOutcome = "pasted" | "copied";

/**
 * ペイロードを送り出す。
 * - "copy-only" 設定なら最初からコピーのみ
 * - それ以外は Rust の paste_payload を試み、失敗したらコピーにフォールバック
 */
export async function pastePayload(
  payload: string,
  behavior: Settings["selectionBehavior"],
  keepOpen = false,
): Promise<PasteOutcome> {
  if (payload === "") {
    throw new Error("payload must not be empty");
  }
  if (behavior === "copy-only") {
    await writeText(payload);
    return "copied";
  }
  try {
    await invoke("paste_payload", { payload, keepOpen });
    return "pasted";
  } catch (error) {
    console.error("EmoShelf: paste failed, falling back to copy", error);
    await writeText(payload);
    return "copied";
  }
}
