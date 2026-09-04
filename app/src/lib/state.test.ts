import { describe, expect, it } from "vitest";
import {
  createInitialState,
  FutureStateVersionError,
  parseAppState,
  STATE_SCHEMA_VERSION,
} from "./state";

describe("state schema", () => {
  it("creates the privacy-friendly v2 defaults", () => {
    const state = createInitialState();
    expect(state.schemaVersion).toBe(STATE_SCHEMA_VERSION);
    expect(state.settings.usageTrackingEnabled).toBe(true);
    expect(state.settings.shelfGlow).toBe(false);
    expect(state.settings.perAppBoardsEnabled).toBe(false);
    expect(state.settings.locale).toBe("system");
  });

  it("migrates schema v1 without losing boards, recents, settings, or extra fields", () => {
    const migrated = parseAppState({
      schemaVersion: 1,
      boards: [
        {
          id: "board-1",
          name: "My Shelf",
          order: 0,
          items: [
            {
              id: "item-1",
              type: "unicode",
              payload: "😭",
              display: { name: "crying", keywords: [] },
              usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 2 },
            },
          ],
        },
      ],
      recent: [{ payload: "😭", usedAt: "2026-01-02T00:00:00Z" }],
      settings: { theme: "dark", globalShortcut: "Alt+E" },
      onboardingCompleted: true,
      pluginOwnedValue: { enabled: true },
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.boards[0]?.items[0]).toMatchObject({ payload: "😭" });
    expect(migrated.recent[0]).toMatchObject({
      type: "unicode",
      payload: "😭",
    });
    expect(migrated.settings.theme).toBe("dark");
    expect(migrated.extensions.pluginOwnedValue).toEqual({ enabled: true });
  });

  it("refuses to open a future schema for writing", () => {
    expect(() => parseAppState({ schemaVersion: 99 })).toThrow(
      FutureStateVersionError,
    );
  });

  it("rejects malformed known fields", () => {
    expect(() =>
      parseAppState({ ...createInitialState(), boards: "invalid" }),
    ).toThrow();
  });

  it("preserves unknown fields inside supported schema objects", () => {
    const initial = createInitialState();
    const raw = {
      ...initial,
      settings: { ...initial.settings, futurePreference: "keep-me" },
      boards: [
        {
          id: "board",
          name: "Board",
          order: 0,
          items: [],
          futureBoardField: true,
        },
      ],
    };

    const parsed = parseAppState(raw);

    expect(parsed.settings).toHaveProperty("futurePreference", "keep-me");
    expect(parsed.boards[0]).toHaveProperty("futureBoardField", true);
  });

  it("accepts only content-addressed normalized custom assets", () => {
    const id = "a".repeat(64);
    const initial = createInitialState();
    initial.customAssets[id] = {
      id,
      fileName: `${id}.png`,
      mediaType: "image/png",
      width: 64,
      height: 64,
      byteLength: 120,
      sha256: id,
      addedAt: "2026-01-01T00:00:00Z",
    };

    expect(parseAppState(initial).customAssets[id]).toMatchObject({ id });
    expect(() =>
      parseAppState({
        ...initial,
        customAssets: {
          [id]: { ...initial.customAssets[id], fileName: "outside.png" },
        },
      }),
    ).toThrow();
  });

  it("rejects mismatched asset map keys and dangling image references", () => {
    const id = "b".repeat(64);
    const asset = {
      id,
      fileName: `${id}.png`,
      mediaType: "image/png" as const,
      width: 32,
      height: 32,
      byteLength: 99,
      sha256: id,
      addedAt: "2026-01-01T00:00:00Z",
    };
    expect(() =>
      parseAppState({
        ...createInitialState(),
        customAssets: { ["c".repeat(64)]: asset },
      }),
    ).toThrow();
    expect(() =>
      parseAppState({
        ...createInitialState(),
        boards: [
          {
            id: "board",
            name: "Images",
            order: 0,
            items: [
              {
                id: "image",
                type: "image",
                assetId: id,
                display: { name: "Missing", keywords: [] },
                usage: {
                  addedAt: "2026-01-01T00:00:00Z",
                  useCount: 0,
                },
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});
