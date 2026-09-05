import { check } from "@tauri-apps/plugin-updater";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForUpdate, installAvailableUpdate } from "./updates";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));

describe("signed updater consent boundary", () => {
  beforeEach(() => vi.mocked(check).mockReset());

  it("checks without downloading", async () => {
    const downloadAndInstall = vi.fn();
    vi.mocked(check).mockResolvedValue({
      version: "0.6.0",
      body: "Quality update",
      date: "2026-09-05T00:00:00Z",
      downloadAndInstall,
    } as never);

    await expect(checkForUpdate()).resolves.toMatchObject({ version: "0.6.0" });
    expect(downloadAndInstall).not.toHaveBeenCalled();
  });

  it("downloads only through the explicit install function", async () => {
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(check).mockResolvedValue({
      version: "0.6.0",
      downloadAndInstall,
    } as never);
    await checkForUpdate();

    await installAvailableUpdate();

    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
  });
});
