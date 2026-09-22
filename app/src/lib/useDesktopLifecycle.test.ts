import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useShelfStore } from "./store";
import { useDesktopLifecycle } from "./useDesktopLifecycle";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("./store", () => ({ useShelfStore: { getState: vi.fn() } }));
const handlers = new Map<string, (event: { payload: unknown }) => void>();
const persist = vi.fn();
const fixture = document.createElement("div");
beforeEach(() => {
  fixture.replaceChildren();
  document.body.append(fixture);
  handlers.clear();
  vi.mocked(invoke).mockReset().mockResolvedValue(undefined);
  persist.mockReset().mockResolvedValue(undefined);
  vi.mocked(useShelfStore.getState).mockReturnValue({
    loaded: true,
    persistenceBlocked: false,
    persistNow: persist,
  } as unknown as ReturnType<typeof useShelfStore.getState>);
  vi.mocked(listen).mockImplementation(async (event, handler) => {
    handlers.set(
      event as string,
      handler as (event: { payload: unknown }) => void,
    );
    return () => {
      handlers.delete(event as string);
    };
  });
});
afterEach(() => {
  fixture.remove();
  vi.restoreAllMocks();
});
async function requestReveal() {
  await waitFor(() => expect(handlers.has("shelf-revealed")).toBe(true));
  act(() => handlers.get("shelf-revealed")?.({ payload: 7 }));
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("acknowledge_reveal", { id: 7 }),
  );
}
it("returns keyboard focus from window controls to the selected emoji on reveal", async () => {
  fixture.innerHTML =
    '<button id="minimize">Minimize</button><button data-shelf-item-id="fire" class="is-selected">Fire</button>';
  fixture.querySelector<HTMLButtonElement>("#minimize")?.focus();
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestReveal();
  expect(document.activeElement).toBe(
    fixture.querySelector("[data-shelf-item-id]"),
  );
});
it("starts in search when nothing is selected", async () => {
  fixture.innerHTML =
    '<button id="minimize">Minimize</button><input type="search" />';
  fixture.querySelector<HTMLButtonElement>("#minimize")?.focus();
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestReveal();
  expect(document.activeElement).toBe(fixture.querySelector("input"));
});
it("keeps a populated shelf open instead of focusing search and opening the catalog", async () => {
  fixture.innerHTML =
    '<button id="minimize">Minimize</button><button data-shelf-item-id="first">First</button><input type="search" />';
  fixture.querySelector<HTMLButtonElement>("#minimize")?.focus();
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestReveal();
  expect(document.activeElement).toBe(
    fixture.querySelector("[data-shelf-item-id]"),
  );
});
it("does not interrupt an open dialog or steal focus back after Pinned insertion", async () => {
  fixture.innerHTML =
    '<dialog open><button id="dialog-control">Settings</button></dialog><button data-shelf-item-id="fire" class="is-selected">Fire</button>';
  const control = fixture.querySelector<HTMLButtonElement>("#dialog-control");
  control?.focus();
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestReveal();
  expect(document.activeElement).toBe(control);
  fixture.querySelector("dialog")?.removeAttribute("open");
  vi.mocked(invoke).mockClear();
  vi.spyOn(document, "hasFocus").mockReturnValue(false);
  await requestReveal();
  expect(document.activeElement).toBe(control);
});
async function requestQuit() {
  await waitFor(() => expect(handlers.has("request-quit")).toBe(true));
  act(() => handlers.get("request-quit")?.({ payload: null }));
}
it("waits for durable saving and coalesces repeated Quit requests", async () => {
  let finish!: () => void;
  persist.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestQuit();
  await requestQuit();
  expect(persist).toHaveBeenCalledTimes(1);
  expect(invoke).not.toHaveBeenCalledWith("quit_after_save");
  finish();
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("quit_after_save"));
});
it("keeps the app open and exposes recovery when saving fails, then permits retry", async () => {
  const onError = vi.fn();
  persist.mockRejectedValueOnce(new Error("disk full"));
  renderHook(() => useDesktopLifecycle(onError));
  await requestQuit();
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("show_recovery_window"),
  );
  expect(onError).toHaveBeenCalled();
  expect(invoke).not.toHaveBeenCalledWith("quit_after_save");
  await requestQuit();
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("quit_after_save"));
});
it("never overwrites a future-schema state when quitting in read-only mode", async () => {
  vi.mocked(useShelfStore.getState).mockReturnValue({
    loaded: true,
    persistenceBlocked: true,
    persistNow: persist,
  } as unknown as ReturnType<typeof useShelfStore.getState>);
  renderHook(() => useDesktopLifecycle(vi.fn()));
  await requestQuit();
  expect(persist).not.toHaveBeenCalled();
  expect(invoke).toHaveBeenCalledWith("quit_after_save");
});
