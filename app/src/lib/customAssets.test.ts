import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCustomAssetCache,
  customAssetDataUrl,
  pickAndImportCustomAsset,
  removeCustomAssetFile,
} from "./customAssets";
import { createInitialState } from "./state";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

const mockedInvoke = vi.mocked(invoke);
const mockedOpen = vi.mocked(open);

describe("custom asset bridge", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedOpen.mockReset();
    clearCustomAssetCache();
  });

  it("does nothing when the user cancels the native picker", async () => {
    mockedOpen.mockResolvedValue(null);

    await expect(pickAndImportCustomAsset()).resolves.toBeNull();
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("returns only normalized native metadata without retaining the source path", async () => {
    const id = "a".repeat(64);
    mockedOpen.mockResolvedValue("C:\\private\\original.svg");
    mockedInvoke.mockResolvedValue({
      id,
      fileName: `${id}.png`,
      mediaType: "image/png",
      width: 64,
      height: 64,
      byteLength: 200,
      sha256: id,
    });

    const asset = await pickAndImportCustomAsset();

    expect(mockedInvoke).toHaveBeenCalledWith("import_custom_asset", {
      path: "C:\\private\\original.svg",
    });
    expect(JSON.stringify(asset)).not.toContain("private");
    expect(asset).toMatchObject({ id, fileName: `${id}.png` });
  });

  it("loads and caches normalized PNG data", async () => {
    const id = "b".repeat(64);
    mockedInvoke.mockResolvedValue({
      id,
      mediaType: "image/png",
      dataBase64: "iVBORw0KGgo=",
      width: 1,
      height: 1,
    });

    await expect(customAssetDataUrl(id)).resolves.toBe(
      "data:image/png;base64,iVBORw0KGgo=",
    );
    await customAssetDataUrl(id);

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
  });

  it("passes the current state to reference-protected native deletion", async () => {
    const id = "c".repeat(64);
    mockedInvoke.mockResolvedValue(true);

    await expect(removeCustomAssetFile(id, createInitialState())).resolves.toBe(
      true,
    );
    expect(mockedInvoke).toHaveBeenCalledWith("remove_custom_asset", {
      assetId: id,
      stateJson: expect.stringContaining('"schemaVersion":2'),
    });
  });
});
