import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRendererAssetCache,
  pickAndInstallRendererPack,
  rendererAssetDataUrl,
  setRendererPackEnabled,
} from "./rendererPacks";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

const mockedInvoke = vi.mocked(invoke);
const mockedOpen = vi.mocked(open);

describe("renderer pack bridge", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedOpen.mockReset();
    clearRendererAssetCache();
  });

  it("installs only the file returned by the native picker", async () => {
    mockedOpen.mockResolvedValue("D:\\packs\\fluent.emoshelf-renderer");
    mockedInvoke.mockResolvedValue({ rendererId: "fluent" });

    await pickAndInstallRendererPack();

    expect(mockedInvoke).toHaveBeenCalledWith("install_renderer_pack", {
      path: "D:\\packs\\fluent.emoshelf-renderer",
    });
  });

  it("loads signed SVG data through the native verifier and caches it", async () => {
    mockedInvoke.mockResolvedValue("PHN2Zy8+");

    await expect(rendererAssetDataUrl("noto", "1F600")).resolves.toBe(
      "data:image/svg+xml;base64,PHN2Zy8+",
    );
    await rendererAssetDataUrl("noto", "1F600");

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke).toHaveBeenCalledWith("read_renderer_asset", {
      rendererId: "noto",
      hexcode: "1f600",
    });
  });

  it("changes pack availability in the native store", async () => {
    mockedInvoke.mockResolvedValue(undefined);

    await setRendererPackEnabled("openmoji", false);

    expect(mockedInvoke).toHaveBeenCalledWith("set_renderer_pack_enabled", {
      rendererId: "openmoji",
      enabled: false,
    });
  });
});
