import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createInitialState } from "./lib/state";
import { useShelfStore } from "./lib/store";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("EmoShelf UI", () => {
  beforeEach(() => {
    const initial = createInitialState();
    useShelfStore.setState({
      ...initial,
      settings: { ...initial.settings, locale: "ja" },
      loaded: true,
      persistenceBlocked: false,
      loadError: undefined,
      saveError: undefined,
    });
  });

  it("teaches the Shelf concept before showing the catalog", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "絵文字を、あなたの棚へ。" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "はじめる" }));
    expect(
      screen.getByRole("heading", { name: "最初の絵文字を選ぶ" }),
    ).toBeInTheDocument();
  });

  it("has no serious accessibility violations on the welcome screen", async () => {
    const { container } = render(<App />);
    const result = await axe.run(container, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(
      result.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });

  it("shows the personal Shelf after onboarding", () => {
    const initial = createInitialState();
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        { id: "my-shelf", name: "My Shelf", icon: "✨", order: 0, items: [] },
      ],
      settings: {
        ...initial.settings,
        defaultBoardId: "my-shelf",
        locale: "ja",
      },
    });
    render(<App />);
    expect(
      screen.getByRole("button", { name: /My Shelf/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "まだ何も置かれていません" }),
    ).toBeInTheDocument();
  });
});
