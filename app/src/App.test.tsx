import { invoke } from "@tauri-apps/api/core";
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
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
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
    vi.mocked(invoke).mockClear();
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

  it("builds a multi-emoji composition without pasting each click", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        {
          id: "my-shelf",
          name: "My Shelf",
          order: 0,
          items: [
            {
              id: "joy",
              type: "unicode",
              payload: "😂",
              display: { name: "うれし泣き", keywords: [] },
              usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
            },
          ],
        },
      ],
      settings: { ...initial.settings, locale: "ja" },
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Compose/ }));
    await user.click(screen.getByRole("button", { name: "うれし泣き" }));

    expect(
      screen.getByRole("region", { name: "Compose Tray" }),
    ).toHaveTextContent("😂");
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });

  it("supports Ctrl+F, Board shortcuts, arrows, and Enter", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    const item = (id: string, payload: string) => ({
      id,
      type: "unicode" as const,
      payload,
      display: { name: payload, keywords: [] },
      usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
    });
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        { id: "one", name: "One", order: 0, items: [item("a", "😀")] },
        { id: "two", name: "Two", order: 1, items: [item("b", "🔥")] },
      ],
      settings: {
        ...initial.settings,
        locale: "ja",
        defaultBoardId: "one",
      },
    });
    render(<App />);

    await user.keyboard("{Control>}2{/Control}");
    expect(screen.getByRole("button", { name: /Two/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.keyboard("{ArrowRight}{Enter}");
    expect(invoke).toHaveBeenCalledWith("paste_payload", {
      payload: "🔥",
      keepOpen: false,
    });

    await user.keyboard("{Control>}f{/Control}");
    expect(screen.getByPlaceholderText("絵文字を検索…")).toHaveFocus();
  });
});
