import { describe, expect, it } from "vitest";
import { findByEmoji, getCatalog, getCategories, searchCatalog } from "./emoji";

describe("emoji catalog", () => {
  it("loads the complete English and Japanese catalogs", () => {
    expect(getCatalog("en")).toHaveLength(1949);
    expect(getCatalog("ja")).toHaveLength(1949);
    expect(getCategories("ja")).toHaveLength(12);
  });

  it("searches English labels and Japanese labels from either locale", () => {
    expect(
      searchCatalog("crying", 20, "en").some((entry) => entry.emoji === "😭"),
    ).toBe(true);
    expect(
      searchCatalog("泣き", 20, "ja").some((entry) => entry.emoji === "😭"),
    ).toBe(true);
    expect(
      searchCatalog("泣き", 20, "en").some((entry) => entry.emoji === "😭"),
    ).toBe(true);
  });

  it("keeps copied Unicode independent from the visual renderer", () => {
    const entry = findByEmoji("😂", "ja");
    expect(entry?.emoji).toBe("😂");
    expect(entry?.hexcode).toBe("1f602");
  });

  it("keeps 1949-item search comfortably below the 100 ms interaction budget", () => {
    const durations = Array.from({ length: 40 }, (_, index) => {
      const started = performance.now();
      searchCatalog(index % 2 === 0 ? "face" : "顔", 1949, "ja");
      return performance.now() - started;
    }).sort((left, right) => left - right);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1] ?? Infinity;
    expect(p95).toBeLessThan(100);
  });
});
