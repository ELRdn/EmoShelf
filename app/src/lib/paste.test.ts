import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pasteCustomAsset } from "./customAssets";
import { parsePasteOutcome, pastePayload } from "./paste";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({ writeText: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(writeText).mockReset();
});
describe("insertion result contract", () => {
  it.each([
    null,
    undefined,
    {},
    { status: "pasted" },
    { status: "input-sent" },
  ])("rejects stale/malformed IPC responses: %s", (value) => {
    expect(parsePasteOutcome(value).status).toBe("failed");
  });
  it("keeps intentional copy separate from failed insertion", async () => {
    expect(await pastePayload("🔥", "copy-only")).toEqual({
      status: "copied",
      reason: "copy-only",
    });
    expect(invoke).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("🔥");
  });
  it.each([
    "no-target",
    "focus-denied",
    "focus-changed",
    "target-closed",
    "keys-held",
    "input-denied",
  ])(
    "preserves native copy fallback reason %s without retrying",
    async (reason) => {
      vi.mocked(invoke).mockResolvedValue({ status: "copied", reason });
      expect(await pastePayload("🔥", "paste-close")).toEqual({
        status: "copied",
        reason,
      });
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(writeText).not.toHaveBeenCalled();
    },
  );
  it("recovers IPC rejection with a visible copy fallback, never a second insertion", async () => {
    vi.mocked(invoke)
      .mockRejectedValueOnce(new Error("IPC failed"))
      .mockResolvedValueOnce(null);
    expect((await pastePayload("🔥", "paste-close")).status).toBe("copied");
    expect(invoke).toHaveBeenLastCalledWith("show_recovery_window");
    expect(writeText).toHaveBeenCalledTimes(1);
  });
  it("does not claim a successful copy if clipboard writing fails", async () => {
    vi.mocked(writeText).mockRejectedValue(new Error("locked"));
    expect((await pastePayload("🔥", "copy-only")).status).toBe("failed");
  });
  it("uses the same result contract for images and pinned insertion", async () => {
    vi.mocked(invoke).mockResolvedValue({ status: "input-sent", reason: null });
    expect(await pasteCustomAsset("a".repeat(64), true)).toEqual({
      status: "input-sent",
      reason: null,
    });
    expect(invoke).toHaveBeenCalledWith("paste_image_asset", {
      assetId: "a".repeat(64),
      keepOpen: true,
    });
  });
});
