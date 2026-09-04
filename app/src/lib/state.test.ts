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
});
