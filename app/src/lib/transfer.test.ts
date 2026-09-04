import { describe, expect, it } from "vitest";
import { type AppState, createInitialState } from "./state";
import { mergeAppStates } from "./transfer";

function idFactory(): () => string {
  let next = 0;
  return () => `new-${++next}`;
}

describe("mergeAppStates", () => {
  it("reassigns imported board and item IDs while retaining local settings", () => {
    const current = createInitialState();
    current.settings.theme = "dark";
    current.boards = [{ id: "local", name: "Local", order: 0, items: [] }];
    const incoming: AppState = {
      ...createInitialState(),
      onboardingCompleted: true,
      boards: [
        {
          id: "foreign-board",
          name: "Imported",
          order: 0,
          items: [
            {
              id: "foreign-item",
              type: "sequence",
              payload: "😭🙏",
              display: { name: "Please", keywords: [] },
              usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
            },
          ],
        },
      ],
      settings: { ...createInitialState().settings, theme: "light" },
    };

    const merged = mergeAppStates(current, incoming, idFactory());

    expect(merged.settings.theme).toBe("dark");
    expect(merged.boards).toHaveLength(2);
    expect(merged.boards[1]).toMatchObject({
      id: "new-1",
      name: "Imported",
      order: 1,
    });
    expect(merged.boards[1]?.items[0]).toMatchObject({
      id: "new-2",
      type: "sequence",
      payload: "😭🙏",
    });
    expect(merged.onboardingCompleted).toBe(true);
  });

  it("deduplicates custom assets by hash and remaps image references", () => {
    const current = createInitialState();
    current.customAssets.local = {
      id: "local",
      fileName: "local.png",
      mediaType: "image/png",
      width: 32,
      height: 32,
      byteLength: 10,
      sha256: "same-hash",
      addedAt: "2026-01-01T00:00:00Z",
    };
    const incoming = createInitialState();
    incoming.customAssets.foreign = {
      ...current.customAssets.local,
      id: "foreign",
      fileName: "foreign.png",
    };
    incoming.boards = [
      {
        id: "foreign-board",
        name: "Images",
        order: 0,
        items: [
          {
            id: "foreign-item",
            type: "image",
            assetId: "foreign",
            display: { name: "Image", keywords: [] },
            usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
          },
        ],
      },
    ];

    const merged = mergeAppStates(current, incoming, idFactory());

    expect(Object.keys(merged.customAssets)).toEqual(["local"]);
    expect(merged.boards[0]?.items[0]).toMatchObject({ assetId: "local" });
  });
});
