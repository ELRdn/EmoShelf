import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useShelfStore } from "./store";

function focusPicker(): void {
  // A delayed frame after Pinned insertion must not pull focus back. Keep open
  // dialogs and text/IME editing intact, but don't leave Enter on window controls.
  if (
    !document.hasFocus() ||
    document.querySelector("dialog[open], [aria-modal='true']") ||
    document.activeElement?.matches(
      "input, textarea, select, [contenteditable='true']",
    )
  )
    return;
  const selected = document.querySelector<HTMLElement>(
    "[data-shelf-item-id].is-selected, [data-catalog-index].is-selected, [data-asset-id].is-selected",
  );
  (
    selected ??
    document.querySelector<HTMLElement>("[data-shelf-item-id]") ??
    document.querySelector<HTMLInputElement>('input[type="search"]')
  )?.focus({ preventScroll: true });
}

export function useDesktopLifecycle(onError: (message: string) => void): void {
  useEffect(() => {
    let disposed = false;
    let quitting = false;
    const cleanup: (() => void)[] = [];
    const install = async () => {
      for (const [event, handler] of [
        [
          "shelf-revealed",
          (id: unknown) => {
            // Two animation frames include a rendering opportunity before acknowledging.
            requestAnimationFrame(() => {
              if (disposed) return;
              focusPicker();
              requestAnimationFrame(() => {
                if (!disposed)
                  void invoke("acknowledge_reveal", { id }).catch(
                    () => undefined,
                  );
              });
            });
          },
        ],
        [
          "request-quit",
          () => {
            if (quitting) return;
            quitting = true;
            void (async () => {
              try {
                const store = useShelfStore.getState();
                // Future/invalid files must be left untouched when exiting read-only mode.
                if (store.loaded && !store.persistenceBlocked)
                  await store.persistNow();
                await invoke("quit_after_save");
              } catch {
                quitting = false;
                onError(
                  "保存できなかったため終了を中止しました。再試行してください。 / Could not save. Please retry before quitting.",
                );
                await invoke("show_recovery_window").catch(() => undefined);
              }
            })();
          },
        ],
      ] as const) {
        const unlisten = await listen(event, (message) =>
          handler(message.payload),
        );
        if (disposed) unlisten();
        else cleanup.push(unlisten);
      }
    };
    void install().catch(() => {
      // Browser preview has no native event transport. Production failures are visible.
      if (!disposed && "__TAURI_INTERNALS__" in window)
        onError(
          "デスクトップ連携を開始できませんでした。アプリを再起動してください。 / Restart to restore desktop integration.",
        );
    });
    return () => {
      disposed = true;
      for (const unlisten of cleanup) unlisten();
    };
  }, [onError]);
}
