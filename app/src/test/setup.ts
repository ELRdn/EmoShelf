import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import enData from "emojibase-data/en/data.json";
import enMessages from "emojibase-data/en/messages.json";
import enShortcodes from "emojibase-data/en/shortcodes/cldr.json";
import jaData from "emojibase-data/ja/data.json";
import jaMessages from "emojibase-data/ja/messages.json";
import { afterEach, vi } from "vitest";
import { loadEmojiCatalogData } from "../lib/emoji";

const catalogPayloads = new Map<string, unknown>([
  ["/emoji-data/en-data.json", enData],
  ["/emoji-data/ja-data.json", jaData],
  ["/emoji-data/en-messages.json", enMessages],
  ["/emoji-data/ja-messages.json", jaMessages],
  ["/emoji-data/en-shortcodes.json", enShortcodes],
]);

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: string | URL | Request) => {
    const key = typeof input === "string" ? input : input.toString();
    const payload = catalogPayloads.get(key);
    return {
      ok: payload !== undefined,
      status: payload === undefined ? 404 : 200,
      json: async () => payload,
    } as Response;
  }),
);

await loadEmojiCatalogData();

afterEach(cleanup);

class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: TestResizeObserver,
});

Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: {
    ...globalThis.crypto,
    randomUUID: () => "00000000-0000-4000-8000-000000000001",
  },
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => null),
});
