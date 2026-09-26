import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as emojiCatalog from "./lib/emoji";
import { getCatalog, getCategories } from "./lib/emoji";
import { createInitialState } from "./lib/state";
import { useShelfStore } from "./lib/store";

const { hideWindow } = vi.hoisted(() => ({
  hideWindow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
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
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: hideWindow,
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("EmoShelf UI", () => {
  beforeEach(() => {
    hideWindow.mockClear();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command) =>
      command === "paste_payload" || command === "paste_image_asset"
        ? { status: "input-sent", reason: null }
        : null,
    );
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

  it("offers an actionable manual update when automatic updates are not configured", async () => {
    useShelfStore.setState({ onboardingCompleted: true });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "設定" }));
    const releases = screen.getByRole("button", {
      name: "公式配布ページを開く",
    });
    expect(releases).toBeEnabled();
    await user.click(releases);
    expect(openUrl).toHaveBeenCalledWith(
      "https://github.com/ELRdn/EmoShelf/releases",
    );
  });

  it("recovers from a catalog loading failure without changing the saved shelf", async () => {
    vi.spyOn(emojiCatalog, "isEmojiCatalogLoaded").mockReturnValue(false);
    const loader = vi
      .spyOn(emojiCatalog, "loadEmojiCatalogData")
      .mockRejectedValueOnce(new Error("temporary catalog failure"))
      .mockResolvedValueOnce(undefined);
    const before = useShelfStore.getState().boards;
    render(<App />);
    const retry = await screen.findByRole("button", {
      name: "読み込みを再試行",
    });
    expect(
      screen.queryByText("temporary catalog failure"),
    ).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(
      await screen.findByRole("heading", { name: "絵文字を、あなたの棚へ。" }),
    ).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(useShelfStore.getState().boards).toBe(before);
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

  it("traps modal focus, restores it on Escape, and passes axe", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [{ id: "shelf", name: "Shelf", order: 0, items: [] }],
      settings: { ...initial.settings, locale: "ja" },
    });
    const { container } = render(<App />);
    const settingsButton = screen.getByRole("button", { name: "設定" });

    await user.click(settingsButton);
    const dialog = screen.getByRole("dialog", { name: "設定" });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Close \/ 閉じる: 設定/ }),
    ).toHaveFocus();
    const result = await axe.run(container, {
      runOnly: ["wcag2a", "wcag2aa"],
    });
    expect(
      result.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "設定" })).toBeNull();
    expect(settingsButton).toHaveFocus();
    expect(hideWindow).not.toHaveBeenCalled();
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

  it("selects a focused shelf tile without pasting, then Enter inserts that tile", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        {
          id: "shelf",
          name: "Shelf",
          order: 0,
          items: [
            {
              id: "fire",
              type: "unicode",
              payload: "🔥",
              display: { name: "Fire", keywords: [] },
              usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
            },
          ],
        },
      ],
      settings: { ...initial.settings, locale: "ja" },
    });
    render(<App />);
    const tile = screen.getByRole("button", { name: "Fire" });
    act(() => tile.focus());
    expect(tile).toHaveClass("is-selected");
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(invoke).toHaveBeenCalledWith("paste_payload", {
      payload: "🔥",
      keepOpen: true,
    });
    expect(screen.queryByRole("tablist", { name: /カテゴリ/ })).toBeNull();
  });

  it("shows only locally tracked items in the Frequent view", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    const item = (id: string, payload: string, useCount: number) => ({
      id,
      type: "unicode" as const,
      payload,
      display: { name: payload, keywords: [] },
      usage: { addedAt: "2026-01-01T00:00:00Z", useCount },
    });
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        {
          id: "shelf",
          name: "Shelf",
          order: 0,
          items: [item("used", "😂", 5), item("unused", "🫥", 0)],
        },
      ],
      settings: { ...initial.settings, locale: "ja" },
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /よく使う/ }));

    expect(screen.getByRole("button", { name: "😂" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "🫥" })).toBeNull();
  });

  it("switches to the locally mapped Board for the foreground executable", async () => {
    const initial = createInitialState();
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "get_foreground_context") {
        return { executable: "code.exe", monitor: "DISPLAY2" };
      }
      if (command === "get_autostart") {
        return false;
      }
      return null;
    });
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [
        { id: "default", name: "Default", order: 0, items: [] },
        { id: "dev", name: "Dev", order: 1, items: [] },
      ],
      appBoardMappings: { "code.exe": "dev" },
      settings: {
        ...initial.settings,
        locale: "ja",
        defaultBoardId: "default",
        perAppBoardsEnabled: true,
      },
    });
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Dev/ })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    );
    expect(invoke).toHaveBeenCalledWith("set_context_preferences", {
      perAppBoardsEnabled: true,
      popupPositionBehavior: "active-monitor",
    });
  });

  it("adds a content-addressed custom image from the local library to a Board", async () => {
    const user = userEvent.setup();
    const initial = createInitialState();
    const id = "d".repeat(64);
    useShelfStore.setState({
      ...initial,
      loaded: true,
      onboardingCompleted: true,
      boards: [{ id: "images", name: "Images", order: 0, items: [] }],
      customAssets: {
        [id]: {
          id,
          fileName: `${id}.png`,
          mediaType: "image/png",
          width: 64,
          height: 64,
          byteLength: 256,
          sha256: id,
          addedAt: "2026-01-01T00:00:00Z",
        },
      },
      settings: { ...initial.settings, locale: "ja" },
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /画像/ }));
    await user.click(
      screen.getByRole("button", { name: "カスタム画像 64×64" }),
    );
    await user.click(screen.getByRole("button", { name: "詳細" }));
    await user.click(screen.getByRole("button", { name: /Shelfへ追加/ }));

    expect(useShelfStore.getState().boards[0]?.items[0]).toMatchObject({
      type: "image",
      assetId: id,
    });
  });
  function readyShelf() {
    useShelfStore.setState({
      onboardingCompleted: true,
      boards: [
        {
          id: "test",
          name: "Test",
          order: 0,
          items: [
            {
              id: "fire",
              type: "unicode",
              payload: "🔥",
              display: { name: "Test fire", keywords: [] },
              usage: { addedAt: "2026-01-01T00:00:00Z", useCount: 0 },
            },
          ],
        },
      ],
    });
  }
  it("explains unavailable emoji styles instead of presenting them as ready to use", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "設定" }));
    const renderer = screen.getByRole("combobox", { name: "絵文字の見た目" });
    expect(
      within(renderer).getByRole("option", { name: "Twemoji" }),
    ).toBeEnabled();
    expect(
      within(renderer).getByRole("option", { name: /Native \/ System/ }),
    ).toBeEnabled();
    for (const name of ["Fluent Emoji", "Noto Emoji", "OpenMoji"]) {
      expect(
        within(renderer).getByRole("option", {
          name: `${name} — パック未導入`,
        }),
      ).toBeDisabled();
    }
    expect(
      screen.getByText(/貼り付け先では、そのアプリの絵文字/),
    ).toBeVisible();
  });
  it("allows an installed enabled style while identifying disabled packs", async () => {
    readyShelf();
    vi.mocked(invoke).mockImplementation(async (command) =>
      command === "list_renderer_packs"
        ? [
            {
              rendererId: "fluent",
              enabled: true,
              displayName: "Fluent Emoji",
              version: "1.0.0",
              assetCount: 1500,
            },
            {
              rendererId: "noto",
              enabled: false,
              displayName: "Noto Emoji",
              version: "1.0.0",
              assetCount: 1500,
            },
          ]
        : null,
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "設定" }));
    const renderer = screen.getByRole("combobox", { name: "絵文字の見た目" });
    expect(
      within(renderer).getByRole("option", {
        name: "Fluent Emoji",
      }),
    ).toBeEnabled();
    expect(
      within(renderer).getByRole("option", { name: "Noto Emoji — 無効" }),
    ).toBeDisabled();
    await user.selectOptions(renderer, "fluent");
    expect(useShelfStore.getState().settings.renderer).toBe("fluent");
  });
  it("opens the permanent leftmost All view by keyboard and preserves personal shelves", async () => {
    readyShelf();
    const user = userEvent.setup();
    const savedBoards = useShelfStore.getState().boards;
    const savedSettings = useShelfStore.getState().settings;
    render(<App />);
    const boards = screen.getByRole("navigation", { name: "Boards" });
    const all = within(boards).getByRole("button", { name: "All" });
    const shelf = within(boards).getByRole("button", { name: /Test/ });
    expect(within(boards).getAllByRole("button")[0]).toBe(all);
    expect(shelf).toHaveAttribute("aria-current", "page");

    act(() => all.focus());
    await user.keyboard("{Enter}");
    expect(screen.getByRole("region", { name: "絵文字一覧" })).toBeVisible();
    expect(all).toHaveAttribute("aria-current", "page");
    expect(shelf).not.toHaveAttribute("aria-current");
    expect(boards.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Shelfを編集" })).toBeDisabled();
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());

    await user.keyboard("{Control>}1{/Control}");
    expect(shelf).toHaveAttribute("aria-current", "page");
    expect(all).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Test fire" })).toBeVisible();
    expect(useShelfStore.getState().boards).toEqual(savedBoards);
    expect(useShelfStore.getState().settings).toEqual(savedSettings);
  });
  it("returns to all emoji from search, category filters, and other shelf modes", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    const boards = screen.getByRole("navigation", { name: "Boards" });
    const all = within(boards).getByRole("button", { name: "All" });
    const search = screen.getByPlaceholderText("絵文字を検索…");
    await user.click(screen.getByRole("button", { name: "Shelfを編集" }));
    await user.click(screen.getByRole("button", { name: "操作" }));
    await user.click(all);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("button", { name: "編集を終了" })).toBeNull();
    const category = getCategories("ja").find(
      (entry) => typeof entry.id === "number",
    );
    if (!category) throw new Error("Expected an emoji group");
    await user.click(
      within(screen.getByRole("navigation", { name: "カテゴリ" })).getByRole(
        "button",
        { name: category.label },
      ),
    );
    await user.type(search, "rocket");
    expect(all).toHaveAttribute("aria-current", "page");
    await user.click(all);
    expect(search).toHaveValue("");
    expect(document.querySelector(".panel-label")).toHaveTextContent(
      `${getCatalog("ja").length} 件`,
    );
    const categories = screen.getByRole("navigation", { name: "カテゴリ" });
    expect(within(categories).getAllByRole("button")[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const name of [/よく使う/, /^▧ 画像/]) {
      await user.click(screen.getByRole("button", { name }));
      expect(all).not.toHaveAttribute("aria-current");
      expect(boards.querySelector('[aria-current="page"]')).toBeNull();
      await user.click(all);
      expect(screen.getByRole("region", { name: "絵文字一覧" })).toBeVisible();
      expect(all).toHaveAttribute("aria-current", "page");
    }
    await user.click(within(boards).getByRole("button", { name: /Test/ }));
    expect(screen.getByRole("button", { name: "Test fire" })).toBeVisible();
  });
  it("keeps details optional and allows safe inspection without insertion", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelector(".detail-panel")).toBeNull();
    await user.click(screen.getByRole("button", { name: "詳細" }));
    await user.click(screen.getByRole("button", { name: "Test fire" }));
    expect(document.querySelector(".detail-panel")).toHaveTextContent("火");
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });
  it("shows persistent recovery instructions when native input cannot be delivered", async () => {
    readyShelf();
    vi.mocked(invoke).mockImplementation(async (command) =>
      command === "paste_payload"
        ? { status: "copied", reason: "focus-denied" }
        : null,
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Test fire" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ctrl+V");
  });
  it("does not execute IME confirmation or key repeats as paste", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByPlaceholderText("絵文字を検索…");
    await user.type(search, "rocket");
    fireEvent.keyDown(search, {
      key: "Enter",
      isComposing: true,
      keyCode: 229,
    });
    fireEvent.keyDown(search, { key: "Enter", repeat: true });
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("paste_payload", {
        payload: "🚀",
        keepOpen: false,
      }),
    );
  });
  it("coalesces clicks while an insertion is pending", async () => {
    readyShelf();
    let complete!: (value: unknown) => void;
    vi.mocked(invoke).mockImplementation((command) =>
      command === "paste_payload"
        ? new Promise((resolve) => {
            complete = resolve;
          })
        : Promise.resolve(null),
    );
    const user = userEvent.setup();
    render(<App />);
    const button = screen.getByRole("button", { name: "Test fire" });
    await user.click(button);
    await user.click(button);
    expect(
      vi
        .mocked(invoke)
        .mock.calls.filter(([command]) => command === "paste_payload"),
    ).toHaveLength(1);
    complete({ status: "input-sent", reason: null });
    await waitFor(() =>
      expect(useShelfStore.getState().boards[0].items[0].usage.useCount).toBe(
        1,
      ),
    );
  });
  it("adds a search result with Ctrl+Enter without inserting it", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByPlaceholderText("絵文字を検索…");
    await user.type(search, "rocket");
    fireEvent.keyDown(search, { key: "Enter", ctrlKey: true });
    expect(
      useShelfStore
        .getState()
        .boards[0].items.some(
          (item) => item.type !== "image" && item.payload === "🚀",
        ),
    ).toBe(true);
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });
  it("lets focused controls handle Enter without pasting the selected emoji", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole("button", { name: "Test fire" }).focus();
    const help = screen.getByRole("button", { name: "使い方" });
    help.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("練習用の入力欄")).toBeVisible();
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });
  it("does not paste a search result while editing the shelf", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Shelfを編集" }));
    const search = screen.getByPlaceholderText("絵文字を検索…");
    await user.type(search, "rocket");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });
  it("offers a local practice editor without calling the native clipboard", async () => {
    readyShelf();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "使い方" }));
    await user.click(screen.getByRole("button", { name: "😎" }));
    expect(screen.getByLabelText("練習用の入力欄")).toHaveValue("😎");
    expect(invoke).not.toHaveBeenCalledWith("paste_payload", expect.anything());
  });
});
