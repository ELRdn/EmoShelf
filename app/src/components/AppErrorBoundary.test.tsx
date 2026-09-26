import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShelfStore } from "../lib/store";
import { AppErrorBoundary, StartupRecovery } from "./AppErrorBoundary";

describe("startup recovery", () => {
  beforeEach(() => {
    useShelfStore.setState((state) => ({
      settings: { ...state.settings, locale: "en" },
    }));
  });

  it("keeps the saved shelf intact when a child cannot render", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = useShelfStore.getState().boards;
    function BrokenShelf(): never {
      throw new Error("test rendering failure");
    }
    render(
      <AppErrorBoundary>
        <BrokenShelf />
      </AppErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", { name: "We couldn't display your shelf" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Reload the app" }),
    ).toBeVisible();
    expect(useShelfStore.getState().boards).toBe(before);
    expect(
      screen.queryByText("test rendering failure"),
    ).not.toBeInTheDocument();
  });

  it("explains the required desktop context in Japanese instead of rendering a blank page", () => {
    useShelfStore.setState((state) => ({
      settings: { ...state.settings, locale: "ja" },
    }));
    render(<StartupRecovery desktopRequired />);
    expect(
      screen.getByRole("heading", { name: "EmoShelfアプリから開いてください" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "体験デモを開く" }),
    ).toHaveAttribute("href", "https://elrdn.github.io/EmoShelf/");
  });
});
